import { PageContainer, ProTable, ProColumns } from '@ant-design/pro-components';
import { useParams, request } from '@umijs/max';
import { Input, Spin, Tooltip, Tabs, Drawer, Descriptions, Tag } from 'antd';
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
} from '@ant-design/icons';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
// @ts-ignore
import { OrgChart } from 'd3-org-chart';
import { renderToString } from 'react-dom/server';
import Flag from 'react-world-flags';

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
  width: 32, height: 32, borderRadius: 6,
  background: '#fff', border: '1px solid #d9d9d9',
  display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
  cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
};

// 需要在 Drawer 详情中隐藏的内部字段
const HIDDEN_FIELDS = new Set(['_id', 'id', 'parentId', 'iconHtml', '_nodeType', '_highlighted', '_upToTheRootHighlighted', '_expanded', '_directSubordinates', '_totalSubordinates']);

// 国家 → 国际区域映射表
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

// 根据国家名获取国际区域
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

  // 按国际区域 → 国家分组
  const regionCountryMap: Record<string, Record<string, any[]>> = {};
  originalData.forEach((item) => {
    if (item.id === rootId) return;
    const country = item.position || 'Unknown';
    const region = getRegion(country);
    if (!regionCountryMap[region]) regionCountryMap[region] = {};
    if (!regionCountryMap[region][country]) regionCountryMap[region][country] = [];
    regionCountryMap[region][country].push(item);
  });

  // 遍历每个国际区域
  Object.keys(regionCountryMap).sort().forEach((region) => {
    const regionId = `__region__${region}`;

    // 第二级：国际区域节点
    regionNodes.push({
      id: regionId, parentId: rootId, name: region,
      position: '', city: '', iconHtml: '', _nodeType: 'region',
    });

    // 遍历该区域下的国家
    Object.keys(regionCountryMap[region]).sort().forEach((country) => {
      const countryId = `__country__${country}`;
      const code = getCountryCode(country);
      const flagHtml = code ? getFlagHtml(code) : DEFAULT_AVATAR;

      // 第三级：国家节点
      regionNodes.push({
        id: countryId, parentId: regionId, name: country,
        position: '', city: '', iconHtml: flagHtml, _nodeType: 'country',
      });

      // 按城市分组
      const cityGroups: Record<string, any[]> = {};
      regionCountryMap[region][country].forEach((item) => {
        const city = item.city || 'Unknown';
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(item);
      });

      Object.keys(cityGroups).sort().forEach((city) => {
        const cityId = `__city__${country}__${city}`;
        // 第四级：城市节点
        regionNodes.push({
          id: cityId, parentId: countryId, name: city,
          position: '', city: '', iconHtml: '', _nodeType: 'city',
        });

        // 第五级：公司节点
        cityGroups[city].forEach((company) => {
          regionNodes.push({
            id: company.id, parentId: cityId, name: company.name,
            position: company['Address Line 1'] || company.position || '',
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

  // 根节点：浅红色背景、带国旗图标
  if (nodeType === 'root') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fff1f0;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;">
          <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
          <div style="background-color:#fff1f0;margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
          <div style="font-size:15px;font-weight:600;color:#a8071a;margin-left:20px;margin-right:20px;margin-top:5px;line-height:1.3;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:38px;" title="${d.data.name}">
            ${d.data.name}
          </div>
          ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;">${d.data.position}</div>` : ''}
          ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
        </div>
      </div>`;
  }

  // 国际区域节点：浅黄色背景、大字居中
  if (nodeType === 'region') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fffbe6;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:18px;font-weight:700;color:#ad6800;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
        </div>
      </div>`;
  }

  // 国家节点：浅蓝色背景
  if (nodeType === 'country') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#e6f4ff;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="margin-bottom:6px;">${d.data.iconHtml}</div>
          <div style="font-size:18px;font-weight:600;color:#003a8c;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
        </div>
      </div>`;
  }

  if (nodeType === 'city') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#f6ffed;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:18px;font-weight:600;color:#237804;text-align:center;padding:0 12px;white-space:normal;word-break:break-word;" title="${d.data.name}">${d.data.name}</div>
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
        <div style="font-size:14px;color:#08011E;margin-left:20px;margin-right:20px;margin-top:${showIcon ? '5' : '10'}px;line-height:1.3;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:38px;" title="${d.data.name}">
          ${d.data.name}
        </div>
        ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;">${d.data.position}</div>` : ''}
        ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
      </div>
    </div>`;
};

// ============ 详情 Drawer 组件 ============

const DetailDrawer: React.FC<{ record: any; open: boolean; onClose: () => void }> = ({ record, open, onClose }) => {
  if (!record) return null;

  // 从原始记录中提取所有可展示字段
  const displayFields = Object.entries(record).filter(
    ([key]) => !HIDDEN_FIELDS.has(key) && !key.startsWith('_'),
  );

  const title = record['Company Name'] || record.name || record.id || '详情';
  const countryCode = getCountryCode(record['Country/Region'] || record.position || '');

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

const DnbTree: React.FC = () => {
  const { collection } = useParams<{ collection: string }>();
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [isRegionView, setIsRegionView] = useState(true);       // 默认为区域分组视图
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompact, setIsCompact] = useState(true);             // 初始为紧凑模式
  const [isHorizontal, setIsHorizontal] = useState(false);      // 默认上下展开（top），切换为左右展开（left）
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tree');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState<any>(null);
  const [tableSearchText, setTableSearchText] = useState('');    // 表格搜索关键词
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  // 打开详情抽屉
  const openDrawer = useCallback((record: any) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  }, []);

  // 获取数据
  useEffect(() => {
    if (!collection) return;

    request(`/api/v1/wildcards/${collection}`, {
      method: 'GET',
      params: { query: { 'Country/Region': { $ne: '' } } },
    })
      .then((res: any) => {
        let rawRecordsRaw = res.results || [];

        const uniqueMap = new Map();
        rawRecordsRaw.forEach((item: any) => {
          let id = item['D-U-N-S® Number'];
          if (id !== undefined && id !== null) {
            id = String(id).trim();
            item['D-U-N-S® Number'] = id;
            item['Parent D-U-N-S® Number'] = item['Parent D-U-N-S® Number']
              ? String(item['Parent D-U-N-S® Number']).trim()
              : '';
            if (id !== '' && !uniqueMap.has(id)) {
              uniqueMap.set(id, item);
            }
          }
        });
        const rawRecords = Array.from(uniqueMap.values());

        const allIds = new Set(rawRecords.map((r: any) => r['D-U-N-S® Number']));

        let mainRootId: string = '';
        for (const r of rawRecords) {
          const pid = r['Parent D-U-N-S® Number'];
          if (!pid || pid === r['D-U-N-S® Number'] || !allIds.has(pid)) {
            mainRootId = r['D-U-N-S® Number'];
            break;
          }
        }
        if (!mainRootId && rawRecords.length > 0) mainRootId = rawRecords[0]['D-U-N-S® Number'];

        let rootAssigned = false;
        const mappedData = rawRecords.map((item: any) => {
          let pId = item['Parent D-U-N-S® Number'];

          if (!pId || pId === item['D-U-N-S® Number'] || !allIds.has(pId)) {
            if (!rootAssigned && item['D-U-N-S® Number'] === mainRootId) {
              pId = '';
              rootAssigned = true;
            } else {
              pId = mainRootId;
            }
          }

          const country = item['Country/Region'] || item['position'] || '';
          const city = item['City'] || item['city'] || '';
          const code = getCountryCode(country);
          const iconHtml = code ? getFlagHtml(code) : DEFAULT_AVATAR;

          return {
            ...item,
            id: item['D-U-N-S® Number'],
            parentId: pId,
            name: item['Company Name'] || item['name'] || item['D-U-N-S® Number'],
            position: country,
            city,
            iconHtml,
            _nodeType: pId === '' ? 'root' : '',
          };
        });

        console.log('DNB Tree Data Length:', mappedData.length);
        setOriginalData(mappedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load chart data', err);
        setLoading(false);
      });
  }, [collection]);

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
        .nodeHeight((d: any) => 115 + 25)
        .nodeWidth((d: any) => 280 + 2)
        .childrenMargin((d: any) => 50)
        .compactMarginBetween((d: any) => 35)
        .compactMarginPair((d: any) => 30)
        .neighbourMargin((a: any, b: any) => 20)
        .nodeContent(renderNodeContent)
        .onNodeClick((d: any) => {
          // 点击节点时打开 Drawer，仅对真实数据节点生效（排除虚拟的国家/城市分组节点）
          const nodeData = d.data || d;
          if (nodeData._nodeType === 'country' || nodeData._nodeType === 'city') return;
          // 从 originalData 中找到完整记录
          const fullRecord = originalData.find((item) => item.id === nodeData.id);
          if (fullRecord) openDrawer(fullRecord);
        })
        .render()
        .fit();
    },
    [originalData, openDrawer],
  );

  // 数据或视图模式变化时重新渲染（仅在 tree tab 激活时）
  useEffect(() => {
    if (originalData.length === 0 || activeTab !== 'tree') return;
    const chartData = isRegionView ? buildRegionData(originalData) : originalData;
    // 延迟渲染以确保容器 DOM 已挂载
    setTimeout(() => renderChart(chartData), 100);
  }, [originalData, isRegionView, renderChart, activeTab]);

  const toggleRegionView = () => setIsRegionView((prev) => !prev);

  // 搜索过滤（树）
  const handleSearch = (value: string) => {
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

  // ============ 表格列定义 ============

  // 动态从数据中提取所有唯一的国家和城市用于过滤器
  const countryFilters = useMemo(() => {
    const countries = [...new Set(originalData.map((d) => d.position).filter(Boolean))].sort();
    return countries.map((c) => ({ text: c, value: c }));
  }, [originalData]);

  const cityFilters = useMemo(() => {
    const cities = [...new Set(originalData.map((d) => d.city).filter(Boolean))].sort();
    return cities.map((c) => ({ text: c, value: c }));
  }, [originalData]);

  const tableColumns: ProColumns<any>[] = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      fixed: 'left',
      width: 280,
      sorter: (a: any, b: any) => (a.name || '').localeCompare(b.name || ''),
      render: (_: any, record: any) => (
        <a onClick={() => openDrawer(record)} style={{ fontWeight: 500 }}>
          {record.name}
        </a>
      ),
    },
    {
      title: 'D-U-N-S® Number',
      dataIndex: 'id',
      width: 160,
      sorter: (a: any, b: any) => (a.id || '').localeCompare(b.id || ''),
      copyable: true,
    },
    {
      title: 'Country/Region',
      dataIndex: 'position',
      width: 160,
      filters: countryFilters,
      onFilter: (value: any, record: any) => record.position === value,
      sorter: (a: any, b: any) => (a.position || '').localeCompare(b.position || ''),
      render: (_: any, record: any) => {
        const code = getCountryCode(record.position || '');
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {code && <Flag code={code} style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2 }} />}
            {record.position}
          </span>
        );
      },
    },
    {
      title: 'City',
      dataIndex: 'city',
      width: 140,
      filters: cityFilters,
      onFilter: (value: any, record: any) => record.city === value,
      sorter: (a: any, b: any) => (a.city || '').localeCompare(b.city || ''),
    },
    {
      title: 'Address',
      dataIndex: ['Address Line 1'],
      width: 250,
      ellipsis: true,
    },
    {
      title: 'Parent D-U-N-S®',
      dataIndex: 'parentId',
      width: 160,
      ellipsis: true,
    },
  ];

  // ============ 渲染 ============

  return (
    <PageContainer title={false} header={{ title: undefined, breadcrumb: {} }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: -8 }}
        items={[
          {
            key: 'tree',
            label: (
              <span><PartitionOutlined style={{ marginRight: 6 }} />结构树</span>
            ),
            children: (
              <div style={{ position: 'relative' }}>
                {/* 浮动工具栏 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12, right: 16, zIndex: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Input
                    placeholder="Keywords to search"
                    allowClear
                    prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ width: 200, height: 35 }}
                  />
                  <Tooltip title={isExpanded ? '全部折叠' : '全部展开'}>
                    <div
                      onClick={() => {
                        if (isExpanded) {
                          chartRef.current?.collapseAll().fit();
                        } else {
                          chartRef.current?.expandAll().render();
                          // 展开全部后：以根节点垂直中轴为中心，根节点定位到画布最上方
                          setTimeout(() => {
                            const svgEl = chartContainerRef.current?.querySelector('svg');
                            const container = chartContainerRef.current;
                            if (svgEl && container && chartRef.current) {
                              const rootGroup = svgEl.querySelector('.node');
                              if (rootGroup) {
                                const rootBox = (rootGroup as SVGGraphicsElement).getBBox();
                                const containerRect = container.getBoundingClientRect();
                                const scale = 0.5;
                                // 根节点中心 X 坐标移到画布水平中央，Y 坐标移到画布顶部（留 30px 边距）
                                const translateX = (containerRect.width / 2) - (rootBox.x + rootBox.width / 2) * scale;
                                const translateY = 30 - rootBox.y * scale;
                                const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
                                const zoom = d3.zoom().on('zoom', (event: any) => {
                                  d3.select(svgEl).select('.chart').attr('transform', event.transform);
                                });
                                d3.select(svgEl).transition().duration(600)
                                  .call(zoom.transform as any, transform);
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
                  <Tooltip title={isCompact ? '水平模式' : '紧凑模式'}>
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
                  <Tooltip title={isRegionView ? '恢复层级树' : '区域分组树'}>
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

                <Spin spinning={loading}>
                  <div
                    ref={chartContainerRef}
                    style={{ width: '100%', height: 'calc(100vh - 160px)', backgroundColor: '#f5f5f5', borderRadius: 8 }}
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
              <ProTable<any>
                headerTitle={`${collection} — 共 ${originalData.length} 条记录`}
                rowKey="id"
                loading={loading}
                dataSource={tableSearchText
                  ? originalData.filter((row) => {
                      const keyword = tableSearchText.toLowerCase();
                      return (
                        row.name?.toLowerCase().includes(keyword) ||
                        row.id?.toLowerCase().includes(keyword) ||
                        row.position?.toLowerCase().includes(keyword) ||
                        row.city?.toLowerCase().includes(keyword) ||
                        (row['Address Line 1'] || '').toLowerCase().includes(keyword) ||
                        row.parentId?.toLowerCase().includes(keyword)
                      );
                    })
                  : originalData
                }
                columns={tableColumns}
                search={false}
                scroll={{ x: 1200 }}
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: ['20', '50', '100', '200'],
                  showTotal: (total) => `共 ${total} 条`,
                }}
                options={{
                  density: true,
                  fullScreen: true,
                  setting: true,
                }}
                toolBarRender={() => [
                  <Input
                    key="search"
                    placeholder="输入关键词搜索"
                    allowClear
                    prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                    onChange={(e) => setTableSearchText(e.target.value)}
                    style={{ width: 250 }}
                  />,
                ]}
              />
            ),
          },
        ]}
      />

      {/* 详情抽屉 - 树节点点击 & 表格公司名称点击共用 */}
      <DetailDrawer record={drawerRecord} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </PageContainer>
  );
};

export default DnbTree;
