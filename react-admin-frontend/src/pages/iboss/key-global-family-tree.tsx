import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useLocation, request, history } from '@umijs/max';
import { Spin, message, Button, Input, Space, Tag, Tabs, Drawer, Descriptions, Tooltip } from 'antd';
import {
  ExpandAltOutlined,
  ShrinkOutlined,
  BranchesOutlined,
  CompressOutlined,
  SearchOutlined,
  ApartmentOutlined,
  PartitionOutlined,
  TableOutlined,
  SwapOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import * as d3 from 'd3';
// @ts-ignore
import { OrgChart } from 'd3-org-chart';
import { renderToString } from 'react-dom/server';
import Flag from 'react-world-flags';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// ============ 国家映射与工具函数 ============

const COUNTRY_MAP: Record<string, string> = {
  'china': 'cn', 'united states': 'us', 'usa': 'us', 'hong kong': 'hk',
  'cayman islands': 'ky', 'virgin islands, british': 'vg', 'british virgin islands': 'vg',
  'singapore': 'sg', 'japan': 'jp', 'uk': 'gb', 'united kingdom': 'gb', 'australia': 'au',
  'canada': 'ca', 'germany': 'de', 'france': 'fr', 'india': 'in', 'kazakhstan': 'kz',
  'iraq': 'iq', 'united arab emirates': 'ae', 'uae': 'ae', 'russia': 'ru', 'russian federation': 'ru',
  'peru': 'pe', 'indonesia': 'id', 'brazil': 'br', 'netherlands': 'nl', 'macau': 'mo',
  'taiwan': 'tw', 'switzerland': 'ch', 'bermuda': 'bm', 'panama': 'pa', 'malaysia': 'my',
  'south africa': 'za', 'korea': 'kr', 'south korea': 'kr', 'republic of korea': 'kr',
  'north korea': 'kp', 'thailand': 'th', 'vietnam': 'vn', 'viet nam': 'vn',
  'philippines': 'ph', 'new zealand': 'nz', 'mexico': 'mx', 'italy': 'it', 'spain': 'es',
  'portugal': 'pt', 'sweden': 'se', 'norway': 'no', 'denmark': 'dk', 'finland': 'fi',
  'ireland': 'ie', 'belgium': 'be', 'austria': 'at', 'poland': 'pl', 'czech republic': 'cz',
  'czechia': 'cz', 'hungary': 'hu', 'romania': 'ro', 'greece': 'gr', 'turkey': 'tr',
  'turkiye': 'tr', 'egypt': 'eg', 'saudi arabia': 'sa', 'qatar': 'qa', 'kuwait': 'kw',
  'bahrain': 'bh', 'oman': 'om', 'jordan': 'jo', 'lebanon': 'lb', 'israel': 'il',
  'pakistan': 'pk', 'bangladesh': 'bd', 'sri lanka': 'lk', 'myanmar': 'mm', 'cambodia': 'kh',
  'laos': 'la', 'mongolia': 'mn', 'nepal': 'np', 'afghanistan': 'af',
  'nigeria': 'ng', 'kenya': 'ke', 'ethiopia': 'et', 'ghana': 'gh', 'tanzania': 'tz',
  'morocco': 'ma', 'algeria': 'dz', 'tunisia': 'tn', 'libya': 'ly', 'sudan': 'sd',
  'angola': 'ao', 'mozambique': 'mz', 'zambia': 'zm', 'zimbabwe': 'zw', 'uganda': 'ug',
  'colombia': 'co', 'argentina': 'ar', 'chile': 'cl', 'venezuela': 've', 'ecuador': 'ec',
  'bolivia': 'bo', 'uruguay': 'uy', 'paraguay': 'py', 'costa rica': 'cr', 'cuba': 'cu',
  'trinidad and tobago': 'tt', 'jamaica': 'jm', 'bahamas': 'bs', 'barbados': 'bb',
  'luxembourg': 'lu', 'malta': 'mt', 'cyprus': 'cy', 'iceland': 'is', 'croatia': 'hr',
  'serbia': 'rs', 'bulgaria': 'bg', 'slovakia': 'sk', 'slovenia': 'si', 'lithuania': 'lt',
  'latvia': 'lv', 'estonia': 'ee', 'ukraine': 'ua', 'belarus': 'by', 'georgia': 'ge',
  'armenia': 'am', 'azerbaijan': 'az', 'uzbekistan': 'uz', 'turkmenistan': 'tm',
  'tajikistan': 'tj', 'kyrgyzstan': 'kg', 'fiji': 'fj', 'papua new guinea': 'pg',
  'isle of man': 'im', 'jersey': 'je', 'guernsey': 'gg', 'liechtenstein': 'li',
  'monaco': 'mc', 'andorra': 'ad', 'san marino': 'sm', 'curacao': 'cw',
  'aruba': 'aw', 'mauritius': 'mu', 'madagascar': 'mg', 'senegal': 'sn',
};

const getCountryCode = (country: string): string => {
  if (!country) return '';
  const key = country.toLowerCase().trim();
  if (COUNTRY_MAP[key]) return COUNTRY_MAP[key];
  for (const [name, code] of Object.entries(COUNTRY_MAP)) {
    if (key.includes(name) || name.includes(key)) return code;
  }
  return '';
};

const getFlagHtml = (countryCode: string): string => {
  if (!countryCode) return '';
  return renderToString(
    <Flag code={countryCode} style={{ marginLeft: 20, borderRadius: '100px', width: 40, height: 40, objectFit: 'cover' }} />,
  );
};

const DEFAULT_AVATAR = '<img src="https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png" style="margin-left:20px;border-radius:100px;width:40px;height:40px;object-fit:cover;" />';

const iconBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 6,
  background: '#fff',
  border: '1px solid #d9d9d9',
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
};

