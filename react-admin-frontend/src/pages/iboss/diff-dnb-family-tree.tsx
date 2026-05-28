import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, request, history } from '@umijs/max';
import { Spin, message, Button, Space, Tag, Input, Card, Descriptions, Collapse, Drawer, Tabs, Tooltip } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, SearchOutlined, DownloadOutlined, ApartmentOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

interface CompareRowData {
  duns: string;
  apiName: string | null;
  webName: string | null;
  country: string | null;
  city: string | null;
  status: 'consistent' | 'only_api' | 'only_web' | 'name_diff';
  hasDetail?: boolean;
}

// 辅助解析函数：获取指定币种年销售额
const getSalesByCurrency = (data: any, currencyCode: string) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org) return null;
  if (Array.isArray(org.financials)) {
    for (const fin of org.financials) {
      if (Array.isArray(fin.yearlyRevenue)) {
        const rev = fin.yearlyRevenue.find((r: any) => String(r.currency).toUpperCase() === currencyCode.toUpperCase());
        if (rev && rev.value !== undefined) return rev.value;
      }
    }
  }
  return null;
};

// 辅助解析函数：获取指定 Scope 员工人数
const getEmployeeCountByScope = (data: any, scope: 'Consolidated' | 'Individual') => {
  const org = data?.rawDnbData?.organization || data;
  if (!org || !Array.isArray(org.numberOfEmployees)) return null;
  const emp = org.numberOfEmployees.find((e: any) => e.informationScopeDescription === scope);
  return emp && emp.value !== undefined ? emp.value : null;
};

// 辅助解析函数：获取主要电话
const getTelephone = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!Array.isArray(org?.telephone) || org.telephone.length === 0) return null;
  const t = org.telephone[0];
  return t.isdCode ? `+${t.isdCode} ${t.telephoneNumber}` : t.telephoneNumber;
};

// 辅助解析函数：获取主营行业代码与描述
const getPrimaryIndustry = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!Array.isArray(org?.industryCodes) || org.industryCodes.length === 0) return null;
  const primary = org.industryCodes.find((i: any) => i.priority === 1) || org.industryCodes[0];
  return `${primary.description || ''} (${primary.code || ''} - ${primary.typeDescription || ''})`;
};

// 辅助解析函数：获取中文名称
const getChineseName = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org) return null;
  if (Array.isArray(org.multilingualPrimaryName)) {
    const zh = org.multilingualPrimaryName.find((n: any) => n.language?.description === 'Chinese' || n.language?.dnbCode === 339);
    if (zh) return zh.name;
  }
  if (Array.isArray(org.multilingualTradestyleNames) && org.multilingualTradestyleNames.length > 0) {
    return org.multilingualTradestyleNames[0].name;
  }
  return null;
};

// 辅助解析函数：获取官方网站
const getWebsite = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org) return null;
  if (Array.isArray(org.websiteAddress) && org.websiteAddress.length > 0) {
    return org.websiteAddress[0].url || org.websiteAddress[0].domainName;
  }
  return null;
};

// 辅助解析函数：获取中文本地化地址
const getChineseAddress = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org) return null;
  if (Array.isArray(org.multilingualPrimaryAddress)) {
    const zh = org.multilingualPrimaryAddress.find((a: any) => a.language?.description === 'Chinese' || a.language?.dnbCode === 339);
    if (zh) {
      const region = zh.addressRegion?.name || '';
      const locality = zh.addressLocality?.name || '';
      const street = zh.streetAddress?.line1 || '';
      return `${region}${locality}${street}`.trim() || null;
    }
  }
  return null;
};

// 辅助解析函数：获取主营业务活动描述
const getActivity = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org) return null;
  if (Array.isArray(org.activities) && org.activities.length > 0) {
    return org.activities[0].description;
  }
  return null;
};

// 辅助解析函数：获取经营状态
const getOperatingStatus = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  return org?.dunsControlStatus?.operatingStatus?.description || null;
};

// 辅助解析函数：获取成立年份/日期
const getIncorporatedDate = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  return org?.incorporatedDate || org?.startDate || null;
};

// 辅助解析函数：获取法律形式
const getLegalForm = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  return org?.registeredDetails?.legalForm?.description || org?.legalForm?.description || null;
};

