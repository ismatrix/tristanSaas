import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, request, history } from '@umijs/max';
import { Spin, message, Button, Space, Tag, Input } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// ─── 复杂字段的自定义列配置 ───────────────────────────────────────────────────
// 对于对象/数组类型的嵌套字段，展开为多个独立列便于阅读和过滤
const SPECIAL_FIELD_MAP: Record<string, any[]> = {
  // 主行业：取 SIC V4 描述
  primaryIndustryCode: [
    {
      headerName: '主行业\nprimaryIndustryCode',
      field: 'primaryIndustryCode',
      colId: 'primaryIndustryCode_desc',
      width: 200,
      valueGetter: (p: any) => p.data?.primaryIndustryCode?.usSicV4Description,
    },
  ],
  // 企业关联：母公司Duns（第3列）+ 家族角色（数组）+ 层级
  corporateLinkage: [
    {
      headerName: '母公司Duns\ncorporateLinkage.parent.duns',
      field: 'corporateLinkage',
      colId: 'corporateLinkage_parentDuns',
      width: 160,
      valueGetter: (p: any) => p.data?.corporateLinkage?.parent?.duns,
    },
    {
      headerName: '家族角色\nfamilytreeRolesPlayed',
      field: 'corporateLinkage',
      colId: 'corporateLinkage_roles',
      width: 220,
      valueGetter: (p: any) =>
        (p.data?.corporateLinkage?.familytreeRolesPlayed || [])
          .map((r: any) => r.description)
          .filter(Boolean)
          .join(', '),
    },
    {
      headerName: '层级\nhierarchyLevel',
      field: 'corporateLinkage',
      colId: 'corporateLinkage_level',
      width: 100,
      valueGetter: (p: any) => p.data?.corporateLinkage?.hierarchyLevel,
    },
  ],
  // 控制状态：默认隐藏
  dunsControlStatus: [
    {
      headerName: 'dunsControlStatus',
      field: 'dunsControlStatus',
      colId: 'dunsControlStatus',
      width: 160,
      hide: true,
    },
  ],
  // 财务：年营收数组中所有 value（financials 本身是数组，取第一个元素的 yearlyRevenues）
  financials: [
    {
      headerName: '年营收\nfinancials[0].yearlyRevenues',
      field: 'financials',
      colId: 'financials_revenues',
      width: 200,
      valueGetter: (p: any) =>
        (Array.isArray(p.data?.financials) ? p.data.financials[0]?.yearlyRevenues : p.data?.financials?.yearlyRevenues || [])
          ?.map((r: any) => r.value)
          .filter((v: any) => v != null)
          .join(', '),
    },
  ],
  // 主地址：展开为四个子字段
  primaryAddress: [
    {
      headerName: '国家\naddressCountry',
      field: 'primaryAddress',
      colId: 'primaryAddress_country',
      width: 120,
      valueGetter: (p: any) => p.data?.primaryAddress?.addressCountry?.name,
    },
    {
      headerName: '省/州\naddressRegion',
      field: 'primaryAddress',
      colId: 'primaryAddress_region',
      width: 120,
      valueGetter: (p: any) => p.data?.primaryAddress?.addressRegion?.name,
    },
    {
      headerName: '城市\naddressLocality',
      field: 'primaryAddress',
      colId: 'primaryAddress_locality',
      width: 120,
      valueGetter: (p: any) => p.data?.primaryAddress?.addressLocality?.name,
    },
    {
      headerName: '街道\nstreetAddress.line1',
      field: 'primaryAddress',
      colId: 'primaryAddress_street',
      width: 200,
      valueGetter: (p: any) => p.data?.primaryAddress?.streetAddress?.line1,
    },
  ],
  // 员工数：数组中所有 value
  numberOfEmployees: [
    {
      headerName: '员工数\nnumberOfEmployees',
      field: 'numberOfEmployees',
      colId: 'numberOfEmployees_val',
      width: 120,
      valueGetter: (p: any) =>
        (p.data?.numberOfEmployees || [])
          .map((e: any) => e.value)
          .filter((v: any) => v != null)
          .join(', '),
    },
  ],
  // 商业名：数组中所有 name
  tradeStyleNames: [
    {
      headerName: '商业名\ntradeStyleNames',
      field: 'tradeStyleNames',
      colId: 'tradeStyleNames_names',
      width: 200,
      valueGetter: (p: any) =>
        (p.data?.tradeStyleNames || [])
          .map((t: any) => t.name)
          .filter(Boolean)
          .join(', '),
    },
  ],
};