// 抽屉中隐藏字段
const HIDDEN_FIELDS = new Set(['_id', 'id', 'parentId', 'iconHtml', '_nodeType', '_highlighted', '_upToTheRootHighlighted', '_expanded', '_directSubordinates', '_totalSubordinates']);

// 区域分组
const REGION_MAP: Record<string, string> = {
  'cn': 'Asia Pacific', 'hk': 'Asia Pacific', 'mo': 'Asia Pacific', 'tw': 'Asia Pacific',
  'jp': 'Asia Pacific', 'kr': 'Asia Pacific', 'sg': 'Asia Pacific', 'my': 'Asia Pacific',
  'th': 'Asia Pacific', 'vn': 'Asia Pacific', 'ph': 'Asia Pacific', 'id': 'Asia Pacific',
  'in': 'Asia Pacific', 'au': 'Asia Pacific', 'nz': 'Asia Pacific', 'bd': 'Asia Pacific',
  'pk': 'Asia Pacific', 'lk': 'Asia Pacific', 'mm': 'Asia Pacific', 'kh': 'Asia Pacific',
  'la': 'Asia Pacific', 'mn': 'Asia Pacific', 'np': 'Asia Pacific', 'fj': 'Asia Pacific',
  'pg': 'Asia Pacific', 'af': 'Asia Pacific', 'kz': 'Central Asia',
  'uz': 'Central Asia', 'tm': 'Central Asia', 'tj': 'Central Asia', 'kg': 'Central Asia',
  'us': 'North America', 'ca': 'North America', 'mx': 'North America',
  'gb': 'Europe', 'de': 'Europe', 'fr': 'Europe', 'it': 'Europe', 'es': 'Europe',
  'pt': 'Europe', 'nl': 'Europe', 'be': 'Europe', 'ch': 'Europe', 'at': 'Europe',
  'se': 'Europe', 'no': 'Europe', 'dk': 'Europe', 'fi': 'Europe', 'ie': 'Europe',
  'pl': 'Europe', 'cz': 'Europe', 'hu': 'Europe', 'ro': 'Europe', 'gr': 'Europe',
  'hr': 'Europe', 'rs': 'Europe', 'bg': 'Europe', 'sk': 'Europe', 'si': 'Europe',
  'lt': 'Europe', 'lv': 'Europe', 'ee': 'Europe', 'lu': 'Europe', 'mt': 'Europe',
  'cy': 'Europe', 'is': 'Europe', 'li': 'Europe', 'mc': 'Europe', 'ad': 'Europe',
  'sm': 'Europe', 'im': 'Europe', 'je': 'Europe', 'gg': 'Europe',
  'ru': 'Europe', 'ua': 'Europe', 'by': 'Europe', 'tr': 'Europe',
  'br': 'South America', 'ar': 'South America', 'cl': 'South America', 'co': 'South America',
  've': 'South America', 'pe': 'South America', 'ec': 'South America', 'bo': 'South America',
  'uy': 'South America', 'py': 'South America', 'cr': 'Central America & Caribbean',
  'cu': 'Central America & Caribbean', 'pa': 'Central America & Caribbean',
  'tt': 'Central America & Caribbean', 'jm': 'Central America & Caribbean',
  'bs': 'Central America & Caribbean', 'bb': 'Central America & Caribbean',
  'ky': 'Central America & Caribbean', 'vg': 'Central America & Caribbean',
  'bm': 'Central America & Caribbean', 'aw': 'Central America & Caribbean', 'cw': 'Central America & Caribbean',
  'ae': 'Middle East', 'sa': 'Middle East', 'qa': 'Middle East', 'kw': 'Middle East',
  'bh': 'Middle East', 'om': 'Middle East', 'jo': 'Middle East', 'lb': 'Middle East',
  'il': 'Middle East', 'iq': 'Middle East', 'ge': 'Middle East', 'am': 'Middle East', 'az': 'Middle East',
  'eg': 'Africa', 'ng': 'Africa', 'ke': 'Africa', 'et': 'Africa', 'gh': 'Africa',
  'tz': 'Africa', 'za': 'Africa', 'ma': 'Africa', 'dz': 'Africa', 'tn': 'Africa',
  'ly': 'Africa', 'sd': 'Africa', 'ao': 'Africa', 'mz': 'Africa', 'zm': 'Africa',
  'zw': 'Africa', 'ug': 'Africa', 'mu': 'Africa', 'mg': 'Africa', 'sn': 'Africa',
};