// 辅助解析函数：获取控股所有权类型
const getControlOwnershipType = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  return org?.controlOwnershipType?.description || null;
};

// 辅助解析函数：获取主营行业代码 (US SIC V4) 详细信息
const getPrimaryIndustryCodeInfo = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  const code = org?.primaryIndustryCode?.usSicV4;
  const desc = org?.primaryIndustryCode?.usSicV4Description;
  if (code && desc) {
    return `${desc} (US SIC V4: ${code})`;
  }
  return desc || code || null;
};

// 辅助解析函数：按分类获取所有行业分类代码
const getCategorizedIndustryCodes = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org || !Array.isArray(org.industryCodes)) return [];
  const groups: { [key: string]: any[] } = {};
  org.industryCodes.forEach((item: any) => {
    const type = item.typeDescription || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
  });
  return Object.entries(groups).map(([type, list]) => ({
    type,
    codes: list.map(c => `${c.code} - ${c.description}${c.priority ? ` (优先级: ${c.priority})` : ''}`)
  }));
};

// 辅助解析函数：获取 UNSPSC 编码列表
const getUnspscCodesInfo = (data: any) => {
  const org = data?.rawDnbData?.organization || data;
  if (!org || !Array.isArray(org.unspscCodes)) return [];
  return org.unspscCodes.map((item: any) => `${item.code} - ${item.description}${item.priority ? ` (优先级: ${item.priority})` : ''}`);
};

// 辅助解析函数：获取终极母公司年销售额 (USD/CNY)
const getUltimateSales = (data: any, type: 'globalUltimate' | 'domesticUltimate', currencyCode: string) => {
  const org = data?.rawDnbData?.organization || data;
  const ult = org?.[type];
  if (!ult || !Array.isArray(ult.financials)) return null;
  for (const fin of ult.financials) {
    if (Array.isArray(fin.yearlyRevenue)) {
      const rev = fin.yearlyRevenue.find((r: any) => String(r.currency).toUpperCase() === currencyCode.toUpperCase());
      if (rev && rev.value !== undefined) return rev.value;
    }
  }
  return null;
};

// 辅助解析函数：获取终极母公司员工人数
const getUltimateEmployee = (data: any, type: 'globalUltimate' | 'domesticUltimate') => {
  const org = data?.rawDnbData?.organization || data;
  const ult = org?.[type];
  if (!ult || !Array.isArray(ult.numberOfEmployees)) return null;
  const consolidated = ult.numberOfEmployees.find((e: any) => e.informationScopeDescription === 'Consolidated');
  if (consolidated && consolidated.value !== undefined) return consolidated.value;
  if (ult.numberOfEmployees.length > 0 && ult.numberOfEmployees[0].value !== undefined) {
    return ult.numberOfEmployees[0].value;
  }
  return null;
};