// 不需要在列定义中处理的内部字段
const INTERNAL_FIELDS = new Set(['_id', '_syncedAt']);

// 定制前置列（按此顺序排在行号列之后）
const PRIORITY_FIELDS = ['duns', 'primaryName', 'corporateLinkage'];

/**
 * 根据数据中实际存在的字段，构建 AG Grid 列定义
 * - 固定顺序：# → duns → primaryName → corporateLinkage(含parent.duns) → 其余字段
 * - 特殊字段使用 SPECIAL_FIELD_MAP 中的自定义配置
 * - 普通字段自动生成简单列
 * - 内部字段（_id, _syncedAt）跳过
 */
const buildColumnDefs = (allKeys: Set<string>): any[] => {
  const processedFields = new Set<string>();
  const cols: any[] = [
    // 行号列（固定在最左）
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      minWidth: 40,
      pinned: 'left',
      filter: false,
      sortable: false,
      editable: false,
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: true,
    },
  ];

  // 辅助函数：处理单个字段
  const processField = (key: string) => {
    if (processedFields.has(key)) return;
    processedFields.add(key);
    if (INTERNAL_FIELDS.has(key)) return;
    if (!allKeys.has(key)) return; // 字段不存在于数据中则跳过

    if (SPECIAL_FIELD_MAP[key]) {
      cols.push(...SPECIAL_FIELD_MAP[key]);
    } else {
      cols.push({
        headerName: key,
        field: key,
        width: 160,
        minWidth: 120,
        editable: false,
        filter: true,
        sortable: true,
        resizable: true,
      });
    }
  };

  // 第1步：优先字段（duns → primaryName → corporateLinkage）
  PRIORITY_FIELDS.forEach(processField);

  // 第2步：剩余字段按数据中出现顺序
  Array.from(allKeys).forEach(processField);

  return cols;
};


/**
 * DNB 家族树详情页
 * 路由：/DNBFamilyTree/:globalUltimateDuns?nameCn=xxx&abbr=xxx
 * 通过 wildcards API 查询集合，展示家族树成员数据，并对复杂字段做扁平化展示
 */
