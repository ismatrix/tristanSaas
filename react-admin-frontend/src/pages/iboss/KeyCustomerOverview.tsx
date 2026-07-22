import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Progress, Tooltip, Button, List, Drawer, Table, Tabs, Select, Modal, Input, Pagination, message, Tag } from 'antd';
import { DashboardOutlined, GlobalOutlined, TransactionOutlined, ReloadOutlined, BankOutlined, ArrowUpOutlined, PartitionOutlined, DownloadOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块以防 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// 8大行业英文到中文的映射字典
const INDUSTRY_CN_MAP: Record<string, string> = {
  'Automotive': '汽车',
  'Energy': '能源',
  'Engineering and Construction': '住建',
  'Finance': '金融',
  'Industrial Manufacturing': '制造',
  'Retail Chain and Public Services': '零售连锁与公共服务',
  'Technology and Internet': '互联网/科技',
  'Transportation and Logistics': '交通与物流'
};

const INDUSTRY_COLORS: Record<string, string> = {
  'Finance': '#1890ff',
  'Energy': '#2f54eb',
  'Engineering and Construction': '#722ed1',
  'Automotive': '#13c2c2',
  'Industrial Manufacturing': '#52c41a',
  'Retail Chain and Public Services': '#faad14',
  'Technology and Internet': '#eb2f96',
  'Transportation and Logistics': '#fa541c'
};

const KeyCustomerOverview: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  // 联动状态：选中的行业代码 (null 代表全部行业汇总)
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  // TCV 柱状图联动年份与行业筛选状态 (默认 2026 年，无指定行业联动)
  const [tcvFilter, setTcvFilter] = useState<{ year: string; industry: string | null }>({ year: '2026', industry: null });

  // 数据视角：'B' = B端国际签单/收入, 'A' = A端签单/收入, 'total' = A+B合计（默认）
  const [dataMode, setDataMode] = useState<'B' | 'A' | 'total'>('total');

  // 海外分支抽屉相关状态
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState<boolean>(false);
  const [branchData, setBranchData] = useState<any[]>([]);

  // TCV 图表展示年份范围状态（默认过去3年：2024、2025、2026）
  // 过去10年的年份列表，从当前年份倒序排列
  const currentYear = new Date().getFullYear();
  const allTcvYears = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
  const [tcvDisplayYears, setTcvDisplayYears] = useState<string[]>(['2024', '2025', '2026']);

  // 被隐藏的行业代码列表
  const [hiddenIndustries, setHiddenIndustries] = useState<string[]>([]);

  // 当前选中高亮的要客集团名称
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // --- TCV明细弹窗状态 ---
  const [tcvModalVisible, setTcvModalVisible] = useState<boolean>(false);
  const [tcvModalLoading, setTcvModalLoading] = useState<boolean>(false);
  const [tcvModalData, setTcvModalData] = useState<any[]>([]);
  const [tcvModalTitle, setTcvModalTitle] = useState<string>('');

  // --- BR明细弹窗状态 ---
  const [brModalVisible, setBrModalVisible] = useState<boolean>(false);
  const [brModalLoading, setBrModalLoading] = useState<boolean>(false);
  const [brModalData, setBrModalData] = useState<any[]>([]);
  const [brModalTitle, setBrModalTitle] = useState<string>('');



  // TCV 明细列定义
  const tcvGridColumns = [
    { headerName: '分析客户名称', field: '分析客户名称(规整后)', width: 180, filter: true },
    { headerName: '签约客户名称', field: '签约客户名称', width: 180, filter: true },
    { headerName: '终端客户名称', field: '终端客户名称', width: 180, filter: true },
    { headerName: '签约客户标识', field: '签约客户标识', width: 120, filter: true },
    { headerName: '大区编码', field: '大区编码', width: 100, filter: true },
    { headerName: '大区中文名称', field: '大区中文名称', width: 120, filter: true },
    { headerName: '销售单元编码', field: '销售单元编码', width: 120, filter: true },
    { headerName: '销售单元名称', field: '销售单元中文名称', width: 150, filter: true },
    { headerName: '电路编号', field: '电路编号', width: 150, filter: true },
    { headerName: '合同签署日期', field: '合同签署日期', width: 120, filter: true },
    { headerName: '产品分类', field: '市场经分产品分类', width: 130, filter: true },
    { headerName: '国际业务', field: '是否国际业务收入标签', width: 100, filter: true },
    {
      headerName: '签单金额 (港币)',
      field: '签单金额(港币)',
      width: 150,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
      cellStyle: { textAlign: 'right' },
      valueFormatter: (params: any) => {
        const val = parseFloat(params.value || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
  ];

  // BR 明细列定义
  const brGridColumns = [
    { headerName: '签约客户名称', field: '签约客户名称', width: 180, filter: true },
    { headerName: '数据月份', field: '数据月份', width: 100, filter: true },
    { headerName: '电路参考编号', field: '电路参考编号', width: 150, filter: true },
    { headerName: '销售单元名称', field: '销售单元中文名称', width: 150, filter: true },
    { headerName: '产品分类', field: '市场经分产品分类', width: 130, filter: true },
    { headerName: '客户经理', field: '客户经理名称', width: 110, filter: true },
    {
      headerName: '分成比例',
      field: '分成比例',
      width: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params: any) => {
        const val = parseFloat(params.value || 0);
        return val.toFixed(4);
      }
    },
    {
      headerName: '港币金额 (绝对值)',
      valueGetter: (params: any) => {
        const rec = params.data || {};
        return rec['拆分后港币金额｜绝对值'] !== undefined
          ? rec['拆分后港币金额｜绝对值']
          : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : Math.abs(parseFloat(rec['拆分后港币金额'] || 0)));
      },
      width: 160,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
      cellStyle: { textAlign: 'right' },
      valueFormatter: (params: any) => {
        const val = parseFloat(params.value || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
  ];

  const handleTcvRowClick = async (customerName: string, year: string) => {
    const modeLabelMap: Record<string, string> = { 'B': 'B端', 'A': 'A端', 'total': 'A+B合计' };
    const modeLabel = modeLabelMap[dataMode] || 'A+B合计';
    setTcvModalTitle(`【${customerName}】${year}年签单合同明细 (TCV) — ${modeLabel}`);
    setTcvModalVisible(true);
    setTcvModalLoading(true);
    try {
      const res = await request(`/api/v1/key-customer-overview/tcv-detail?customerName=${encodeURIComponent(customerName)}&year=${year}&mode=${dataMode}`, {
        method: 'GET'
      });
      setTcvModalData(res || []);
    } catch (err) {
      console.error('获取TCV明细失败:', err);
    } finally {
      setTcvModalLoading(false);
    }
  };

  const handleBrRowClick = async (customerName: string) => {
    setBrModalTitle(`【${customerName}】2026年财务实收计费明细 (BR)`);
    setBrModalVisible(true);
    setBrModalLoading(true);
    try {
      const res = await request(`/api/v1/key-customer-overview/br-detail?customerName=${encodeURIComponent(customerName)}&year=2026`, {
        method: 'GET'
      });
      setBrModalData(res || []);
    } catch (err) {
      console.error('获取BR明细失败:', err);
    } finally {
      setBrModalLoading(false);
    }
  };

  // 按集团中文名进行分支数据分组的计算属性，并且按照分支数量降序排序
  const groupedBranches = React.useMemo(() => {
    if (!branchData || branchData.length === 0) return [];
    const groups: Record<string, any[]> = {};
    branchData.forEach((item: any) => {
      const groupName = item.ultimateNameCn || '未知要客集团';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(item);
    });
    return Object.keys(groups).map(name => ({
      name,
      count: groups[name].length,
      branches: groups[name]
    })).sort((a, b) => b.count - a.count);
  }, [branchData]);

  // 当分组列表发生变化时，默认选中第一个集团
  useEffect(() => {
    if (groupedBranches.length > 0) {
      const exists = groupedBranches.some(g => g.name === selectedGroup);
      if (!exists) {
        setSelectedGroup(groupedBranches[0].name);
      }
    } else {
      setSelectedGroup(null);
    }
  }, [groupedBranches]);

  // 当前选中的要客集团名下的分支数据列表
  const selectedGroupBranches = React.useMemo(() => {
    const matched = groupedBranches.find(g => g.name === selectedGroup);
    return matched ? matched.branches : [];
  }, [groupedBranches, selectedGroup]);

  // AG Grid 列配置，去掉了“注册国家”和“企业性质”，增加了“国内总部”
  const branchAgGridColumns = [
    {
      headerName: '分支公司名称',
      field: 'companyNameCn',
      flex: 1,
      minWidth: 200,
      filter: true,
    },
    {
      headerName: '国内总部',
      field: 'isDomesticUltimate',
      width: 100,
      filter: true,
      valueFormatter: (params: any) => params.value === true || String(params.value).toUpperCase() === 'TRUE' ? '是' : '否'
    },
    {
      headerName: '注册城市',
      field: 'registeredCity',
      width: 120,
      filter: true,
    },
    {
      headerName: '注册地址',
      field: 'registeredAddress',
      flex: 1.5,
      minWidth: 250,
      filter: true,
    }
  ];

  // 点击国家小标签时拉取该国要客分支明细
  const handleCountryClick = async (countryName: string) => {
    setSelectedCountry(countryName);
    setDrawerVisible(true);
    setBranchesLoading(true);
    try {
      const res = await request(`/api/v1/key-customer-overview/country-branches?country=${encodeURIComponent(countryName)}`, {
        method: 'GET'
      });
      setBranchData(res || []);
    } catch (err) {
      console.error('获取国家分支明细失败:', err);
    } finally {
      setBranchesLoading(false);
    }
  };

  // 根据 ultimateGID 对数据进行要客集团中文名称分组以形成树形 Table
  const treeTableData = React.useMemo(() => {
    if (!branchData || branchData.length === 0) return [];

    const groups: Record<string, any> = {};
    branchData.forEach(item => {
      const groupName = item.ultimateNameCn;
      if (!groups[groupName]) {
        groups[groupName] = {
          key: `group-${groupName}`,
          companyNameCn: groupName,
          registeredCountry: '',
          registeredCity: '',
          registeredAddress: '',
          enterpriseNature: '',
          isGroup: true,
          children: []
        };
      }
      groups[groupName].children.push({
        ...item,
        key: item._id
      });
    });

    return Object.values(groups);
  }, [branchData]);

  // 抽屉内表格展示列 (保留以防其他组件有间接类型引用，并加上类型补全)
  const drawerColumns = [
    {
      title: '要客集团 / 海外分支公司名称',
      dataIndex: 'companyNameCn',
      key: 'companyNameCn',
      render: (text: any, record: any) => {
        if (record.isGroup) {
          return <span style={{ color: '#1890ff', fontWeight: 'bold' }}>🏢 {text} ({record.children?.length} 分支)</span>;
        }
        return <span style={{ paddingLeft: '16px' }}>{text}</span>;
      }
    },
    {
      title: '注册国家',
      dataIndex: 'registeredCountry',
      key: 'registeredCountry',
      render: (text: any, record: any) => (record.isGroup ? '' : text)
    },
    {
      title: '注册城市',
      dataIndex: 'registeredCity',
      key: 'registeredCity',
      render: (text: any, record: any) => (record.isGroup ? '' : text)
    },
    {
      title: '注册地址',
      dataIndex: 'registeredAddress',
      key: 'registeredAddress',
      render: (text: any, record: any) => (record.isGroup ? '' : text)
    },
    {
      title: '企业性质',
      dataIndex: 'enterpriseNature',
      key: 'enterpriseNature',
      render: (text: any, record: any) => (record.isGroup ? '' : text)
    }
  ];

  // 获取后端统计指标
  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await request('/api/v1/key-customer-overview/stats', { method: 'GET' });
      setData(res);
    } catch (err) {
      console.error('获取要客总览统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const { quantity = {}, tcv = [], br2026 = [], tcv_A = [], br2026_A = [], tcv2026Total_B = 0, tcv2026Total_A = 0, br2026Total_B = 0, br2026Total_A = 0 } = data || {};

  // --- 根据 dataMode 选择活跃的 TCV/BR/topCustomers 数据源 ---
  // 合并两个行业数组（A端与B端按行业 code 对齐）
  const mergeTcvByIndustry = (listB: any[], listA: any[]) => {
    const indexA = new Map(listA.map((item: any) => [item.code, item]));
    return listB.map((bItem: any) => {
      const aItem = indexA.get(bItem.code) || {};
      return {
        ...bItem,
        '2023': (bItem['2023'] || 0) + (aItem['2023'] || 0),
        '2024': (bItem['2024'] || 0) + (aItem['2024'] || 0),
        '2025': (bItem['2025'] || 0) + (aItem['2025'] || 0),
        '2026': (bItem['2026'] || 0) + (aItem['2026'] || 0),
      };
    });
  };

  const mergeBrByIndustry = (listB: any[], listA: any[]) => {
    const indexA = new Map(listA.map((item: any) => [item.code, item]));
    return listB.map((bItem: any) => {
      const aItem = indexA.get(bItem.code);
      if (!aItem) return bItem;
      // 合并 categories（深度合并）
      const mergedCats: Record<string, Record<string, number>> = {};
      [bItem.categories, aItem.categories].forEach((cats: any) => {
        if (!cats) return;
        Object.keys(cats).forEach(largeCat => {
          if (!mergedCats[largeCat]) mergedCats[largeCat] = {};
          const subMap = cats[largeCat] || {};
          Object.keys(subMap).forEach(subCat => {
            mergedCats[largeCat][subCat] = (mergedCats[largeCat][subCat] || 0) + (subMap[subCat] || 0);
          });
        });
      });
      return { ...bItem, categories: mergedCats };
    });
  };

  const mergeTopCustomers = (listB: any[], listA: any[]) => {
    // 合并两个客户列表，同名客户汇总
    const map = new Map<string, any>();
    [...listB, ...listA].forEach((c: any) => {
      if (!map.has(c.name)) {
        map.set(c.name, { ...c, products: { ...c.products } });
      } else {
        const existing = map.get(c.name)!;
        existing.total += c.total;
        Object.keys(c.products || {}).forEach(p => {
          existing.products[p] = (existing.products[p] || 0) + c.products[p];
        });
      }
    });
    return Array.from(map.values());
  };

  const mergeTcvCustomerStats = (listB: any[], listA: any[]) => {
    const map = new Map<string, any>();
    [...listB, ...listA].forEach((c: any) => {
      const key = `${c.year}_${c.industry}_${c.customerName}`;
      if (!map.has(key)) {
        map.set(key, { ...c });
      } else {
        map.get(key)!.amount += c.amount;
      }
    });
    return Array.from(map.values());
  };

  // 按 dataMode 选择活跃数据集
  const activeTcv: any[] = dataMode === 'B' ? tcv : dataMode === 'A' ? tcv_A : mergeTcvByIndustry(tcv, tcv_A);
  const activeBr2026: any[] = dataMode === 'B' ? br2026 : dataMode === 'A' ? br2026_A : mergeBrByIndustry(br2026, br2026_A);
  const activeTopCustomers: any[] = dataMode === 'B' ? (data?.topCustomers || []) : dataMode === 'A' ? (data?.topCustomers_A || []) : mergeTopCustomers(data?.topCustomers || [], data?.topCustomers_A || []);
  const activeTcvCustomerStats: any[] = dataMode === 'B' ? (data?.tcvCustomerStats || []) : dataMode === 'A' ? (data?.tcvCustomerStats_A || []) : mergeTcvCustomerStats(data?.tcvCustomerStats || [], data?.tcvCustomerStats_A || []);

  // --- 按照每个行业的2026年计费总收入进行倒序排列 ---
  const sortedBr2026 = React.useMemo(() => {
    if (!activeBr2026 || activeBr2026.length === 0) return [];
    return [...activeBr2026].map(item => {
      let sum = 0;
      if (item.categories) {
        Object.keys(item.categories).forEach(k => {
          const subMap = item.categories[k] || {};
          Object.keys(subMap).forEach(sk => { sum += (subMap[sk] || 0); });
        });
      }
      return { ...item, totalIncome: sum };
    }).sort((a, b) => b.totalIncome - a.totalIncome);
  }, [activeBr2026]);

  // --- 联动计算：2026年要客收入top10客户列表（根据 dataMode 切换数据源）---
  const currentTop10Customers = React.useMemo(() => {
    const list = activeTopCustomers;
    const filtered = selectedIndustry
      ? list.filter((item: any) => item.industry === selectedIndustry)
      : list;
    const sorted = [...filtered].sort((a: any, b: any) => b.total - a.total);
    return sorted.slice(0, 10);
  }, [activeTopCustomers, selectedIndustry]);

  // 排行榜展示列定义
  const topCustomerColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      align: 'center' as const,
      render: (text: any, record: any, index: number) => {
        const colors = ['#f5222d', '#fa541c', '#faad14'];
        const bg = index < 3 ? colors[index] : '#f0f0f0';
        const color = index < 3 ? '#fff' : '#666';
        return (
          <span style={{
            display: 'inline-block',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: bg,
            color: color,
            textAlign: 'center',
            lineHeight: '24px',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {index + 1}
          </span>
        );
      }
    },
    {
      title: '要客名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 600, color: '#333' }}>{text}</span>
    },
    {
      title: '2026年计费总收入 (港币)',
      dataIndex: 'total',
      key: 'total',
      align: 'right' as const,
      width: 250,
      render: (text: any) => {
        const formatted = parseFloat(text || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const top1Total = currentTop10Customers[0]?.total || 1;
        const percent = Math.min(((text || 0) / top1Total) * 100, 100);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
            <span style={{ fontWeight: 'bold', color: '#111' }}>{formatted} HKD</span>
            <div style={{ width: '120px', height: '4px', background: '#f5f5f5', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #1890ff, #52c41a)', borderRadius: '2px' }} />
            </div>
          </div>
        );
      }
    },
    {
      title: '主要经分产品构成',
      key: 'products',
      render: (text: any, record: any) => {
        const prods = record.products || {};
        // 按金额降序排序，全部展示
        const sortedProds = Object.keys(prods)
          .map(k => ({ name: k, value: prods[k] }))
          .sort((a, b) => b.value - a.value);

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {sortedProds.map(p => {
              const valFormatted = (p.value / 1000000).toFixed(2);
              return (
                <Tooltip key={p.name} title={`${p.name}: ${p.value.toLocaleString('en-US', { maximumFractionDigits: 2 })} HKD`}>
                  <span style={{
                    background: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    color: '#1890ff',
                    whiteSpace: 'nowrap'
                  }}>
                    {p.name}: <strong>{valFormatted}M</strong>
                  </span>
                </Tooltip>
              );
            })}
          </div>
        );
      }
    }
  ];

  // --- 联动计算：历年签单金额客户 Top 10（根据 dataMode 切换数据源）---
  const currentTcvTop10 = React.useMemo(() => {
    const list = activeTcvCustomerStats;
    const activeIndustry = tcvFilter.industry;
    const filtered = list.filter((item: any) => {
      const matchYear = String(item.year) === String(tcvFilter.year);
      const matchIndustry = activeIndustry ? item.industry === activeIndustry : true;
      return matchYear && matchIndustry;
    });
    const sorted = [...filtered].sort((a: any, b: any) => b.amount - a.amount);
    return sorted.slice(0, 10);
  }, [activeTcvCustomerStats, tcvFilter]);

  const handleResetTcvFilter = () => {
    setTcvFilter({ year: '2026', industry: null });
  };

  const currentTcvIndustryName = React.useMemo(() => {
    const activeIndustry = tcvFilter.industry;
    return activeIndustry ? (INDUSTRY_CN_MAP[activeIndustry] || activeIndustry) : '全行业汇总';
  }, [tcvFilter.industry]);

  const tcvCustomerColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 50,
      align: 'center' as const,
      render: (text: any, record: any, index: number) => {
        const colors = ['#f5222d', '#fa541c', '#faad14'];
        const bg = index < 3 ? colors[index] : '#f0f0f0';
        const color = index < 3 ? '#fff' : '#666';
        return (
          <span style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: bg,
            color: color,
            textAlign: 'center',
            lineHeight: '18px',
            fontWeight: 'bold',
            fontSize: '11px'
          }}>
            {index + 1}
          </span>
        );
      }
    },
    {
      title: '要客名称',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string) => <span style={{ fontWeight: 600, color: '#444', fontSize: '12px' }}>{text}</span>
    },
    {
      title: '签单总额 (港币)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      width: 160,
      render: (text: any) => {
        const formatted = parseFloat(text || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const top1Amount = currentTcvTop10[0]?.amount || 1;
        const percent = Math.min(((text || 0) / top1Amount) * 100, 100);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
            <span style={{ fontWeight: 'bold', color: '#111', fontSize: '11px' }}>{formatted} HKD</span>
            <div style={{ width: '70px', height: '3px', background: '#f5f5f5', borderRadius: '1.5px', marginTop: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #722ed1, #1890ff)', borderRadius: '1.5px' }} />
            </div>
          </div>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', background: '#f5f7fa', minHeight: 'calc(100vh - 160px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin tip="正在计算并组装要客总览多维指标数据..." size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card style={{ margin: 16, textAlign: 'center' }}>
        <div style={{ padding: 40 }}>
          <p>暂无总览统计数据，请重试</p>
          <Button type="primary" onClick={fetchStats}>重新加载</Button>
        </div>
      </Card>
    );
  }

  // --- 联动计算：2026年计费收入构成（全行业或指定行业，使用 activeBr2026 数据源）---
  let combinedBr: Record<string, Record<string, number>> = {
    '通讯服务': {},
    '算力服务': {},
    '智能服务': {}
  };

  if (selectedIndustry) {
    // 过滤出指定行业
    const matched = activeBr2026.find((b: any) => b.code === selectedIndustry);
    if (matched && matched.categories) {
      combinedBr = matched.categories;
    }
  } else {
    // 全行业汇总
    activeBr2026.forEach((item: any) => {
      if (item.categories) {
        Object.keys(item.categories).forEach(largeCat => {
          const subMap = item.categories[largeCat] || {};
          Object.keys(subMap).forEach(subCat => {
            const val = subMap[subCat] || 0;
            if (!combinedBr[largeCat]) {
              combinedBr[largeCat] = {};
            }
            if (!combinedBr[largeCat][subCat]) {
              combinedBr[largeCat][subCat] = 0;
            }
            combinedBr[largeCat][subCat] += val;
          });
        });
      }
    });
  }

  // 计算大类总额及小类排序列表
  const brLargeCategoryTotals: Record<string, number> = { '通讯服务': 0, '算力服务': 0, '智能服务': 0 };
  const brSubCategoryList: { name: string; large: string; value: number }[] = [];

  Object.keys(combinedBr).forEach(largeCat => {
    let sum = 0;
    const subMap = combinedBr[largeCat] || {};
    Object.keys(subMap).forEach(subCat => {
      const val = subMap[subCat] || 0;
      sum += val;
      brSubCategoryList.push({ name: subCat, large: largeCat, value: val });
    });
    brLargeCategoryTotals[largeCat] = sum;
  });

  // 按实收金额绝对值降序排序小类 (为了排名列表好看)
  brSubCategoryList.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const totalBrAmount = brLargeCategoryTotals['通讯服务'] + brLargeCategoryTotals['算力服务'] + brLargeCategoryTotals['智能服务'];

  // --- 联动计算：选中行业的名称显示 ---
  const selectedIndustryName = selectedIndustry ? (INDUSTRY_CN_MAP[selectedIndustry] || selectedIndustry) : '全行业汇总';

  // ==================== TCV 多柱状图计算与渲染 ====================
  // 行业名称X轴简称映射表
  const INDUSTRY_SHORT_NAME: Record<string, string> = {
    '零售连锁与公共服务': '连锁商业',
    '连锁商业与公共服务': '连锁商业',
    '互联网/科技': '互联网',
  };

  // 计算最大签单金额作为 Y 轴上限 (仅针对选中展示年份且未隐藏的行业计算)
  let maxTcvAmount = 0;
  activeTcv.forEach((item: any) => {
    if (hiddenIndustries.includes(item.code)) return; // 排除被隐藏的行业
    tcvDisplayYears.forEach(year => {
      const val = (item[year] || 0) / 1000000; // 转换为百万港币
      if (val > maxTcvAmount) maxTcvAmount = val;
    });
  });
  // 向上取整以美化Y轴刻度
  maxTcvAmount = maxTcvAmount > 0 ? Math.ceil(maxTcvAmount / 10) * 10 : 50;

  // 联动计算：2026年签单与计收总额（A端+B端合计，卡片副标题展示分类）
  const tcv2026B = tcv2026Total_B;
  const tcv2026A = tcv2026Total_A;
  const totalTcv2026 = tcv2026B + tcv2026A;
  const totalTcv2026Formatted = (totalTcv2026 / 1000000).toFixed(2);
  const tcv2026BFormatted = (tcv2026B / 1000000).toFixed(2);
  const tcv2026AFormatted = (tcv2026A / 1000000).toFixed(2);

  const br2026B = br2026Total_B;
  const br2026A = br2026Total_A;
  const totalBr2026 = br2026B + br2026A;
  const totalBr2026Formatted = (totalBr2026 / 1000000).toFixed(2);
  const br2026BFormatted = (br2026B / 1000000).toFixed(2);
  const br2026AFormatted = (br2026A / 1000000).toFixed(2);

  // 年份对应的渐变色和颜色定义
  const YEAR_GRADIENT_MAP: Record<string, { id: string; stops: [string, string]; color: string }> = {
    '2023': { id: 'grad-2023', stops: ['#91d5ff', '#1890ff'], color: '#1890ff' },
    '2024': { id: 'grad-2024', stops: ['#d3adf7', '#722ed1'], color: '#722ed1' },
    '2025': { id: 'grad-2025', stops: ['#adc6ff', '#2f54eb'], color: '#2f54eb' },
    '2026': { id: 'grad-2026', stops: ['#d9f7be', '#52c41a'], color: '#52c41a' },
  };

  return (
    <div style={{ background: '#f5f7fa', padding: '16px' }}>

      {/* 1. 第一行：数目统计卡片（左）与行业分布（右） */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* 左侧第1列：分左右两列堆叠 4 个统计卡片 */}
        <Col xs={24} lg={12}>
          <Row gutter={[16, 16]} style={{ height: '100%' }}>
            {/* 左侧子列：要客总数与分支数 */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 第1行卡片：要客总数与来源分布 */}
              <Card
                bordered={false}
                style={{
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(24,144,255,0.25)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
                bodyStyle={{ width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ opacity: 0.85, fontSize: '13px' }}>要客总数</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: 4 }}>
                      {quantity.totalCustomers || 0} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>家</span>
                    </div>
                  </div>
                  <BankOutlined style={{ fontSize: '32px', opacity: 0.3 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: '11px', opacity: 0.95, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
                  <div style={{ marginTop: 4 }}>
                    <strong>要客渗透率：</strong>
                    {quantity.penetratedCustomersCount || 0} / {quantity.totalCustomers || 0} ({quantity.customerPenetrationRate || '0.00%'})
                  </div>
                  {quantity.sourceStats ? Object.keys(quantity.sourceStats).map(key => (
                    <div key={key} style={{ marginTop: 4 }}>
                      <strong>{key}：</strong>{quantity.sourceStats[key]}家
                    </div>
                  )) : <div style={{ marginTop: 4 }}>无</div>}
                </div>
              </Card>

              {/* 第2行卡片：家族树分支数 */}
              <Card
                bordered={false}
                style={{
                  background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(82,196,26,0.25)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
                bodyStyle={{ width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ opacity: 0.85, fontSize: '13px' }}>家族树分支数</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: 4 }}>
                      {quantity.totalBranches || 0} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>个</span>
                    </div>
                  </div>
                  <PartitionOutlined style={{ fontSize: '32px', opacity: 0.3 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: '11px', opacity: 0.95, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
                  <div>
                    <strong>分支渗透率：</strong>
                    {quantity.penetratedBranchesCount || 0} / {quantity.totalBranches || 0} ({quantity.branchPenetrationRate || '0.00%'})
                  </div>
                  <div style={{ marginTop: 4 }}>
                    含营业网点数: {quantity.siteBranchesCount || 0} 个
                  </div>
                </div>
              </Card>
            </Col>

            {/* 右侧子列：2026签单总额与2026计收总额 */}
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 第3行卡片：2026年签单总额（A端+B端合计） */}
              <Card
                bordered={false}
                style={{
                  background: 'linear-gradient(135deg, #722ed1 0%, #3f1a8c 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(114,46,209,0.25)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
                bodyStyle={{ width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ opacity: 0.85, fontSize: '13px' }}>2026年签单总额</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: 4 }}>
                      {totalTcv2026Formatted} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>M</span>
                    </div>
                  </div>
                  <TransactionOutlined style={{ fontSize: '32px', opacity: 0.3 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: '11px', opacity: 0.95, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
                  <div>B端: <strong>{tcv2026BFormatted} M</strong></div>
                  <div>A端: <strong>{tcv2026AFormatted} M</strong></div>
                </div>
              </Card>

              {/* 第4行卡片：2026年计收总额（A端+B端合计） */}
              <Card
                bordered={false}
                style={{
                  background: 'linear-gradient(135deg, #ff7a45 0%, #d4380d 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(212,56,13,0.25)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
                bodyStyle={{ width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ opacity: 0.85, fontSize: '13px' }}>2026年计收总额</div>
                    <div style={{ fontSize: '26px', fontWeight: 'bold', marginTop: 4 }}>
                      {totalBr2026Formatted} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>M</span>
                    </div>
                  </div>
                  <DashboardOutlined style={{ fontSize: '32px', opacity: 0.3 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: '11px', opacity: 0.95, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>
                  <div>B端: <strong>{br2026BFormatted} M</strong> </div>
                  <div>A端: <strong>{br2026AFormatted} M</strong></div>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 右侧第2列：8大行业要客数与分支数分布 */}
        <Col xs={24} lg={12}>
          <Card title="8大行业要客数与分支数分布" bordered={false} style={{ borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
              {(() => {
                const sortedStats = quantity.industryStats
                  ? [...quantity.industryStats].sort((a, b) => b.branchCount - a.branchCount)
                  : [];
                return sortedStats.map((item: any) => {
                  const total = item.customerCount + item.branchCount;
                  const percent = quantity.totalCustomers + quantity.totalBranches > 0
                    ? (total / (quantity.totalCustomers + quantity.totalBranches)) * 100
                    : 0;
                  return (
                    <div key={item.code} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: 4 }}>
                        <span style={{ fontWeight: '500', color: '#333' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: INDUSTRY_COLORS[item.code] || '#ccc', marginRight: 6 }}></span>
                          {item.nameCn}
                        </span>
                        <span style={{ color: '#666', fontSize: '11.5px' }}>
                          要客: <strong style={{ color: '#111' }}>{item.customerCount}</strong>家 (渗透: <strong style={{ color: '#096dd9' }}>{item.customerPenetrationRate || '0.0%'}</strong>) | 分支: <strong style={{ color: '#111' }}>{item.branchCount}</strong>个 (渗透: <strong style={{ color: '#389e0d' }}>{item.branchPenetrationRate || '0.0%'}</strong>)
                        </span>
                      </div>
                      <Tooltip title={`要客渗透: ${item.penetratedCustomerCount || 0}/${item.customerCount} (${item.customerPenetrationRate || '0.0%'}) | 分支渗透: ${item.penetratedBranchCount || 0}/${item.branchCount} (${item.branchPenetrationRate || '0.0%'}) | 占比: ${percent.toFixed(1)}%`}>
                        <Progress
                          percent={parseFloat(percent.toFixed(1))}
                          strokeColor={INDUSTRY_COLORS[item.code] || '#1890ff'}
                          status="normal"
                          showInfo={false}
                          strokeWidth={6}
                        />
                      </Tooltip>
                    </div>
                  );
                });
              })()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 2. 第二行：海外分支国家/地区分布（3行3列紧凑显示，行内Flex等高） */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="海外分支国家/地区分布" bordered={false} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Europe', 'APAC', 'Americas'],
                ['MENA', 'STA', 'Euro-Asia'],
                ['Mainland China', 'HKM', 'TW']
              ].map((row, rowIdx) => (
                <Row key={rowIdx} gutter={[16, 16]} style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {row.map(region => {
                    const countryMap = (quantity.regionCountryStats && quantity.regionCountryStats[region]) || {};
                    const sortedCountries = Object.keys(countryMap).map(c => ({
                      name: c,
                      count: countryMap[c]
                    })).sort((a, b) => b.count - a.count);

                    const regionTotal = sortedCountries.reduce((sum, curr) => sum + curr.count, 0);

                    return (
                      <Col key={region} span={8} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          background: '#fafafa',
                          borderRadius: 6,
                          padding: '12px 14px',
                          border: '1px solid #f0f0f0',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          flex: 1
                        }}>
                          {/* 区域标题与数量 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #e8e8e8', paddingBottom: 6 }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1890ff' }}>
                              <GlobalOutlined style={{ marginRight: 6 }} />
                              {region}
                            </span>
                            <span style={{ background: '#e6f7ff', color: '#1890ff', padding: '1px 6px', borderRadius: 10, fontSize: '11px', fontWeight: 'bold' }}>
                              {regionTotal} 分支
                            </span>
                          </div>

                          {/* 国家列表小标签（完全展开，自适应拉伸，增加 hover 高亮及点击详情） */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingRight: 4 }}>
                            {sortedCountries.length === 0 ? (
                              <span style={{ color: '#ccc', fontSize: '12px', padding: '4px 0' }}>暂无国家数据</span>
                            ) : (
                              sortedCountries.map(c => (
                                <div
                                  key={c.name}
                                  onClick={() => handleCountryClick(c.name)}
                                  className="country-hover-badge"
                                  style={{
                                    background: '#fff',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span style={{ color: '#666', marginRight: 4 }}>{c.name}</span>
                                  <strong style={{ color: '#1890ff' }}>{c.count}</strong>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. TCV 历年签单多柱状图面板 (SVG 纯手工科技图表 - 双列与点击联动) */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>要客历年签单金额趋势</span>
            <Select
              mode="multiple"
              size="small"
              value={tcvDisplayYears}
              onChange={(vals) => {
                if (vals.length === 0) return; // 至少保留一年
                setTcvDisplayYears(vals);
                // 如果当前联动年份不在选中列表中，重置联动
                if (!vals.includes(tcvFilter.year)) {
                  setTcvFilter({ year: vals[vals.length - 1], industry: null });
                }
              }}
              style={{ minWidth: 200 }}
              options={allTcvYears.map(y => ({ label: `${y}年`, value: y }))}
              maxTagCount={4}
            />
            {/* 数据视角切换：B端国际签单 / A端签单 / A+B合计 */}
            <Select
              size="small"
              value={dataMode}
              onChange={(val) => { setDataMode(val); setTcvFilter({ year: tcvFilter.year, industry: null }); }}
              style={{ minWidth: 130 }}
              options={[
                { label: '🔵 B端', value: 'B' },
                { label: '🟢 A端', value: 'A' },
                { label: '⚪ A+B合计', value: 'total' },
              ]}
            />
          </div>
        }
        extra={<span style={{ fontSize: '12px', color: '#888' }}>单位：百万港币 (M HKD)</span>}
        bordered={false}
        style={{ borderRadius: 8, marginBottom: 16 }}
      >
        <Row gutter={24} style={{ display: 'flex', alignItems: 'stretch' }}>
          <Col xs={24} lg={15} style={{ height: '430px', display: 'flex', flexDirection: 'column' }}>
            {/* 年份图例移至图表上方 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 6 }}>
              {tcvDisplayYears.slice().sort().map(year => {
                const g = YEAR_GRADIENT_MAP[year];
                return (
                  <div key={year} style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: '#666' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 1.5, background: g ? `linear-gradient(${g.stops[0]}, ${g.stops[1]})` : '#ccc', marginRight: 3 }}></span>
                    {year}年
                  </div>
                );
              })}
            </div>
            <div style={{ width: '100%', flex: 1, minHeight: 0, position: 'relative' }}>
              <svg viewBox="0 0 600 295" width="100%" height="100%" style={{ display: 'block', width: '100%', height: '100%' }}>
                <defs>
                  {allTcvYears.map(year => {
                    const g = YEAR_GRADIENT_MAP[year];
                    if (!g) return null;
                    return (
                      <linearGradient key={year} id={g.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={g.stops[0]} />
                        <stop offset="100%" stopColor={g.stops[1]} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* 背景横线与Y轴网格 */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 15 + (240 * (1 - ratio));
                  const val = maxTcvAmount * ratio;
                  return (
                    <g key={idx}>
                      <line x1="46" y1={y} x2="582" y2={y} stroke="#f0f0f0" strokeDasharray="3,3" />
                      <text x="40" y={y + 3.5} textAnchor="end" fontSize="8" fill="#aaa">{val.toFixed(0)}</text>
                    </g>
                  );
                })}

                {/* 渲染柱体（仅展示选中年份，使用 activeTcv 支持视角切换） */}
                {activeTcv.map((item: any, idx: number) => {
                  const sortedYears = tcvDisplayYears.slice().sort();
                  const barWidth = 8;
                  const barGap = 2;
                  const groupWidth = sortedYears.length * (barWidth + barGap) - barGap + 6;
                  const svgWidth = 536; // 可用绘图宽度
                  const groupSpacing = svgWidth / activeTcv.length;
                  const groupX = 48 + (idx * groupSpacing);
                  const isTcvFiltered = tcvFilter.industry !== null;
                  const xAxisLabel = INDUSTRY_SHORT_NAME[item.nameCn] || item.nameCn;
                  const isHidden = hiddenIndustries.includes(item.code);

                  return (
                    <g key={item.code}>
                      {!isHidden && sortedYears.map((year, yIdx) => {
                        const g = YEAR_GRADIENT_MAP[year];
                        if (!g) return null;
                        const barX = groupX + yIdx * (barWidth + barGap);
                        const barH = (((item[year] || 0) / 1000000) / maxTcvAmount) * 240;
                        const barY = 255 - barH;
                        const isActiveBar = tcvFilter.year === year && tcvFilter.industry === item.code;
                        return (
                          <rect
                            key={year}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barH}
                            fill={`url(#${g.id})`}
                            rx="1.5"
                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                            opacity={isTcvFiltered ? (isActiveBar ? 1 : 0.3) : 1}
                            onClick={() => setTcvFilter({ year, industry: item.code })}
                          >
                            <title>{`${year}年 [${item.nameCn}]: ${((item[year] || 0) / 1000000).toFixed(2)} M HKD`}</title>
                          </rect>
                        );
                      })}

                      {/* X 轴行业名称文字（使用简称，点击可切换隐藏状态） */}
                      <text
                        x={groupX + (sortedYears.length * (barWidth + barGap) - barGap) / 2}
                        y="276"
                        textAnchor="middle"
                        fontSize="8"
                        fill={isHidden ? "#d9d9d9" : "#666"}
                        fontWeight={isHidden ? "normal" : "600"}
                        style={{ cursor: 'pointer', userSelect: 'none', transition: 'fill 0.2s' }}
                        onClick={() => {
                          setHiddenIndustries(prev =>
                            prev.includes(item.code)
                              ? prev.filter(c => c !== item.code)
                              : [...prev, item.code]
                          );
                        }}
                      >
                        {xAxisLabel}
                      </text>

                      {/* 行业被隐藏时绘制精细的中划线 */}
                      {isHidden && (
                        <line
                          x1={groupX - 2}
                          y1="273"
                          x2={groupX + (sortedYears.length * (barWidth + barGap) - barGap) + 2}
                          y2="273"
                          stroke="#d9d9d9"
                          strokeWidth="1"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                    </g>
                  );
                })}

                {/* X 轴横线 */}
                <line x1="46" y1="255" x2="582" y2="255" stroke="#d9d9d9" strokeWidth="1" />
              </svg>
            </div>
          </Col>

          <Col xs={24} lg={9} style={{ height: '460px' }}>
            {/* 右列：历年签单客户排行榜 */}
            <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                  🏆 <strong style={{ color: '#722ed1' }}>{tcvFilter.year}年</strong>签单Top 10 —— <strong style={{ color: '#1890ff' }}>{currentTcvIndustryName}</strong>
                </span>
                {(tcvFilter.industry !== null) && (
                  <Button size="small" type="link" onClick={handleResetTcvFilter} style={{ padding: 0, fontSize: '12px' }}>
                    重置图表联动
                  </Button>
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Table
                  dataSource={currentTcvTop10}
                  columns={tcvCustomerColumns}
                  rowKey="customerName"
                  pagination={false}
                  size="middle"
                  style={{ background: '#fff' }}
                  locale={{ emptyText: '当前筛选下暂无签单记录' }}
                  onRow={(record) => ({
                    onClick: () => {
                      handleTcvRowClick(record.customerName, record.year || tcvFilter.year);
                    },
                    style: { cursor: 'pointer' }
                  })}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. 2026计费收入多维看板 (联动设计) */}
      <Row gutter={[16, 16]}>
        {/* 左栏：8大行业 2026 实收额总表 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                8大行业 2026计费收入对比
                <span style={{ marginLeft: 8, fontSize: '11px', fontWeight: 'normal', color: dataMode === 'B' ? '#1890ff' : dataMode === 'A' ? '#52c41a' : '#888' }}>
                  [{dataMode === 'B' ? 'B端国际' : dataMode === 'A' ? 'A端结算' : 'A+B合计'}]
                </span>
              </span>
            }
            extra={<span style={{ fontSize: '12px', color: '#888' }}>点击行以过滤产品类别明细</span>}
            bordered={false}
            style={{ borderRadius: 8, height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 全行业汇总选项 */}
              <div
                onClick={() => setSelectedIndustry(null)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: selectedIndustry === null ? '1px solid #1890ff' : '1px solid transparent',
                  background: selectedIndustry === null ? '#e6f7ff' : '#f8f9fa',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontWeight: 'bold', color: selectedIndustry === null ? '#1890ff' : '#333' }}>
                  💼 全行业汇总
                </span>
                <span style={{ fontWeight: 'bold' }}>
                  {(activeBr2026.reduce((sum: number, item: any) => {
                    let s = 0;
                    if (item.categories) {
                      Object.keys(item.categories).forEach(k => {
                        const subMap = item.categories[k] || {};
                        Object.keys(subMap).forEach(sk => { s += (subMap[sk] || 0); });
                      });
                    }
                    return sum + s;
                  }, 0) / 1000000).toFixed(2)} M HKD
                </span>
              </div>

              {sortedBr2026.map((item: any) => {
                const sum = item.totalIncome;
                const isSelected = selectedIndustry === item.code;

                return (
                  <div
                    key={item.code}
                    onClick={() => setSelectedIndustry(item.code)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #1890ff' : '1px solid #e8e8e8',
                      background: isSelected ? '#e6f7ff' : '#fff',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1890ff' : '#555' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: INDUSTRY_COLORS[item.code] || '#ccc', marginRight: 8 }}></span>
                      {item.nameCn}
                    </span>
                    <strong style={{ color: sum < 0 ? '#ff4d4f' : '#111' }}>
                      {(sum / 1000000).toFixed(2)} M HKD
                    </strong>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* 右栏：产品大类/小类的实收构成看板 (与左栏联动) */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <span>
                2026年产品收入构成分析 —— <strong style={{ color: '#1890ff' }}>{selectedIndustryName}</strong>
              </span>
            }
            bordered={false}
            style={{ borderRadius: 8, height: '100%' }}
          >
            {/* 上部：产品大类占比分布 (现代胶囊彩条占比图) */}
            <div style={{ background: '#fafafa', padding: 16, borderRadius: 6, marginBottom: 16 }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>产品大类收入分布（通讯服务、算力服务、智能服务）</span>
                <strong>总计: {(totalBrAmount / 1000000).toFixed(2)} M HKD</strong>
              </div>

              {/* 胶囊占比条 */}
              <div style={{ height: 16, borderRadius: 8, display: 'flex', overflow: 'hidden', background: '#e8e8e8', marginBottom: 12 }}>
                {['通讯服务', '算力服务', '智能服务'].map((cat, idx) => {
                  const val = brLargeCategoryTotals[cat] || 0;
                  // 计算绝对值的百分比来表示条形占比
                  const totalAbs = Math.abs(brLargeCategoryTotals['通讯服务']) + Math.abs(brLargeCategoryTotals['算力服务']) + Math.abs(brLargeCategoryTotals['智能服务']);
                  const pct = totalAbs > 0 ? (Math.abs(val) / totalAbs) * 100 : 0;

                  const colors: Record<string, string> = { '通讯服务': '#1890ff', '算力服务': '#722ed1', '智能服务': '#52c41a' };
                  if (pct === 0) return null;
                  return (
                    <div
                      key={cat}
                      style={{
                        width: `${pct}%`,
                        background: colors[cat],
                        height: '100%',
                        transition: 'all 0.3s'
                      }}
                      title={`${cat}: ${(val / 1000000).toFixed(2)} M HKD`}
                    />
                  );
                })}
              </div>

              {/* 三大类明细值与色块图例 */}
              <Row gutter={8}>
                {[
                  { name: '通讯服务', color: '#1890ff' },
                  { name: '算力服务', color: '#722ed1' },
                  { name: '智能服务', color: '#52c41a' }
                ].map(item => {
                  const val = brLargeCategoryTotals[item.name] || 0;
                  return (
                    <Col span={8} key={item.name} style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color, marginRight: 6 }}></span>
                      <span style={{ color: '#555', fontSize: '12px' }}>{item.name}</span>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: 2, color: val < 0 ? '#ff4d4f' : '#111' }}>
                        {(val / 1000000).toFixed(2)} M
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>

            {/* 下部：产品小类计费明细排行列表 */}
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
              产品细分类别计费明细排行 (港币/M HKD)
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {brSubCategoryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#888' }}>暂无详细产品明细</div>
              ) : (
                <List
                  size="small"
                  dataSource={brSubCategoryList}
                  renderItem={(item, index) => {
                    const colors: Record<string, string> = { '通讯服务': '#1890ff', '算力服务': '#722ed1', '智能服务': '#52c41a' };
                    return (
                      <List.Item style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: '#f0f0f0', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', color: '#666' }}>
                              {index + 1}
                            </span>
                            <span style={{ background: colors[item.large] || '#d9d9d9', color: '#fff', fontSize: '10px', padding: '1px 5px', borderRadius: 3 }}>
                              {item.large}
                            </span>
                            <span style={{ color: '#444', fontWeight: '500' }}>{item.name}</span>
                          </span>
                          <strong style={{ color: item.value < 0 ? '#ff4d4f' : '#111' }}>
                            {(item.value / 1000000).toFixed(4)} M
                          </strong>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <style>{`
        .country-hover-badge:hover {
          border-color: #1890ff !important;
          background-color: #e6f7ff !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(24,144,255,0.15) !important;
        }
        .tristan-group-row {
          background-color: #f7f9fc !important;
        }
        .tristan-group-row td {
          font-weight: bold;
          background-color: #f7f9fc !important;
        }
      `}</style>

      {/* 5. 2026年要客计费收入排行榜 (Top 10) */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              🏆 2026年要客计费收入排行榜 (Top 10) —— <strong style={{ color: '#1890ff' }}>{selectedIndustryName}</strong>
            </span>
            <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>
              实时联动统计
            </span>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 8, marginTop: 16 }}
      >
        <Table
          dataSource={currentTop10Customers}
          columns={topCustomerColumns}
          rowKey="name"
          pagination={false}
          size="middle"
          style={{ background: '#fff' }}
          onRow={(record) => ({
            onClick: () => {
              handleBrRowClick(record.name);
            },
            style: { cursor: 'pointer' }
          })}
        />
      </Card>

      {/* 国家海外分支机构明细展示抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlobalOutlined style={{ color: '#1890ff' }} />
            <span>【{selectedCountry}】要客海外分支机构明细</span>
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={900}
        bodyStyle={{ padding: '20px', background: '#f5f7fa' }}
      >
        {branchesLoading ? (
          <div style={{ padding: '100px 0', textAlign: 'center' }}>
            <Spin tip="正在读取并关联要客海外分支数据..." size="large" />
          </div>
        ) : branchData.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: '#999' }}>
            该国家暂无要客分支数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 上部：使用带搜索功能的下拉框（Select）显示要客集团列表 */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 16 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: 10 }}>选择要客集团 (可输入拼音/中文搜索)：</div>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="请输入集团名称进行检索"
                optionFilterProp="children"
                value={selectedGroup || undefined}
                onChange={(val) => setSelectedGroup(val)}
                filterOption={(input, option) => {
                  const nameStr = String(option?.value || '').toLowerCase();
                  return nameStr.includes(input.toLowerCase());
                }}
                popupClassName="keycustomer-drawer-select-popup"
              >
                {groupedBranches.map(group => (
                  <Select.Option key={group.name} value={group.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500, color: '#333' }}>🏢 {group.name}</span>
                      <span style={{ fontSize: '12px', color: '#1677ff', background: '#e6f7ff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                        {group.count} 分支
                      </span>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>

            {/* 下部：以 AG Grid 的方式显示分支信息 */}
            <div style={{
              background: '#fff',
              padding: '16px',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              flex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                  分支机构列表 —— <strong style={{ color: '#1890ff' }}>{selectedGroup}</strong> (共 {selectedGroupBranches.length} 个分支)
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }} className="ag-theme-quartz">
                <AgGridReact
                  rowData={selectedGroupBranches}
                  columnDefs={branchAgGridColumns}
                  defaultColDef={{
                    resizable: true,
                    sortable: true,
                    filter: true,
                    wrapHeaderText: true,
                    autoHeaderHeight: true,
                  }}
                  getRowStyle={(params: any) => {
                    const val = params.data?.isDomesticUltimate;
                    if (val === true || String(val).toUpperCase() === 'TRUE') {
                      return { backgroundColor: '#fff1f0' }; // 浅红色
                    }
                    return undefined;
                  }}
                  theme={themeQuartz}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* TCV 签单合同明细 Modal */}
      <Modal
        title={tcvModalTitle}
        open={tcvModalVisible}
        onCancel={() => setTcvModalVisible(false)}
        footer={null}
        width={1300}
        destroyOnClose
        bodyStyle={{ height: '600px', display: 'flex', flexDirection: 'column', padding: '16px' }}
      >
        {tcvModalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Spin tip="正在读取并装载签约合同明细 (TCV) 数据..." size="large" />
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ flex: 1, width: '100%' }}>
            <AgGridReact
              rowData={tcvModalData}
              columnDefs={tcvGridColumns}
              defaultColDef={{
                resizable: true,
                sortable: true,
              }}
              enableRangeSelection={true}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              theme={themeQuartz}
            />
          </div>
        )}
      </Modal>

      {/* BR 财务计费明细 Modal */}
      <Modal
        title={brModalTitle}
        open={brModalVisible}
        onCancel={() => setBrModalVisible(false)}
        footer={null}
        width={1200}
        destroyOnClose
        bodyStyle={{ height: '600px', display: 'flex', flexDirection: 'column', padding: '16px' }}
      >
        {brModalLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Spin tip="正在读取并装载财务计费明细 (BR) 数据..." size="large" />
          </div>
        ) : (
          <div className="ag-theme-quartz" style={{ flex: 1, width: '100%' }}>
            <AgGridReact
              rowData={brModalData}
              columnDefs={brGridColumns}
              defaultColDef={{
                resizable: true,
                sortable: true,
              }}
              enableRangeSelection={true}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              animateRows={true}
              theme={themeQuartz}
            />
          </div>
        )}
      </Modal>

    </div>
  );
};

export default KeyCustomerOverview;