const DiffDnbFamilyTreePage: React.FC = () => {
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

  const [rowData, setRowData] = useState<CompareRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiCollName, setApiCollName] = useState<string>('');
  const [webCollName, setWebCollName] = useState<string>('');
  
  // 状态计数器
  const [counts, setCounts] = useState({
    total: 0,
    consistent: 0,
    onlyApi: 0,
    onlyWeb: 0,
    nameDiff: 0,
  });

  // 全文搜索过滤文本
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  // 批量同步与选择状态
  const [syncing, setSyncing] = useState<boolean>(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);

  // Drawer 详情抽屉状态
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [drawerDuns, setDrawerDuns] = useState<string>('');
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerData, setDrawerData] = useState<any>(null);

  // 展开抽屉获取详情
  const handleShowDrawer = useCallback(async (dunsVal: string) => {
    setDrawerDuns(dunsVal);
    setDrawerVisible(true);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const res = await request(`/api/v1/dnb/company-detail/${dunsVal}`, {
        method: 'GET',
      });
      setDrawerData(res?.data || null);
    } catch (err: any) {
      console.error('获取DNB公司详情失败', err);
      message.error(`载入详情失败: ${err?.message || '未知错误'}`);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  // 批量同步详情
  const handleSyncDetails = useCallback(async () => {
    const api = gridRef.current?.api;
    if (!api) return;
    const selectedRows = api.getSelectedRows();
    if (selectedRows.length === 0) {
      message.warning('请先勾选需要同步详情的记录');
      return;
    }

    const dunsList = selectedRows.map(row => row.duns);
    setSyncing(true);
    try {
      const res = await request('/api/v1/dnb/company-detail/sync', {
        method: 'POST',
        data: { dunsList, guDuns: duns },
      });

      const { success, failed } = res?.data || {};
      const successCount = Array.isArray(success) ? success.length : 0;
      const failedCount = Array.isArray(failed) ? failed.length : 0;

      if (successCount > 0) {
        message.success(`成功同步 ${successCount} 条DNB详情记录`);
        const successSet = new Set<string>(success);
        setRowData(prev => 
          prev.map(row => 
            successSet.has(row.duns) ? { ...row, hasDetail: true } : row
          )
        );
      }
      if (failedCount > 0) {
        message.error(`${failedCount} 条同步失败，请检查网络或DUNS号`);
      }
      
      api.deselectAll();
      setSelectedCount(0);
    } catch (err: any) {
      console.error('批量同步DNB详情失败', err);
      message.error(`同步详情失败: ${err?.message || '未知错误'}`);
    } finally {
      setSyncing(false);
    }
  }, [gridRef, duns]);

  // 1. 列定义
  const colDefs = useMemo(() => [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      minWidth: 50,
      pinned: 'left' as const,
      filter: false,
      sortable: false,
      suppressHeaderMenuButton: true,
      suppressHeaderFilterButton: true,
    },
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
      field: 'duns',
      width: 160,
      filter: true,
      sortable: true,
      cellRenderer: (p: any) => {
        const hasDetail = p.data?.hasDetail;
        const dunsVal = p.value;
        if (hasDetail) {
          return (
            <a 
              style={{ fontWeight: 'bold', textDecoration: 'underline' }}
              onClick={() => handleShowDrawer(dunsVal)}
            >
              {dunsVal}
            </a>
          );
        }
        return <span>{dunsVal}</span>;
      }
    },
    {
      headerName: 'DNBFamilyTree 公司名 (API)',
      field: 'apiName',
      width: 380,
      filter: true,
      sortable: true,
      valueFormatter: (p: any) => p.value || '',
    },
    {
      headerName: 'DNBWebFamilyTree 公司名 (WEB)',
      field: 'webName',
      width: 380,
      filter: true,
      sortable: true,
      valueFormatter: (p: any) => p.value || '',
    },
    {
      headerName: '国家',
      field: 'country',
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '城市',
      field: 'city',
      width: 140,
      filter: true,
      sortable: true,
    },
    {
      headerName: '对比状态',
      field: 'status',
      width: 150,
      filter: true,
      sortable: true,
      cellRenderer: (p: any) => {
        const status = p.value;
        if (status === 'consistent') return <Tag color="green">数据一致</Tag>;
        if (status === 'only_api') return <Tag color="orange">仅在 API 存在</Tag>;
        if (status === 'only_web') return <Tag color="blue">仅在 WEB 存在</Tag>;
        if (status === 'name_diff') return <Tag color="red">公司名不一致</Tag>;
        return null;
      },
    },
  ], [handleShowDrawer]);

  // --- 查找对应的两个表名 ---
  const findCollections = useCallback(async (): Promise<{ api: string | null; web: string | null }> => {
    try {
      const apiCols: string[] = await request('/api/v1/wildcards', {
        method: 'GET',
        params: { prefix: 'DNBFamilyTree-' },
      });
      const webCols: string[] = await request('/api/v1/wildcards', {
        method: 'GET',
        params: { prefix: 'DNBWebFamilyTree-' },
      });

      let targetApi: string | null = null;
      let targetWeb: string | null = null;

      if (Array.isArray(apiCols)) {
        const exact = abbr ? apiCols.find(name => name === `DNBFamilyTree-${abbr}-${duns}`) : null;
        targetApi = exact || apiCols.find(name => name.includes(duns || '')) || null;
      }

      if (Array.isArray(webCols)) {
        const exact = abbr ? webCols.find(name => name === `DNBWebFamilyTree-${abbr}-${duns}`) : null;
        targetWeb = exact || webCols.find(name => name.includes(duns || '')) || null;
      }

      return { api: targetApi, web: targetWeb };
    } catch (err) {
      console.error('查询对比集合失败', err);
      return { api: null, web: null };
    }
  }, [duns, abbr]);

  // --- 加载两表境外分支并做 Join 对比 ---
  const fetchData = useCallback(async () => {
    if (!duns) {
      message.error('URL 参数缺少 duns 属性');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. 获取对应的两个表名
      const colNames = await findCollections();
      setApiCollName(colNames.api || '');
      setWebCollName(colNames.web || '');

      let apiList: any[] = [];
      let webList: any[] = [];

      // 2. 异步并行获取两个表的境外分支记录，同时包含 GU 自身信息（即使国家为 China）
      const fetchJobs = [];
      if (colNames.api) {
        fetchJobs.push(
          request(`/api/v1/wildcards/${colNames.api}`, {
            method: 'GET',
            params: {
              query: JSON.stringify({
                $or: [
                  { duns: duns },
                  { "primaryAddress.addressCountry.name": { "$ne": "China", "$nin": [null, ""] } }
                ]
              }),
            },
          }).then(res => {
            apiList = res?.results || res?.data?.results || [];
          }).catch(() => {})
        );
      }
      if (colNames.web) {
        fetchJobs.push(
          request(`/api/v1/wildcards/${colNames.web}`, {
            method: 'GET',
            params: {
              query: JSON.stringify({
                $or: [
                  { company_dunsNumber: duns },
                  { "fields.company_dunsNumber": duns },
                  { "fields.company_addresses_countryId_country_name": { "$ne": "China", "$nin": [null, ""] } }
                ]
              }),
            },
          }).then(res => {
            webList = res?.results || res?.data?.results || [];
          }).catch(() => {})
        );
      }

      await Promise.all(fetchJobs);

      // 3. 内存进行主键 Join 匹配
      const apiMap = new Map<string, any>();
      const webMap = new Map<string, any>();

      apiList.forEach((item) => {
        const itemDuns = String(item.duns || '').trim();
        if (itemDuns) apiMap.set(itemDuns, item);
      });

      webList.forEach((item) => {
        // Web 境外分支中，duns 储存在顶层 company_dunsNumber 中，或者 fields.company_dunsNumber
        const itemDuns = String(item.company_dunsNumber || item.fields?.company_dunsNumber || '').trim();
        if (itemDuns) webMap.set(itemDuns, item);
      });

      const allDunsSet = new Set<string>([...apiMap.keys(), ...webMap.keys()]);
      const compareResultList: CompareRowData[] = [];
      
      let consistentCount = 0;
      let onlyApiCount = 0;
      let onlyWebCount = 0;
      let nameDiffCount = 0;

      allDunsSet.forEach((dunsVal) => {
        const apiItem = apiMap.get(dunsVal);
        const webItem = webMap.get(dunsVal);

        const apiName = apiItem ? apiItem.primaryName : null;
        const webName = webItem ? webItem.fields?.company_companyName : null;

        // 获取国家和城市信息
        const country = apiItem
          ? apiItem.primaryAddress?.addressCountry?.name
          : (webItem ? webItem.fields?.company_addresses_countryId_country_name : null);
        const city = apiItem
          ? apiItem.primaryAddress?.addressLocality?.name
          : (webItem ? webItem.fields?.company_addresses_city : null);

        let status: CompareRowData['status'] = 'consistent';
        if (!apiItem) {
          status = 'only_web';
          onlyWebCount++;
        } else if (!webItem) {
          status = 'only_api';
          onlyApiCount++;
        } else {
          // 均存在，对比名称（去除首尾空格、忽略大小写）
          const name1 = String(apiName || '').trim().toLowerCase();
          const name2 = String(webName || '').trim().toLowerCase();
          if (name1 !== name2) {
            status = 'name_diff';
            nameDiffCount++;
          } else {
            consistentCount++;
          }
        }

        compareResultList.push({
          duns: dunsVal,
          apiName,
          webName,
          country,
          city,
          status,
        });
      });

      // 将 GU 这条记录强制排在第一条，其次是不一致的记录
      compareResultList.sort((a, b) => {
        const aIsGu = a.duns === duns ? 1 : 0;
        const bIsGu = b.duns === duns ? 1 : 0;
        if (aIsGu !== bIsGu) {
          return bIsGu - aIsGu;
        }
        const aDiff = a.status !== 'consistent' ? 1 : 0;
        const bDiff = b.status !== 'consistent' ? 1 : 0;
        return bDiff - aDiff;
      });

      // 批量检查详情是否存在以决定超链接渲染
      const dunsList = compareResultList.map(item => item.duns);
      if (dunsList.length > 0) {
        try {
          const checkRes = await request('/api/v1/dnb/company-detail/check-exist', {
            method: 'POST',
            data: { dunsList },
          });
          const existingDunsSet = new Set<string>(checkRes?.data || []);
          compareResultList.forEach((item) => {
            item.hasDetail = existingDunsSet.has(item.duns);
          });
        } catch (checkErr) {
          console.error('检查DNB详情存在状态失败', checkErr);
        }
      }

      setCounts({
        total: allDunsSet.size,
        consistent: consistentCount,
        onlyApi: onlyApiCount,
        onlyWeb: onlyWebCount,
        nameDiff: nameDiffCount,
      });

      setRowData(compareResultList);
    } catch (err: any) {
      console.error('境外分支机构比对失败', err);
      message.error(`境外分支对比失败: ${err?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [duns, findCollections]);

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

  // --- 导出比对列表为 JSON 文件 ---
  const handleExport = useCallback(() => {
    if (rowData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const fileName = `diffDNBFamilyTree-${abbr || 'CN'}-${duns}`;
    const blob = new Blob([JSON.stringify(rowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已成功导出比对列表至 ${fileName}.json`);
  }, [rowData, duns, abbr]);

  // --- 行高亮 Class ---
  const getRowClass = useCallback((params: any) => {
    if (!params.data) return '';
    if (params.data.duns === duns) return 'row-gu-highlight';
    const status = params.data.status;
    if (status === 'only_web') return 'row-only-web';
    if (status === 'only_api') return 'row-only-api';
    if (status === 'name_diff') return 'row-name-diff';
    return '';
  }, [duns]);

  const pageTitle = nameCn ? `「${nameCn}」境外分支比对详情` : 'DNB WEB 与 API 境外分支对比';

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
      {/* 注入高亮行样式 */}
      <style>{`
        /* GU 全球最高母公司高亮行：浅灰色 */
        .row-gu-highlight {
          background-color: #f0f0f0 !important;
        }
        .row-gu-highlight:hover {
          background-color: #e8e8e8 !important;
        }
        /* 仅在 WEB 树存在的行：淡蓝色 */
        .row-only-web {
          background-color: #e6f7ff !important;
        }
        .row-only-web:hover {
          background-color: #bae7ff !important;
        }
        /* 仅在 API 树存在的行：淡橙色 */
        .row-only-api {
          background-color: #fff7e6 !important;
        }
        .row-only-api:hover {
          background-color: #ffd8bf !important;
        }
        /* 公司名称不一致的行：淡红色 */
        .row-name-diff {
          background-color: #fff1f0 !important;
        }
        .row-name-diff:hover {
          background-color: #ffccc7 !important;
        }
      `}</style>

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
          {!loading && counts.total > 0 && (
            <Space size={4} style={{ marginLeft: 8 }}>
              <Tag color="default">境外分支总数: {counts.total}</Tag>
              <Tag color="green">一致: {counts.consistent}</Tag>
              <Tag color="red">公司名不一致: {counts.nameDiff}</Tag>
              <Tag color="orange">仅在 API 存在: {counts.onlyApi}</Tag>
              <Tag color="blue">仅在 WEB 存在: {counts.onlyWeb}</Tag>
            </Space>
          )}
        </Space>
        {/* 右上角操作 */}
        <Space wrap>
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
          <Tooltip title={`同步DNB详情${selectedCount > 0 ? ` (${selectedCount})` : ''}`}>
            <Button
              type="primary"
              icon={<ApartmentOutlined />}
              onClick={handleSyncDetails}
              loading={syncing}
              disabled={selectedCount === 0 || loading}
            />
          </Tooltip>
          <Tooltip title="导出JSON">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={rowData.length === 0}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
          </Tooltip>
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
            <Spin tip="拉取并比对境外数据中..." size="large" />
          </div>
        )}
        {!loading && rowData.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            flexDirection: 'column', color: '#999', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>⚖️</span>
            <p style={{ margin: 0, fontSize: 16 }}>暂无境外分支对比数据</p>
            <p style={{ margin: 0, color: '#bbb', fontSize: 13 }}>
              没有查询到该客户的任何境外分支机构数据（国家不包含 China 且不为空）。
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
            getRowClass={getRowClass}
            onSelectionChanged={(p: any) => {
              const selected = p.api.getSelectedNodes();
              setSelectedCount(selected.length);
            }}
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

      {/* DUNS 详情抽屉 */}
      <Drawer
        title={`DUNS 详情 - ${drawerDuns}`}
        width={650}
        onClose={() => {
          setDrawerVisible(false);
          setDrawerDuns('');
          setDrawerData(null);
        }}
        open={drawerVisible}
        destroyOnClose
        styles={{ body: { padding: '20px', background: '#f0f2f5' } }}
      >
        {drawerLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin tip="载入详情数据中..." size="large" />
          </div>
        ) : drawerData ? (
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: '结构化明细',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                  {/* 1. 企业封面大卡片 */}
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', right: -20, top: -20, opacity: 0.08, fontSize: '120px', pointerEvents: 'none', userSelect: 'none'
                    }}>
                      🏢
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      {drawerData.rawDnbData?.organization?.primaryName || drawerData.primaryName || '未知企业'}
                    </div>
                    {getChineseName(drawerData) && (
                      <div style={{ fontSize: '15px', color: '#9ca3af', marginBottom: '12px' }}>
                        {getChineseName(drawerData)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                      <div>
                        <span style={{ color: '#9ca3af' }}>DUNS 号码: </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa' }}>{drawerDuns}</span>
                      </div>
                      {drawerData.Global_OneID && (
                        <div>
                          <span style={{ color: '#9ca3af' }}>Global OneID: </span>
                          <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{drawerData.Global_OneID}</span>
                        </div>
                      )}
                      {drawerData.GU && (
                        <div>
                          <span style={{ color: '#9ca3af' }}>所属 GU DUNS: </span>
                          <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{drawerData.GU}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* 2. 基础工商信息 */}
                  <Card title="📌 基础工商信息" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="经营状态" span={1}>
                        <Tag color={getOperatingStatus(drawerData) === 'Active' ? 'green' : 'red'}>
                          {getOperatingStatus(drawerData) || '-'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="成立年份/日期" span={1}>
                        {getIncorporatedDate(drawerData) || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="实体类型" span={1}>
                        {drawerData.rawDnbData?.organization?.businessEntityType?.description || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="法律形式" span={1}>
                        {getLegalForm(drawerData) || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="所有权类型" span={1}>
                        {getControlOwnershipType(drawerData) || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="是否独立企业" span={1}>
                        {drawerData.rawDnbData?.organization?.isStandalone ? (
                          <Tag color="blue">是 (Standalone)</Tag>
                        ) : (
                          <Tag color="cyan">否 (有关联母公司)</Tag>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {/* 3. 地理与联系信息 */}
                  <Card title="📍 地理与联系信息" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <Descriptions column={2} size="small" bordered>
                      {getChineseAddress(drawerData) && (
                        <Descriptions.Item label="中文主地址" span={2}>
                          <span style={{ fontWeight: '500', color: '#1f2937' }}>{getChineseAddress(drawerData)}</span>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="英文主地址" span={2}>
                        {drawerData.rawDnbData?.organization?.primaryAddress?.streetAddress?.line1 || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="城市" span={1}>
                        {drawerData.rawDnbData?.organization?.primaryAddress?.addressLocality?.name || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="省份/地区" span={1}>
                        {drawerData.rawDnbData?.organization?.primaryAddress?.addressRegion?.name || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="国家/地区" span={1}>
                        {drawerData.rawDnbData?.organization?.primaryAddress?.addressCountry?.name || '-'} 
                        {drawerData.rawDnbData?.organization?.primaryAddress?.addressCountry?.isoAlpha2Code ? ` (${drawerData.rawDnbData.organization.primaryAddress.addressCountry.isoAlpha2Code})` : ''}
                      </Descriptions.Item>
                      <Descriptions.Item label="邮政编码" span={1}>
                        {drawerData.rawDnbData?.organization?.primaryAddress?.postalCode || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系电话" span={1}>
                        {getTelephone(drawerData) || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="官方网站" span={1}>
                        {getWebsite(drawerData) ? (
                          <a href={getWebsite(drawerData)?.startsWith('http') ? getWebsite(drawerData) : `http://${getWebsite(drawerData)}`} target="_blank" rel="noopener noreferrer">
                            {getWebsite(drawerData)}
                          </a>
                        ) : '-'}
                      </Descriptions.Item>
                      {(drawerData.rawDnbData?.organization?.primaryAddress?.latitude || drawerData.rawDnbData?.organization?.primaryAddress?.longitude) && (
                        <Descriptions.Item label="地理经纬度" span={2}>
                          纬度: {drawerData.rawDnbData.organization.primaryAddress.latitude || '-'}, 
                          经度: {drawerData.rawDnbData.organization.primaryAddress.longitude || '-'}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>

                  {/* 4. 财务与规模指标 */}
                  <Card title="📊 财务与规模指标" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="年销售额 (USD)" span={1}>
                        {getSalesByCurrency(drawerData, 'USD') !== null ? (
                          <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '13px' }}>
                            ${Number(getSalesByCurrency(drawerData, 'USD')).toLocaleString('en-US')}
                          </span>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="年销售额 (CNY)" span={1}>
                        {getSalesByCurrency(drawerData, 'CNY') !== null ? (
                          <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '13px' }}>
                            ¥{Number(getSalesByCurrency(drawerData, 'CNY')).toLocaleString('en-US')}
                          </span>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="合并员工人数" span={1}>
                        {getEmployeeCountByScope(drawerData, 'Consolidated') !== null ? (
                          <span style={{ fontWeight: 'bold' }}>
                            {Number(getEmployeeCountByScope(drawerData, 'Consolidated')).toLocaleString('en-US')} 人
                          </span>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="单体员工人数" span={1}>
                        {getEmployeeCountByScope(drawerData, 'Individual') !== null ? (
                          <span>
                            {Number(getEmployeeCountByScope(drawerData, 'Individual')).toLocaleString('en-US')} 人
                          </span>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="财务截止日期" span={2}>
                        {drawerData.rawDnbData?.organization?.financialStatementToDate || drawerData.rawDnbData?.organization?.fiscalYearEnd || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {/* 5. 业务与行业分类 */}
                  <Card title="🏷️ 业务与行业分类" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <Descriptions column={1} size="small" bordered>
                      {getActivity(drawerData) && (
                        <Descriptions.Item label="经营范围/活动">
                          {getActivity(drawerData)}
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="主要行业分类">
                        {getPrimaryIndustryCodeInfo(drawerData) || '-'}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* 其它行业代码归类 */}
                    {getCategorizedIndustryCodes(drawerData).length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#4b5563', marginBottom: '6px' }}>
                          🏢 其它行业分类体系代码:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {getCategorizedIndustryCodes(drawerData).map((cat: any, i: number) => (
                            <div key={i} style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                              <div style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: '4px' }}>{cat.type}</div>
                              {cat.codes.map((c: string, idx: number) => (
                                <div key={idx} style={{ color: '#374151', paddingLeft: '6px', lineHeight: '1.4' }}>• {c}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* UNSPSC 编码列表 */}
                    {getUnspscCodesInfo(drawerData).length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#4b5563', marginBottom: '6px' }}>
                          📦 UNSPSC 编码:
                        </div>
                        <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {getUnspscCodesInfo(drawerData).map((c: string, idx: number) => (
                            <div key={idx} style={{ color: '#374151', lineHeight: '1.4' }}>• {c}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* 6. 关联终极机构 */}
                  {(drawerData.rawDnbData?.organization?.globalUltimate || drawerData.rawDnbData?.organization?.domesticUltimate) && (
                    <Card title="🔗 关联终极机构 (Ultimate)" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* 全球终极母公司 */}
                        {drawerData.rawDnbData?.organization?.globalUltimate && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px' }}>
                            <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🌍 全球终极母公司 (Global Ultimate)</span>
                            </div>
                            <Descriptions column={2} size="small" layout="horizontal">
                              <Descriptions.Item label="年销售额(USD)">
                                {getUltimateSales(drawerData, 'globalUltimate', 'USD') !== null ? (
                                  <span style={{ color: '#059669', fontWeight: '500' }}>
                                    ${Number(getUltimateSales(drawerData, 'globalUltimate', 'USD')).toLocaleString('en-US')}
                                  </span>
                                ) : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="年销售额(CNY)">
                                {getUltimateSales(drawerData, 'globalUltimate', 'CNY') !== null ? (
                                  <span style={{ color: '#059669', fontWeight: '500' }}>
                                    ¥{Number(getUltimateSales(drawerData, 'globalUltimate', 'CNY')).toLocaleString('en-US')}
                                  </span>
                                ) : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="合并员工数" span={2}>
                                {getUltimateEmployee(drawerData, 'globalUltimate') !== null ? (
                                  <span>{Number(getUltimateEmployee(drawerData, 'globalUltimate')).toLocaleString('en-US')} 人</span>
                                ) : '-'}
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                        )}

                        {/* 国内终极母公司 */}
                        {drawerData.rawDnbData?.organization?.domesticUltimate && (
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: '6px' }}>
                            <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🇨🇳 国内终极母公司 (Domestic Ultimate)</span>
                            </div>
                            <Descriptions column={2} size="small" layout="horizontal">
                              <Descriptions.Item label="年销售额(USD)">
                                {getUltimateSales(drawerData, 'domesticUltimate', 'USD') !== null ? (
                                  <span style={{ color: '#059669', fontWeight: '500' }}>
                                    ${Number(getUltimateSales(drawerData, 'domesticUltimate', 'USD')).toLocaleString('en-US')}
                                  </span>
                                ) : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="年销售额(CNY)">
                                {getUltimateSales(drawerData, 'domesticUltimate', 'CNY') !== null ? (
                                  <span style={{ color: '#059669', fontWeight: '500' }}>
                                    ¥{Number(getUltimateSales(drawerData, 'domesticUltimate', 'CNY')).toLocaleString('en-US')}
                                  </span>
                                ) : '-'}
                              </Descriptions.Item>
                              <Descriptions.Item label="合并员工数" span={2}>
                                {getUltimateEmployee(drawerData, 'domesticUltimate') !== null ? (
                                  <span>{Number(getUltimateEmployee(drawerData, 'domesticUltimate')).toLocaleString('en-US')} 人</span>
                                ) : '-'}
                              </Descriptions.Item>
                            </Descriptions>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* 7. 注册登记号明细 */}
                  <Card title="🆔 官方注册登记号" bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    {Array.isArray(drawerData.rawDnbData?.organization?.registrationNumbers) && drawerData.rawDnbData.organization.registrationNumbers.length > 0 ? (
                      <Descriptions column={1} size="small" bordered>
                        {drawerData.rawDnbData.organization.registrationNumbers.map((reg: any, index: number) => (
                          <Descriptions.Item key={index} label={reg.typeDescription || `注册号类型 ${index+1}`}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937' }}>{reg.registrationNumber}</span>
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    ) : (
                      <div style={{ color: '#999', textAlign: 'center', padding: '10px' }}>暂无注册号明细</div>
                    )}
                  </Card>
                </div>
              )
            },
            {
              key: '2',
              label: '原始 JSON 数据',
              children: (
                <div style={{ padding: '8px 0' }}>
                  <pre style={{
                    maxHeight: 'calc(100vh - 180px)',
                    overflow: 'auto',
                    background: '#2d3748',
                    color: '#a0aec0',
                    padding: '16px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    margin: 0,
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)',
                  }}>
                    {JSON.stringify(drawerData, null, 2)}
                  </pre>
                </div>
              )
            }
          ]} />
        ) : (
          <div style={{ textAlign: 'center', marginTop: '100px', color: '#999' }}>
            未找到该 DUNS 的详细数据
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DiffDnbFamilyTreePage;