const DnbFamilyTreePage: React.FC = () => {
  const params = useParams<{ globalUltimateDuns: string }>();
  const location = useLocation();
  const { globalUltimateDuns } = params;

  // 从 URL Query 读取 nameCn 和 abbr
  const { nameCn, abbr } = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return {
      nameCn: sp.get('nameCn') || '',
      abbr: sp.get('abbr') || '',
    };
  }, [location.search]);

  const gridRef = useRef<AgGridReact>(null);

  const [rowData, setRowData] = useState<any[]>([]);
  const [colDefs, setColDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [collectionName, setCollectionName] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  // 全文搜索过滤文本
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // --- 查找目标集合 ---
  const findCollection = useCallback(async (): Promise<string | null> => {
    try {
      const collections: string[] = await request('/api/v1/wildcards', {
        method: 'GET',
        params: { prefix: 'DNBFamilyTree-' },
      });

      if (!Array.isArray(collections)) return null;

      // 优先精确匹配 abbr + duns，兜底用 duns 前缀模糊匹配
      const exactMatch = abbr
        ? collections.find((name: string) => name === `DNBFamilyTree-${abbr}-${globalUltimateDuns}`)
        : null;

      return exactMatch || collections.find((name: string) => name.includes(globalUltimateDuns || '')) || null;
    } catch (err) {
      console.error('查询集合列表失败', err);
      return null;
    }
  }, [globalUltimateDuns, abbr]);

  // --- 加载家族树数据 ---
  const fetchData = useCallback(async () => {
    if (!globalUltimateDuns) {
      message.error('URL 参数缺少 globalUltimateDuns');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 第一步：找到对应的集合名
      const targetCollection = await findCollection();
      if (!targetCollection) {
        message.warning(`未找到 Duns=${globalUltimateDuns} 对应的家族树数据，请先在「要客清单」点击「更新家族树」同步`);
        setLoading(false);
        return;
      }

      setCollectionName(targetCollection);

      // 第二步：拉取全量数据
      const result = await request(`/api/v1/wildcards/${targetCollection}`, {
        method: 'GET',
      });

      const records: any[] = result?.results || result?.data?.results || [];
      setTotalCount(records.length);

      if (records.length === 0) {
        setRowData([]);
        setColDefs([]);
        setLoading(false);
        return;
      }

      // 第三步：从数据中提取所有字段（排除内部字段）
      const allKeys = new Set<string>();
      records.forEach((record: any) => {
        Object.keys(record).forEach(key => allKeys.add(key));
      });
      INTERNAL_FIELDS.forEach(k => allKeys.delete(k));

      // 第四步：构建列定义（特殊字段自定义，普通字段自动）
      setColDefs(buildColumnDefs(allKeys));
      setRowData(records);
    } catch (err: any) {
      console.error('加载家族树数据失败', err);
      message.error(`数据加载失败: ${err?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [globalUltimateDuns, findCollection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- 默认列属性 ---
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
  }), []);

  // --- 导出全部数据为 JSON 文件 ---
  const handleExport = useCallback(() => {
    if (rowData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const fileName = collectionName || `DNBFamilyTree-${globalUltimateDuns}`;
    // 去掉内部字段 _id、_syncedAt，保留所有业务字段
    const exportData = rowData.map(({ _id, _syncedAt, ...rest }: any) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${exportData.length} 条记录 → ${fileName}.json`);
  }, [rowData, collectionName, globalUltimateDuns]);

  // 页面标题：「nameCn」DNB家族树 或 DNB家族树
  const pageTitle = nameCn ? `「${nameCn}」DNB 家族树` : 'DNB 家族树';

  return (
    <div style={{
      height: 'calc(100vh - 70px)',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '16px',
      overflow: 'hidden',
    }}>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => history.back()}>
            返回
          </Button>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            {pageTitle}
          </h2>
          {globalUltimateDuns && (
            <Tag color="blue" style={{ fontSize: 13 }}>
              Duns: {globalUltimateDuns}
            </Tag>
          )}
          {collectionName && (
            <Tag color="green" style={{ fontSize: 12 }}>
              {collectionName}
            </Tag>
          )}
          {!loading && totalCount > 0 && (
            <Tag color="purple" style={{ fontSize: 12 }}>
              共 {totalCount} 条成员记录
            </Tag>
          )}
        </Space>
        {/* 右上角：搜索 + 导出 + 刷新 */}
        <Space>
          <Input
            placeholder="全文搜索..."
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
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
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={rowData.length === 0}
          >
            导出JSON
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {/* AG Grid 主体 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.7)', zIndex: 999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <Spin tip="加载家族树数据中..." size="large" />
          </div>
        )}
        {!loading && rowData.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexDirection: 'column', color: '#999', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>🌳</span>
            <p style={{ margin: 0, fontSize: 16 }}>暂无家族树数据</p>
            <p style={{ margin: 0, color: '#bbb', fontSize: 13 }}>
              请在「要客清单」页面点击对应行的「更新家族树」按钮，从 DNB 同步数据后再查看
            </p>
          </div>
        ) : (
          <AgGridReact
            theme={themeQuartz}
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            enableRangeSelection={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            animateRows={true}
            sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
            statusBar={{
              statusPanels: [
                { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
                { statusPanel: 'agFilteredRowCountComponent' },
                { statusPanel: 'agSelectedRowCountComponent' },
                { statusPanel: 'agAggregationComponent' },
              ],
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DnbFamilyTreePage;