const getRegion = (country: string): string => {
  const code = getCountryCode(country);
  return REGION_MAP[code] || 'Other Regions';
};

// ============ 区域分组树构建 （根 → 区域 → 国家 → 城市 → 公司） ============
const buildRegionData = (originalData: any[]): any[] => {
  const rootNode = originalData.find((d) => d.parentId === '');
  if (!rootNode) return originalData;

  const regionNodes: any[] = [];
  const rootId = rootNode.id;

  regionNodes.push({
    id: rootId, parentId: '', name: rootNode.name,
    position: rootNode.position, city: rootNode.city,
    iconHtml: rootNode.iconHtml, _nodeType: 'root',
  });

  const regionCountryMap: Record<string, Record<string, any[]>> = {};
  originalData.forEach((item) => {
    if (item.id === rootId) return;
    const country = item.position || 'Unknown';
    const region = getRegion(country);
    if (!regionCountryMap[region]) regionCountryMap[region] = {};
    if (!regionCountryMap[region][country]) regionCountryMap[region][country] = [];
    regionCountryMap[region][country].push(item);
  });

  Object.keys(regionCountryMap).sort().forEach((region) => {
    const regionId = `__region__${region}`;
    regionNodes.push({
      id: regionId, parentId: rootId, name: region,
      position: '', city: '', iconHtml: '', _nodeType: 'region',
    });

    Object.keys(regionCountryMap[region]).sort().forEach((country) => {
      const countryId = `__country__${country}`;
      const code = getCountryCode(country);
      const flagHtml = code ? getFlagHtml(code) : DEFAULT_AVATAR;

      regionNodes.push({
        id: countryId, parentId: regionId, name: country,
        position: '', city: '', iconHtml: flagHtml, _nodeType: 'country',
      });

      const cityGroups: Record<string, any[]> = {};
      regionCountryMap[region][country].forEach((item) => {
        const city = item.city || 'Unknown';
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(item);
      });

      Object.keys(cityGroups).sort().forEach((city) => {
        const cityId = `__city__${country}__${city}`;
        regionNodes.push({
          id: cityId, parentId: countryId, name: city,
          position: '', city: '', iconHtml: '', _nodeType: 'city',
        });

        cityGroups[city].forEach((company) => {
          regionNodes.push({
            id: company.id, parentId: cityId, name: company.name,
            position: company.registeredAddress || company.position || '',
            city: '', iconHtml: '', _nodeType: 'company',
          });
        });
      });
    });
  });

  return regionNodes;
};

