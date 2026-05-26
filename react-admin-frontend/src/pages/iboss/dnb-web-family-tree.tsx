import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, request, history } from '@umijs/max';
import { Spin, message, Button, Space, Tag, Input } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// 不需要在列定义中处理的内部字段
const INTERNAL_FIELDS = new Set(['_id', '_syncedAt']);

/**
 * DNB WEB 家族树详情页
 * 路由：/DNBWebFamilyTree/:duns?nameCn=xxx&abbr=xxx
 * 通过 wildcards API 查询集合，展示 DNBWebFamilyTree 的记录数据
 */
const DnbWebFamilyTreePage: React.FC = () => {
  const params = useParams<{ duns: string }>();
  const location = useLocation();
  const { duns } = params;

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
  const [loading, setLoading] = useState<boolean>(true);
  const [collectionName, setCollectionName] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  // 全文搜索过滤文本
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // 1. 静态硬编码配置显示的 12 个指定列
  const colDefs = useMemo(() => [
    {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 60,
      minWidth: 40,
      pinned: 'left' as const,
      filter: false,
      sortable: false,
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: true,
    },
    {
      headerName: 'duns',
      field: 'company_dunsNumber', // 对应更新后的顶层字段
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '公司名',
      field: 'fields.company_companyName',
      width: 250,
      filter: true,
      sortable: true,
    },
    {
      headerName: '注册类型',
      field: 'fields.company_registrationNumbers_registrationTypeId_company_registration_number_type_2',
      width: 220,
      filter: true,
      sortable: true,
    },
    {
      headerName: '注册号',
      valueGetter: (p: any) =>
        p.data?.fields?.company_registrationNumbers?.registrationNumber ||
        p.data?.fields?.company_registration_number_1 ||
        '',
      width: 200,
      filter: true,
      sortable: true,
    },
    {
      headerName: '实体类型',
      field: 'fields.company_entityTypeId_entityType_name',
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '国内最高',
      field: 'fields.company_isDomesticUltimate',
      width: 100,
      filter: true,
      sortable: true,
      valueFormatter: (p: any) => (p.value === true ? '是' : p.value === false ? '否' : '-'),
    },
    {
      headerName: '总部',
      field: 'fields.company_isHQ',
      width: 100,
      filter: true,
      sortable: true,
      valueFormatter: (p: any) => (p.value === true ? '是' : p.value === false ? '否' : '-'),
    },
    {
      headerName: '销售额',
      field: 'fields.company_salesUsd',
      width: 160,
      filter: true,
      sortable: true,
      type: 'numericColumn',
      valueFormatter: (p: any) => (p.value != null ? Number(p.value).toLocaleString() : '-'),
    },
    {
      headerName: '成立年',
      field: 'fields.company_yearFounded',
      width: 100,
      filter: true,
      sortable: true,
    },
    {
      headerName: '国家',
      field: 'fields.company_addresses_countryId_country_name',
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '城市',
      field: 'fields.company_addresses_city',
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '主营',
      field: 'fields.company_os2010IndustryId_industry_shortDescription',
      width: 220,
      filter: true,
      sortable: true,
    },
  ], []);

  // --- 查找目标以 DNBWebFamilyTree- 开头的集合 ---
  const findCollection = useCallback(async (): Promise<string | null> => {
    try {
      const collections: string[] = await request('/api/v1/wildcards', {
        method: 'GET',
        params: { prefix: 'DNBWebFamilyTree-' },
      });

      if (!Array.isArray(collections)) return null;

      // 优先匹配包含 abbr 的全名，匹配不到则找包含 duns 的子项
      const exactMatch = abbr
        ? collections.find((name: string) => name === `DNBWebFamilyTree-${abbr}-${duns}`)
        : null;

      return exactMatch || collections.find((name: string) => name.includes(duns || '')) || null;
    } catch (err) {
      console.error('查询 DNBWebFamilyTree 集合列表失败', err);
      return null;
    }
  }, [duns, abbr]);

  // --- 加载 Web 家族树数据 ---
  const fetchData = useCallback(async () => {
    if (!duns) {
      message.error('URL 参数缺少 duns 属性');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. 查找集合名称
      const targetCollection = await findCollection();
      if (!targetCollection) {
        message.warning(`未找到 duns=${duns} 对应的 DNBWebFamilyTree 表数据`);
        setLoading(false);
        return;
      }

      setCollectionName(targetCollection);

      // 2. 拉取集合的全量数据
      const result = await request(`/api/v1/wildcards/${targetCollection}`, {
        method: 'GET',
      });

      const records: any[] = result?.results || result?.data?.results || [];
      setTotalCount(records.length);
      setRowData(records);
    } catch (err: any) {
      console.error('加载 DNBWebFamilyTree 数据失败', err);
      message.error(`数据加载失败: ${err?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [duns, findCollection]);

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
    const fileName = collectionName || `DNBWebFamilyTree-${duns}`;
    // 过滤掉内部 _id 等字段
    const exportData = rowData.map(({ _id, _syncedAt, ...rest }: any) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已成功导出 ${exportData.length} 条记录至 ${fileName}.json`);
  }, [rowData, collectionName, duns]);

  // 页面标题配置为 DNB WEB Family Tree
  const pageTitle = nameCn ? `「${nameCn}」DNB WEB Family Tree` : 'DNB WEB Family Tree';

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
          {duns && (
            <Tag color="blue" style={{ fontSize: 13 }}>
              Duns: {duns}
            </Tag>
          )}
          {collectionName && (
            <Tag color="green" style={{ fontSize: 12 }}>
              {collectionName}
            </Tag>
          )}
          {!loading && totalCount > 0 && (
            <Tag color="purple" style={{ fontSize: 12 }}>
              共 {totalCount} 条记录
            </Tag>
          )}
        </Space>
        {/* 右上角操作组件 */}
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

      {/* AG Grid 展示面板 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.7)', zIndex: 999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <Spin tip="加载 WEB 家族数据中..." size="large" />
          </div>
        )}
        {!loading && rowData.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexDirection: 'column', color: '#999', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>🕸️</span>
            <p style={{ margin: 0, fontSize: 16 }}>暂无 WEB 家族树数据</p>
            <p style={{ margin: 0, color: '#bbb', fontSize: 13 }}>
              数据库中没有找到对应客户以 DNBWebFamilyTree 前缀命名的集合。
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

export default DnbWebFamilyTreePage;
