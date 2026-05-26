import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { request, history, useModel } from '@umijs/max';
import { Spin, message, Button, Modal, Input, Form, Space, Popconfirm, Tooltip } from 'antd';
import { SaveOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, ApartmentOutlined, DownloadOutlined, ExportOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块防止 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

/**
 * 要客清单页面 —— 通过 AG Grid Enterprise 展示并编辑 keycustomer 表
 * 支持：编辑字段值、增加列、删除列、修改字段名、统一保存
 */
const KeyCustomerList: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const isTristan = initialState?.currentUser?.email === 'tristan@tristan.wang';
  const gridRef = useRef<AgGridReact>(null);

  // --- 数据状态 ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  // 脏行追踪：存储被修改过的行的 _id
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  // 动态列定义
  const [dynamicColDefs, setDynamicColDefs] = useState<any[]>([]);
  // 添加列弹窗
  const [addColVisible, setAddColVisible] = useState(false);
  const [addColForm] = Form.useForm();
  // 重命名列弹窗
  const [renameColVisible, setRenameColVisible] = useState(false);
  const [renameColForm] = Form.useForm();
  const [renameTarget, setRenameTarget] = useState<string>('');
  // 全文搜索文本
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  // 「更新家族树」按钮的逐行加载状态，key 为该行的 _id
  const [familyTreeLoadingIds, setFamilyTreeLoadingIds] = useState<Set<string>>(new Set());
  // 「更新家族树」按钮的逐行分页进度，key 为 _id，value 为 { page, totalPages }
  const [familyTreeProgress, setFamilyTreeProgress] = useState<Record<string, { page: number; totalPages: number }>>({});
  // 「导出JSON」按钮的逐行加载状态，key 为该行的 _id
  const [exportingFtIds, setExportingFtIds] = useState<Set<string>>(new Set());

  // --- 「更新家族树」点击处理 ---
  // --- 「更新家族树」点击处理（使用 SSE 流式进度）---
  const handleSyncFamilyTree = useCallback(async (rowData: any) => {
    const { globalUltimateDuns, abbr, _id } = rowData;
    if (!globalUltimateDuns) {
      message.warning('该行缺少 globalUltimateDuns 字段，无法同步家族树');
      return;
    }
    if (!abbr) {
      message.warning('该行缺少 abbr 字段，无法生成集合名称');
      return;
    }
    const collectionName = `DNBFamilyTree-${abbr}-${globalUltimateDuns}`;

    // 标记加载中，初始化进度
    setFamilyTreeLoadingIds((prev) => { const s = new Set(prev); s.add(_id); return s; });
    setFamilyTreeProgress((prev) => ({ ...prev, [_id]: { page: 0, totalPages: 0 } }));

    try {
      // 从 localStorage 获取 JWT Token（和请求拦截器一致）
      const token = localStorage.getItem('token') || '';
      const queryObj: Record<string, string> = {
        globalUltimateDuns: String(globalUltimateDuns || ''),
        collectionName: String(collectionName || ''),
      };
      if (_id) {
        queryObj.keycustomerId = String(_id);
      }
      const params = new URLSearchParams(queryObj);

      const response = await fetch(`/api/v1/dnb/family-tree/sync-stream?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`接口返回异常: HTTP ${response.status}`);
      }

      // 读取 SSE 流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let doneData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 格式：每个事件以 \n\n 分隔
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // 最后一个可能不完整，保留

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice('data:'.length).trim());
            if (evt.type === 'progress') {
              // 实时更新按钮进度
              setFamilyTreeProgress((prev) => ({
                ...prev,
                [_id]: { page: evt.page, totalPages: evt.totalPages },
              }));
            } else if (evt.type === 'done') {
              doneData = evt;
            } else if (evt.type === 'error') {
              throw new Error(evt.message || '同步失败');
            }
          } catch (parseErr) {
            // 忽略无法解析的行
          }
        }
      }

      // 全部完成后展示成功通知
      if (doneData) {
        const { totalMembersCount = 0, totalPages = 1, membersCount = 0 } = doneData;
        message.success(
          `家族树同步成功！API 报告总成员数: ${totalMembersCount} 条，` +
          `共拉取 ${totalPages} 页，实际写入 ${membersCount} 条 → 集合: ${collectionName}`
        );
        // 仅更新当前行，不触发整表重渲染
        if (totalMembersCount > 0) {
          const rowNode = gridRef.current?.api?.getRowNode(String(_id));
          if (rowNode) {
            rowNode.setData({ ...rowNode.data, globalUltimateFamilyTreeMembersCount: totalMembersCount });
          }
        }
      }
    } catch (err: any) {
      message.error(`家族树同步失败: ${err?.message || '未知错误'}`);
    } finally {
      // 清除加载状态和进度
      setFamilyTreeLoadingIds((prev) => { const s = new Set(prev); s.delete(_id); return s; });
      setFamilyTreeProgress((prev) => { const p = { ...prev }; delete p[_id]; return p; });
    }
  }, []);

  // --- 逐行导出对应的家族树数据为 JSON ---
  const handleExportFtRow = useCallback(async (rowData: any) => {
    const { _id, abbr, globalUltimateDuns } = rowData;
    if (!abbr || !globalUltimateDuns) {
      message.warning('该行缺少 abbr 或 globalUltimateDuns，无法导出');
      return;
    }
    const collName = `DNBFamilyTree-${abbr}-${globalUltimateDuns}`;
    // 标记该行为导出中
    setExportingFtIds((prev) => { const s = new Set(prev); s.add(_id); return s; });
    try {
      const result = await request(`/api/v1/wildcards/${collName}`, { method: 'GET' });
      const records: any[] = result?.results || result?.data?.results || [];
      if (records.length === 0) {
        message.warning('家族树暂无数据，请先点击「更新家族树」同步数据');
        return;
      }
      // 去掉内部字段再导出
      const exportData = records.map(({ _id: rid, _syncedAt, ...rest }: any) => rest);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${exportData.length} 条家族树成员记录 → ${collName}.json`);
    } catch (err: any) {
      message.error(`导出失败: ${err?.message || '未知错误'}`);
    } finally {
      setExportingFtIds((prev) => { const s = new Set(prev); s.delete(_id); return s; });
    }
  }, []);

  // --- 批量加载家族树统计（并行，在 fetchData 后台执行）---
  const fetchFamilyTreeStats = useCallback(async (records: any[]) => {
    // 筛选有 abbr 和 globalUltimateDuns 的行
    const targets = records.filter((r: any) => r.abbr && r.globalUltimateDuns);
    if (targets.length === 0) return;

    // 并行查询每行对应集合的 count 和 最新 _syncedAt，以及境外分支数
    const results = await Promise.allSettled(
      targets.map(async (record: any) => {
        const collName = `DNBFamilyTree-${record.abbr}-${record.globalUltimateDuns}`;
        const webCollName = `DNBWebFamilyTree-${record.abbr}-${record.globalUltimateDuns}`;
        let ftCount = 0;
        let ftLastSync = null;
        let webFtCount = 0;
        let ftOverseasCount = 0;
        let webFtOverseasCount = 0;

        try {
          const res = await request(`/api/v1/wildcards/${collName}`, {
            method: 'GET',
            // limit=1 排序最新，totalResults 即总数
            params: { options: JSON.stringify({ limit: 1, sort: { _syncedAt: -1 } }) },
          });
          ftCount = res?.totalResults ?? 0;
          ftLastSync = res?.results?.[0]?._syncedAt ?? null;
        } catch (e) {
          // 集合不存在
        }

        try {
          const res = await request(`/api/v1/wildcards/${webCollName}`, {
            method: 'GET',
            params: { options: JSON.stringify({ limit: 1 }) },
          });
          webFtCount = res?.totalResults ?? 0;
        } catch (e) {
          // 集合不存在
        }

        try {
          const res = await request(`/api/v1/wildcards/${collName}`, {
            method: 'GET',
            params: {
              query: JSON.stringify({
                "primaryAddress.addressCountry.name": { "$ne": "China", "$nin": [null, ""] }
              }),
              options: JSON.stringify({ limit: 1 }),
            },
          });
          ftOverseasCount = res?.totalResults ?? 0;
        } catch (e) {
          // 集合不存在
        }

        try {
          const res = await request(`/api/v1/wildcards/${webCollName}`, {
            method: 'GET',
            params: {
              query: JSON.stringify({
                "fields.company_addresses_countryId_country_name": { "$ne": "China", "$nin": [null, ""] }
              }),
              options: JSON.stringify({ limit: 1 }),
            },
          });
          webFtOverseasCount = res?.totalResults ?? 0;
        } catch (e) {
          // 集合不存在
        }

        return {
          _id: String(record._id),
          _ftCount: ftCount,
          _ftLastSync: ftLastSync,
          _webFtCount: webFtCount,
          _ftOverseasCount: ftOverseasCount,
          _webFtOverseasCount: webFtOverseasCount,
        };
      })
    );

    // 构建统计 Map
    const statsMap = new Map<string, { _ftCount: number; _ftLastSync: any; _webFtCount: number; _ftOverseasCount: number; _webFtOverseasCount: number }>();
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) {
        statsMap.set(r.value._id, {
          _ftCount: r.value._ftCount,
          _ftLastSync: r.value._ftLastSync,
          _webFtCount: r.value._webFtCount,
          _ftOverseasCount: r.value._ftOverseasCount,
          _webFtOverseasCount: r.value._webFtOverseasCount,
        });
      }
    });

    // 用 AG Grid rowNode.setData() 逐行更新，不触发整表重渲染，防止页面跳顶
    statsMap.forEach((stats, rowId) => {
      const rowNode = gridRef.current?.api?.getRowNode(rowId);
      if (rowNode) {
        rowNode.setData({
          ...rowNode.data,
          _ftCount: stats._ftCount,
          _ftLastSync: stats._ftLastSync,
          _webFtCount: stats._webFtCount,
          _ftOverseasCount: stats._ftOverseasCount,
          _webFtOverseasCount: stats._webFtOverseasCount,
        });
      }
    });
    // 对于没有家族树集合的行，将其统计字段清零
    const targetIds = new Set(targets.map((r: any) => String(r._id)));
    gridRef.current?.api?.forEachNode((node: any) => {
      if (!node.data) return;
      const rowId = String(node.data._id);
      // 有 abbr+globalUltimateDuns 但不在 statsMap（请求失败并被过滤）的行，已在上面覆盖过
      // 没有 abbr 或 globalUltimateDuns 的行，如果还尚是 '__loading__' 则设为 null
      if (!targetIds.has(rowId) &&
          (node.data._ftCount === '__loading__' || node.data._ftLastSync === '__loading__' || node.data._webFtCount === '__loading__' || node.data._ftOverseasCount === '__loading__' || node.data._webFtOverseasCount === '__loading__')) {
        node.setData({ ...node.data, _ftCount: null, _ftLastSync: null, _webFtCount: null, _ftOverseasCount: null, _webFtOverseasCount: null });
      }
    });
  }, []);

  // --- 默认列配置（基于 keycustomer 表结构） ---
  const baseColumns = useMemo(() => [
    { headerName: '#', valueGetter: "node.rowIndex + 1", width: 60, minWidth: 40, pinned: 'left', filter: false, sortable: false, editable: false, suppressHeaderMenuButton: true, suppressHeaderFilterButton: true },
    { headerName: "PID", field: "PID", width: 200, editable: isTristan },
    { headerName: "GID", field: "GID", width: 200, editable: isTristan, hide: true },
    {
      // globalUltimateDuns 列：列名显示为 GU，渲染为可点击链接
      headerName: "GU",
      field: "globalUltimateDuns",
      width: 200,
      editable: isTristan,
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return '';
        // 传递 nameCn 和 abbr 给家族树页面
        const nameCn = encodeURIComponent(params.data?.nameCn || '');
        const abbr = encodeURIComponent(params.data?.abbr || '');
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => history.push(`/DNBFamilyTree/${val}?nameCn=${nameCn}&abbr=${abbr}`)}
            title={`查看家族树: ${params.data?.nameCn || val}`}
          >
            {val}
          </span>
        );
      },
    },
    {
      headerName: "公司英文名",
      field: "nameEn",
      width: 450,
      editable: isTristan,
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return '';
        const nameCn = encodeURIComponent(params.data?.nameCn || '');
        const abbr = encodeURIComponent(params.data?.abbr || '');
        const duns = params.data?.globalUltimateDuns || '';
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => history.push(`/DNBWebFamilyTree/${duns}?nameCn=${nameCn}&abbr=${abbr}`)}
            title={`查看 WEB 家族树: ${params.data?.nameCn || val}`}
          >
            {val}
          </span>
        );
      },
    },
    { headerName: "公司中文名", field: "nameCn", width: 350, editable: isTristan },
    { headerName: "缩写", field: "abbr", width: 150, editable: isTristan },
    { headerName: "来源", field: "source", width: 160, editable: isTristan, hide: true },
    { headerName: "来源类型", field: "sourceType", width: 200, editable: isTristan, hide: true },
    { headerName: "行业编码", field: "industryCode", width: 140, editable: isTristan },
    { headerName: "集团行业", field: "industryGroupCode", width: 160, editable: isTristan, hide: true },
    {
      headerName: "家族表行数",
      field: "_ftCount",
      width: 100,
      editable: false,
      filter: false,
      sortable: true,
      type: 'numericColumn',
      valueFormatter: (p: any) => {
        if (p.value === '__loading__') return '查询中...';
        if (p.value == null) return '-';
        return String(p.value);
      },
    },
    {
      headerName: "境外分支数",
      field: "_ftOverseasCount",
      width: 100,
      editable: false,
      filter: true,
      sortable: true,
      type: 'numericColumn',
      valueFormatter: (p: any) => {
        if (p.value === '__loading__') return '查询中...';
        if (p.value == null) return '-';
        return String(p.value);
      },
      cellRenderer: (params: any) => {
        const val = params.value;
        if (val === '__loading__') return '查询中...';
        if (val == null || val === '') return '-';
        const nameCn = encodeURIComponent(params.data?.nameCn || '');
        const abbr = encodeURIComponent(params.data?.abbr || '');
        const duns = params.data?.globalUltimateDuns || '';
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => history.push(`/diffDNBFamilyTree/${duns}?nameCn=${nameCn}&abbr=${abbr}`)}
            title={`对比境外分支机构: ${params.data?.nameCn || duns}`}
          >
            {val}
          </span>
        );
      },
    },
    {
      // Web家族表行数（来自数据库 DNBWebFamilyTree-* 集合统计）
      headerName: "Web家族表行数",
      field: "_webFtCount",
      width: 140,
      editable: false,
      filter: true,
      sortable: true,
      type: 'numericColumn',
      valueFormatter: (p: any) => {
        if (p.value === '__loading__') return '查询中...';
        if (p.value == null || p.value === '') return '-';
        return Number(p.value).toLocaleString();
      },
    },
    {
      headerName: "Web境外分支数",
      field: "_webFtOverseasCount",
      width: 130,
      editable: false,
      filter: true,
      sortable: true,
      type: 'numericColumn',
      valueFormatter: (p: any) => {
        if (p.value === '__loading__') return '查询中...';
        if (p.value == null) return '-';
        return String(p.value);
      },
      cellRenderer: (params: any) => {
        const val = params.value;
        if (val === '__loading__') return '查询中...';
        if (val == null || val === '') return '-';
        const nameCn = encodeURIComponent(params.data?.nameCn || '');
        const abbr = encodeURIComponent(params.data?.abbr || '');
        const duns = params.data?.globalUltimateDuns || '';
        return (
          <span
            style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => history.push(`/diffDNBFamilyTree/${duns}?nameCn=${nameCn}&abbr=${abbr}`)}
            title={`对比境外分支机构: ${params.data?.nameCn || duns}`}
          >
            {val}
          </span>
        );
      },
    },
    { headerName: "客户类型", field: "customerType", width: 120, editable: isTristan },
    { headerName: "更新时间", field: "updateAt", width: 150, editable: isTristan, hide: true },
    { headerName: "customLevel", field: "customLeval", width: 150, editable: isTristan, hide: true },
    // 家族树统计列（异步加载，初始显示「查询中...」）
    {
      headerName: "家族树最后同步",
      field: "_ftLastSync",
      width: 150,
      editable: false,
      filter: false,
      sortable: true,
      valueFormatter: (p: any) => {
        if (p.value === '__loading__') return '查询中...';
        if (!p.value) return '未同步';
        return new Date(p.value).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      },
    },
  ], [isTristan]);

  // 「更新家族树」操作列（固定钉右）
  const actionColumn = useMemo(() => ({
    headerName: '更新DNB家族树',
    headerTooltip: '通过调用DNB API获取最新家族树，并更新到数据库',
    field: '__action__',
    width: 150,
    minWidth: 130,
    editable: false,
    filter: false,
    sortable: false,
    pinned: 'right' as const,
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    cellRenderer: (params: any) => {
      const rowId = params.data?._id;
      const isLoading = familyTreeLoadingIds.has(rowId);
      // 读取该行当前的分页进度
      const progress = familyTreeProgress[rowId];
      // globalUltimateDuns 为空时禁用按钮
      const hasDuns = Boolean(params.data?.globalUltimateDuns);
      // 按钮文字：同步中显示分页进度，否则显示正常文字
      const btnText = isLoading
        ? progress?.totalPages > 0
          ? `${progress.page}/${progress.totalPages}`   // 已知总页数时显示 "N/M"
          : '启动中...'                                      // 第1页还未返回时
        : 'Get DNB';
      return (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<ApartmentOutlined />}
          loading={isLoading}
          disabled={!hasDuns || isLoading || !isTristan}
          onClick={() => {
            if (!isTristan) {
              message.error('无权操作');
              return;
            }
            handleSyncFamilyTree(params.data);
          }}
        >
          {btnText}
        </Button>
      );
    },
  }), [familyTreeLoadingIds, familyTreeProgress, handleSyncFamilyTree, isTristan]);

  // 「导出JSON」操作列（固定钉右，紧接在更新家族树列之后）
  const exportColumn = useMemo(() => ({
    headerName: '导出DNB家族树',
    field: '__export__',
    width: 150,
    minWidth: 120,
    editable: false,
    filter: false,
    sortable: false,
    pinned: 'right' as const,
    hide: true, // 默认隐藏该列
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    cellRenderer: (params: any) => {
      const rowId = params.data?._id;
      const isExporting = exportingFtIds.has(rowId);
      // 必须有家族树成员数据才能导出
      const ftCount = params.data?._ftCount;
      const hasData = typeof ftCount === 'number' && ftCount > 0;
      return (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={isExporting}
          disabled={!hasData}
          onClick={() => handleExportFtRow(params.data)}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      );
    },
  }), [exportingFtIds, handleExportFtRow]);

  // 初始化列定义（静态列 + 操作列 + 导出列）
  useEffect(() => {
    setDynamicColDefs([...baseColumns, actionColumn, exportColumn]);
  }, [baseColumns, actionColumn, exportColumn]);

  // --- 拉取数据 ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await request('/api/v1/wildcards/keycustomer', {
        method: 'GET',
      });
      const records = result?.results || result?.data?.results || [];
      
      // 动态提取所有字段（排除 _id 和内部元数据字段）
      const allKeys = new Set<string>();
      records.forEach((record: any) => {
        Object.keys(record).forEach(key => allKeys.add(key));
      });
      allKeys.delete('_id');
      // 排除内部统计字段（已在 baseColumns 中定义）
      allKeys.delete('_ftCount');
      allKeys.delete('_ftLastSync');
      allKeys.delete('_webFtCount');
      allKeys.delete('_ftOverseasCount');
      allKeys.delete('_webFtOverseasCount');
      allKeys.delete('globalUltimateFamilyTreeMembersCount');

      setDynamicColDefs((prev) => {
        // 排除操作列和导出列，始终钉在最后
        const nonActionCols = prev.filter((col: any) => col.field !== '__action__' && col.field !== '__export__');
        const existingFields = new Set(nonActionCols.map((col: any) => col.field).filter(Boolean));
        const newCols = Array.from(allKeys)
          .filter(key => !existingFields.has(key))
          .map(key => ({
            headerName: key,
            field: key,
            width: 160,
            editable: isTristan,
          }));
        // 操作列和导出列始终钉在最后
        return [...nonActionCols, ...newCols, actionColumn, exportColumn];
      });

      // 先展示「查询中」占位符号
      const recordsWithPlaceholder = records.map((r: any) => ({
        ...r,
        _ftCount: '__loading__',
        _ftLastSync: '__loading__',
        _webFtCount: '__loading__',
        _ftOverseasCount: '__loading__',
        _webFtOverseasCount: '__loading__',
      }));
      setRowData(recordsWithPlaceholder);
      setDirtyIds(new Set()); // 重置脏标记

      // 异步加载家族树统计（并行请求）
      fetchFamilyTreeStats(records);
    } catch (error) {
      console.error('获取要客清单失败', error);
      message.error('获取要客清单数据失败');
    } finally {
      setLoading(false);
    }
  }, [actionColumn, exportColumn, fetchFamilyTreeStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 单元格值变更 → 标记脏行 ---
  const onCellValueChanged = useCallback((params: any) => {
    const id = params.data?._id;
    if (id) {
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  }, []);

  // --- 统一保存：将所有脏行按 _id 逐条 PATCH 到数据库 ---
  const handleSaveAll = useCallback(async () => {
    if (dirtyIds.size === 0) {
      message.info('没有需要保存的变更');
      return;
    }
    setSaving(true);
    const api = gridRef.current?.api;
    if (!api) return;

    let successCount = 0;
    let failCount = 0;

    // 收集所有脏行数据
    const dirtyRows: any[] = [];
    api.forEachNode((node: any) => {
      if (node.data && dirtyIds.has(node.data._id)) {
        dirtyRows.push({ ...node.data });
      }
    });

    for (const row of dirtyRows) {
      try {
        const { _id, ...updateBody } = row;
        await request(`/api/v1/wildcards/keycustomer/${_id}`, {
          method: 'PATCH',
          data: updateBody,
        });
        successCount++;
      } catch (error) {
        console.error(`保存失败 [_id=${row._id}]`, error);
        failCount++;
      }
    }

    setSaving(false);
    if (failCount === 0) {
      message.success(`成功保存 ${successCount} 条记录`);
      setDirtyIds(new Set());
    } else {
      message.warning(`成功 ${successCount} 条，失败 ${failCount} 条`);
    }
  }, [dirtyIds]);

  // --- 添加列 ---
  const handleAddColumn = useCallback(() => {
    addColForm.validateFields().then((values) => {
      const { fieldName, headerName } = values;
      // 检查字段是否已存在
      const exists = dynamicColDefs.some((col: any) => col.field === fieldName);
      if (exists) {
        message.warning(`字段 "${fieldName}" 已存在`);
        return;
      }
      const newCol = {
        headerName: headerName || fieldName,
        field: fieldName,
        editable: true,
        width: 160,
      };
      setDynamicColDefs((prev) => [...prev, newCol]);
      setAddColVisible(false);
      addColForm.resetFields();
      message.success(`已添加列「${headerName || fieldName}」`);
    });
  }, [addColForm, dynamicColDefs]);

  // --- 删除列（通过自定义上下文菜单） ---
  const handleDeleteColumn = useCallback((field: string) => {
    setDynamicColDefs((prev) => prev.filter((col: any) => col.field !== field));
    message.success(`已删除列「${field}」`);
  }, []);

  // --- 重命名列 ---
  const handleRenameColumn = useCallback(() => {
    renameColForm.validateFields().then((values) => {
      const { newHeaderName } = values;
      setDynamicColDefs((prev) =>
        prev.map((col: any) => {
          if (col.field === renameTarget) {
            return { ...col, headerName: newHeaderName };
          }
          return col;
        })
      );
      setRenameColVisible(false);
      renameColForm.resetFields();
      message.success(`已将字段「${renameTarget}」重命名为「${newHeaderName}」`);
    });
  }, [renameColForm, renameTarget]);

  // --- 右键上下文菜单：支持删除列和重命名列 ---
  const getContextMenuItems = useCallback((params: any): any => {
    const field = params.column?.getColDef()?.field;
    const defaultItems = ['copy', 'copyWithHeaders', 'paste', 'separator', 'export'];

    if (!field || !isTristan) return defaultItems;

    return [
      ...defaultItems,
      'separator',
      {
        name: `重命名列「${field}」`,
        action: () => {
          setRenameTarget(field);
          renameColForm.setFieldsValue({ newHeaderName: params.column.getColDef().headerName || field });
          setRenameColVisible(true);
        },
      },
      {
        name: `删除列「${field}」`,
        action: () => {
          Modal.confirm({
            title: '确认删除列',
            content: `确定要删除「${field}」列吗？此操作不会删除数据库中的字段数据。`,
            onOk: () => handleDeleteColumn(field),
          });
        },
      },
    ];
  }, [handleDeleteColumn, renameColForm, isTristan]);

  // --- 默认列属性 ---
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 120,
    filter: true,
    sortable: true,
    resizable: true,
    enableValue: true,
    enableRowGroup: true,
    enablePivot: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    headerClass: 'tristan-center-header',
  }), []);

  // --- 是否有变更 ---
  const hasDirty = dirtyIds.size > 0;

  return (
    <div style={{
      height: 'calc(100vh - 70px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '16px',
      overflow: 'hidden'
    }}>
      <style>{`
        .tristan-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
        }
        /* 家族树已同步的行：浅绿色背景 */
        .row-ft-synced {
          background-color: #f0fff4 !important;
        }
        .row-ft-synced:hover {
          background-color: #d9f7d9 !important;
        }
      `}</style>

      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>要客清单</h2>
        <Space>
          <Input
            placeholder="全文搜索..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                gridRef.current?.api?.setGridOption('quickFilterText', quickFilterText);
              }
            }}
            allowClear
            onClear={() => {
              setQuickFilterText('');
              gridRef.current?.api?.setGridOption('quickFilterText', '');
            }}
          />
          <Button
            icon={<ExportOutlined />}
            onClick={() => {
              gridRef.current?.api?.exportDataAsCsv({
                fileName: 'keycustomer.csv',
              });
            }}
          >
            导出CSV
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setAddColVisible(true)}
            disabled={!isTristan}
          >
            添加列
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
            loading={saving}
            disabled={!hasDirty || !isTristan}
            style={hasDirty && isTristan ? { background: '#ff4d4f', borderColor: '#ff4d4f' } : {}}
          >
            保存变更 {hasDirty ? `(${dirtyIds.size})` : ''}
          </Button>
        </Space>
      </div>

      {/* AG Grid 主体 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip="加载要客数据中..." size="large" />
          </div>
        )}
        <AgGridReact
          theme={themeQuartz}
          ref={gridRef}
          rowData={rowData}
          columnDefs={dynamicColDefs}
          defaultColDef={defaultColDef}
          // 以 MongoDB _id 为行唯一标识，支持 getRowNode() 定位单行更新
          getRowId={(params: any) => String(params.data._id)}
          enableRangeSelection={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          animateRows={true}
          onCellValueChanged={onCellValueChanged}
          getContextMenuItems={getContextMenuItems}
          // 已同步家族树的行（_ftCount > 0）显示浅绿色背景
          getRowClass={(params: any) => {
            const count = params.data?._ftCount;
            if (typeof count === 'number' && count > 0) return 'row-ft-synced';
            return '';
          }}
          onFirstDataRendered={(params: any) => {
            params.api.autoSizeColumns(['nameEn', 'nameCn']);
          }}
          sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agFilteredRowCountComponent' },
              { statusPanel: 'agSelectedRowCountComponent' },
              { statusPanel: 'agAggregationComponent' },
            ]
          }}
        />
      </div>

      {/* 添加列弹窗 */}
      <Modal
        title="添加新列"
        open={addColVisible}
        onOk={handleAddColumn}
        onCancel={() => { setAddColVisible(false); addColForm.resetFields(); }}
        okText="确认添加"
        cancelText="取消"
      >
        <Form form={addColForm} layout="vertical">
          <Form.Item
            name="fieldName"
            label="字段名（数据库字段）"
            rules={[{ required: true, message: '请输入字段名' }]}
          >
            <Input placeholder="例如: revenue_2025" />
          </Form.Item>
          <Form.Item
            name="headerName"
            label="显示名称（表头）"
          >
            <Input placeholder="例如: 2025年收入（不填则与字段名相同）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重命名列弹窗 */}
      <Modal
        title={`重命名列「${renameTarget}」`}
        open={renameColVisible}
        onOk={handleRenameColumn}
        onCancel={() => { setRenameColVisible(false); renameColForm.resetFields(); }}
        okText="确认"
        cancelText="取消"
      >
        <Form form={renameColForm} layout="vertical">
          <Form.Item
            name="newHeaderName"
            label="新显示名称"
            rules={[{ required: true, message: '请输入新的显示名称' }]}
          >
            <Input placeholder="输入新的表头名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KeyCustomerList;