// ============ D3 节点渲染模板 ============
const renderNodeContent = (d: any) => {
  const imageDiffVert = 25 + 2;
  const nodeType = d.data._nodeType || '';
  const borderStyle = d.data._highlighted || d.data._upToTheRootHighlighted ? '5px solid #1677ff' : '1px solid #E4E2E9';

  // 根节点
  if (nodeType === 'root') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fff1f0;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;">
          <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
          <div style="background-color:#fff1f0;margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
          <div style="font-size:14px;font-weight:600;color:#a8071a;margin-left:20px;margin-right:20px;margin-top:5px;line-height:1.3;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:38px;" title="${d.data.name}">
            ${d.data.name}
          </div>
          ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;">${d.data.position}</div>` : ''}
          ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
        </div>
      </div>`;
  }

  // 区域节点
  if (nodeType === 'region') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fffbe6;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:16px;font-weight:700;color:#ad6800;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
        </div>
      </div>`;
  }

  // 国家节点
  if (nodeType === 'country') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#e6f4ff;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="margin-bottom:6px;">${d.data.iconHtml}</div>
          <div style="font-size:16px;font-weight:600;color:#003a8c;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
        </div>
      </div>`;
  }

  // 城市节点
  if (nodeType === 'city') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#f6ffed;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:16px;font-weight:600;color:#237804;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
        </div>
      </div>`;
  }

  const color = '#FFFFFF';
  const showIcon = !nodeType;

  return `
    <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
      <div style="font-family:'Inter',sans-serif;background-color:${color};margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;">
        <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
        ${showIcon ? `
          <div style="background-color:${color};margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
        ` : ''}
        <div style="font-size:13px;color:#08011E;margin-left:20px;margin-right:20px;margin-top:${showIcon ? '5' : '10'}px;line-height:1.3;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:38px;" title="${d.data.name}">
          ${d.data.name}
        </div>
        ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:${d.width - 40}px;" title="${d.data.position}">${d.data.position}</div>` : ''}
        ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
      </div>
    </div>`;
};

// ============ 详情 Drawer 组件 ============
const DetailDrawer: React.FC<{ record: any; open: boolean; onClose: () => void }> = ({ record, open, onClose }) => {
  if (!record) return null;

  const displayFields = Object.entries(record).filter(
    ([key]) => !HIDDEN_FIELDS.has(key) && !key.startsWith('_'),
  );

  const title = record.companyNameCn || record.name || record.id || '公司详情';
  const countryCode = getCountryCode(record.registeredCountry || record.position || '');

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {countryCode && <Flag code={countryCode} style={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 2 }} />}
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
        </div>
      }
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
    >
      <Descriptions
        column={1}
        bordered
        size="small"
        labelStyle={{ fontWeight: 500, width: 180, backgroundColor: '#fafafa' }}
        contentStyle={{ wordBreak: 'break-word' }}
      >
        {displayFields.map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {value !== null && value !== undefined && String(value) !== '' ? (
              typeof value === 'object' ? (
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                String(value)
              )
            ) : (
              <span style={{ color: '#ccc' }}>—</span>
            )}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Drawer>
  );
};

// ============ 主组件 ============
const KeyGlobalFamilyTree: React.FC = () => {
  const params = useParams<{ gid: string }>();
  const location = useLocation();
  const { gid } = params;

  // 从 URL 携带的 query 参数中读取名中文名和缩写
  const { nameCn, abbr } = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    return {
      nameCn: sp.get('nameCn') || '',
      abbr: sp.get('abbr') || '',
    };
  }, [location.search]);

  const [originalData, setOriginalData] = useState<any[]>([]);
  const [isRegionView, setIsRegionView] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tree');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState<any>(null);
  const [tableSearchText, setTableSearchText] = useState('');

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // 打开抽屉
  const openDrawer = useCallback((record: any) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  }, []);

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!gid) return;
    setLoading(true);
    try {
      const res = await request('/api/v1/wildcards/keyGlobalFamilyTree', {
        method: 'GET',
        params: {
          query: JSON.stringify({ ultimateGID: gid }),
        },
      });

      const rawRecords = res.results || res.data?.results || [];

      // 提取唯一的节点 ID
      const uniqueMap = new Map();
      rawRecords.forEach((item: any) => {
        let idVal = item.GID;
        if (idVal !== undefined && idVal !== null) {
          idVal = String(idVal).trim();
          item.GID = idVal;
          item.parentGID = item.parentGID ? String(item.parentGID).trim() : '';
          if (idVal !== '' && !uniqueMap.has(idVal)) {
            uniqueMap.set(idVal, item);
          }
        }
      });
      const uniqueRecords = Array.from(uniqueMap.values());
      const allIds = new Set(uniqueRecords.map((r: any) => r.GID));

      // 计算根节点
      let mainRootId: string = '';
      for (const r of uniqueRecords) {
        const pid = r.parentGID;
        if (!pid || pid === r.GID || !allIds.has(pid)) {
          mainRootId = r.GID;
          break;
        }
      }
      if (!mainRootId && uniqueRecords.length > 0) {
        mainRootId = uniqueRecords[0].GID;
      }

      let rootAssigned = false;
      const mappedData = uniqueRecords.map((item: any) => {
        let pId = item.parentGID;

        if (!pId || pId === item.GID || !allIds.has(pId)) {
          if (!rootAssigned && item.GID === mainRootId) {
            pId = '';
            rootAssigned = true;
          } else {
            pId = mainRootId;
          }
        }

        const country = item.registeredCountry || item.position || '';
        const city = item.registeredCity || item.city || '';
        const code = getCountryCode(country);
        const iconHtml = code ? getFlagHtml(code) : DEFAULT_AVATAR;

        return {
          ...item,
          id: item.GID,
          parentId: pId,
          name: item.companyNameCn || item.companyNameEn || item.GID,
          position: country,
          city,
          iconHtml,
          _nodeType: pId === '' ? 'root' : '',
        };
      });

      setOriginalData(mappedData);
    } catch (err) {
      console.error('获取要客海外家族树数据失败', err);
      message.error('获取家族树数据失败');
    } finally {
      setLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 渲染图表
  const renderChart = useCallback(
    (chartData: any[]) => {
      if (chartData.length === 0 || !chartContainerRef.current) return;
      if (!chartRef.current) {
        chartRef.current = new OrgChart();
      }
      const chart = chartRef.current;
      chart
        .container(chartContainerRef.current)
        .data(chartData)
        .nodeHeight(() => 115 + 25)
        .nodeWidth(() => 280 + 2)
        .childrenMargin(() => 50)
        .compactMarginBetween(() => 35)
        .compactMarginPair(() => 30)
        .neighbourMargin(() => 20)
        .nodeContent(renderNodeContent)
        .onNodeClick((d: any) => {
          const nodeData = d.data || d;
          if (nodeData._nodeType === 'country' || nodeData._nodeType === 'city') return;
          const fullRecord = originalData.find((item) => item.id === nodeData.id);
          if (fullRecord) openDrawer(fullRecord);
        })
        .render()
        .fit();
    },
    [originalData, openDrawer],
  );

  // 树图重新渲染
  useEffect(() => {
    if (originalData.length === 0 || activeTab !== 'tree') return;
    const chartData = isRegionView ? buildRegionData(originalData) : originalData;
    const timer = setTimeout(() => renderChart(chartData), 100);
    return () => clearTimeout(timer);
  }, [originalData, isRegionView, renderChart, activeTab]);

  const toggleRegionView = () => setIsRegionView((prev) => !prev);

  // 树内搜索
  const handleSearchTree = (value: string) => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    chart.clearHighlighting();
    const chartData = chart.data();
    chartData.forEach((d: any) => (d._expanded = false));
    const keyword = value.toLowerCase();
    chartData.forEach((d: any) => {
      if (
        keyword !== '' &&
        (d.name?.toLowerCase().includes(keyword) ||
          d.position?.toLowerCase().includes(keyword) ||
          d.city?.toLowerCase().includes(keyword) ||
          d.id?.toLowerCase().includes(keyword))
      ) {
        d._highlighted = true;
        d._expanded = true;
      }
    });
    chart.data(chartData).render().fit();
  };

  // ============ AG Grid 列定义 ============
  const dynamicColDefs = useMemo(() => {
    if (originalData.length === 0) return [];
    
    // 动态提取所有的 key
    const allKeys = new Set<string>();
    originalData.forEach((record: any) => {
      Object.keys(record).forEach((key) => allKeys.add(key));
    });

    // 常用字段排在最前面
    const priorityFields = ['companyNameCn', 'companyNameEn', 'GID', 'parentGID', 'ultimateName', 'treeLevel', 'registeredCountry', 'registeredCity', 'operatingStatus'];
    
    const fieldsArray = Array.from(allKeys).filter(
      (key) => !HIDDEN_FIELDS.has(key) && !key.startsWith('_'),
    );

    // 重新排序
    fieldsArray.sort((a, b) => {
      const indexA = priorityFields.indexOf(a);
      const indexB = priorityFields.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return fieldsArray.map((key) => {
      const colDef: any = {
        headerName: key,
        field: key,
        filter: true,
        sortable: true,
        resizable: true,
      };

      if (key === 'companyNameCn') {
        colDef.headerName = '公司中文名 (companyNameCn)';
        colDef.pinned = 'left';
        colDef.width = 280;
        colDef.cellRenderer = (p: any) => (
          <a onClick={() => openDrawer(p.data)} style={{ fontWeight: 500, textDecoration: 'underline' }}>
            {p.value}
          </a>
        );
      } else if (key === 'companyNameEn') {
        colDef.headerName = '公司英文名';
        colDef.width = 280;
      } else if (key === 'GID') {
        colDef.headerName = 'GID';
        colDef.width = 180;
      } else if (key === 'parentGID') {
        colDef.headerName = '父级 GID';
        colDef.width = 180;
      } else if (key === 'registeredCountry') {
        colDef.headerName = '注册国家';
        colDef.width = 140;
      } else if (key === 'registeredCity') {
        colDef.headerName = '注册城市';
        colDef.width = 140;
      } else if (key === 'treeLevel') {
        colDef.headerName = '层级';
        colDef.width = 80;
      }

      return colDef;
    });
  }, [originalData, openDrawer]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

  // 导出 JSON
  const handleExportJson = useCallback(() => {
    if (originalData.length === 0) return;
    const fileName = `keyGlobalFamilyTree-${abbr || 'CN'}-${gid}`;
    const cleanExport = originalData.map(({ id: rid, parentId: rpid, iconHtml, name: rname, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(cleanExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${cleanExport.length} 条数据`);
  }, [originalData, gid, abbr]);

  const pageTitle = nameCn ? `「${nameCn}」要客海外家族树` : '要客海外家族树';

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
      {/* 顶部标题区域 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center">
          <Button icon={<SwapOutlined style={{ transform: 'rotate(180deg)' }} />} onClick={() => history.back()}>
            返回要客清单
          </Button>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            {pageTitle}
          </h2>
          {gid && (
            <Tag color="blue" style={{ fontSize: 13 }}>
              Root GID: {gid}
            </Tag>
          )}
          {!loading && originalData.length > 0 && (
            <Tag color="green">节点总数: {originalData.length}</Tag>
          )}
        </Space>
      </div>

      {/* 主体 Tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          tabBarStyle={{ marginBottom: 12 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          items={[
            {
              key: 'tree',
              label: (
                <span><PartitionOutlined style={{ marginRight: 6 }} />结构树</span>
              ),
              children: (
                <div style={{ position: 'relative', height: '100%' }}>
                  {/* 浮动工具栏 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12, right: 16, zIndex: 10,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Input
                      placeholder="搜索节点..."
                      allowClear
                      prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                      onChange={(e) => handleSearchTree(e.target.value)}
                      style={{ width: 200, height: 32 }}
                    />
                    <Tooltip title={isExpanded ? '折叠全部' : '展开全部'}>
                      <div
                        onClick={() => {
                          if (isExpanded) {
                            chartRef.current?.collapseAll().fit();
                          } else {
                            chartRef.current?.expandAll().render();
                            // 以根节点垂直中轴为中心，根节点定位到顶部
                            setTimeout(() => {
                              const svgEl = chartContainerRef.current?.querySelector('svg');
                              const container = chartContainerRef.current;
                              if (svgEl && container && chartRef.current) {
                                const rootGroup = svgEl.querySelector('.node');
                                if (rootGroup) {
                                  const rootBox = (rootGroup as SVGGraphicsElement).getBBox();
                                  const containerRect = container.getBoundingClientRect();
                                  const scale = 0.5;
                                  const translateX = (containerRect.width / 2) - (rootBox.x + rootBox.width / 2) * scale;
                                  const translateY = 30 - rootBox.y * scale;
                                  const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
                                  const zoom = d3.zoom().on('zoom', (event: any) => {
                                    d3.select(svgEl).select('.chart').attr('transform', event.transform);
                                  });
                                  d3.select(svgEl).transition().duration(600).call(zoom.transform as any, transform);
                                }
                              }
                            }, 300);
                          }
                          setIsExpanded(!isExpanded);
                        }}
                        style={iconBtnStyle}
                      >
                        {isExpanded ? <ShrinkOutlined style={{ fontSize: 16 }} /> : <ExpandAltOutlined style={{ fontSize: 16 }} />}
                      </div>
                    </Tooltip>
                    <Tooltip title={isCompact ? '水平模式' : '紧凑树模式'}>
                      <div
                        onClick={() => {
                          chartRef.current?.compact(!isCompact).render().fit();
                          setIsCompact(!isCompact);
                        }}
                        style={iconBtnStyle}
                      >
                        {isCompact ? <BranchesOutlined style={{ fontSize: 16 }} /> : <CompressOutlined style={{ fontSize: 16 }} />}
                      </div>
                    </Tooltip>
                    <Tooltip title={isHorizontal ? '上下展开' : '左右展开'}>
                      <div
                        onClick={() => {
                          const newLayout = isHorizontal ? 'top' : 'left';
                          chartRef.current?.layout(newLayout).render().fit();
                          setIsHorizontal(!isHorizontal);
                        }}
                        style={iconBtnStyle}
                      >
                        <SwapOutlined style={{ fontSize: 16, transform: isHorizontal ? 'rotate(90deg)' : undefined }} />
                      </div>
                    </Tooltip>
                    <Tooltip title={isRegionView ? '层级树模式' : '区域分组树模式'}>
                      <div
                        onClick={toggleRegionView}
                        style={{
                          ...iconBtnStyle,
                          background: isRegionView ? '#1677ff' : '#fff',
                          borderColor: isRegionView ? '#1677ff' : '#d9d9d9',
                        }}
                      >
                        <ApartmentOutlined style={{ fontSize: 16, color: isRegionView ? '#fff' : undefined }} />
                      </div>
                    </Tooltip>
                  </div>

                  <Spin spinning={loading} style={{ height: '100%' }}>
                    <div
                      ref={chartContainerRef}
                      style={{ width: '100%', height: 'calc(100vh - 170px)', backgroundColor: '#f5f5f5', borderRadius: 8 }}
                    />
                  </Spin>
                </div>
              ),
            },
            {
              key: 'table',
              label: (
                <span><TableOutlined style={{ marginRight: 6 }} />数据表</span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 全文搜索与操作栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Input
                        placeholder="在数据表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={tableSearchText}
                        onChange={(e) => setTableSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                    </Space>
                    <Space>
                      <Button icon={<DownloadOutlined />} onClick={handleExportJson} disabled={originalData.length === 0}>
                        导出 JSON
                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={originalData}
                      columnDefs={dynamicColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={tableSearchText}
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
                        ],
                      }}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* 详情抽屉 */}
      <DetailDrawer record={drawerRecord} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default KeyGlobalFamilyTree;
