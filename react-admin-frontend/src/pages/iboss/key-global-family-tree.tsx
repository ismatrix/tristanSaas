import React, { useState, useEffect, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useParams, useLocation, request, history, useModel } from '@umijs/max';
import { Checkbox, Spin, message, Button, Input, Space, Tag, Badge, Tabs, Drawer, Descriptions, Tooltip, Modal, Table, Row, Col, Card, Progress, Select, Popconfirm } from 'antd';
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
  ReloadOutlined,
  SaveOutlined,
  LinkOutlined,
  DashboardOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  ProfileOutlined,
  GlobalOutlined,
  CameraOutlined,
  TranslationOutlined,
  DeleteOutlined,
  FormOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import * as d3 from 'd3';
// @ts-ignore
import { OrgChart } from 'd3-org-chart';
import { renderToString } from 'react-dom/server';
import Flag from 'react-world-flags';
import { OverseasBranchWorldMap } from './components/OverseasBranchWorldMap';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// 顶层全局通用 Excel (CSV utf-8 bom) 导出函数
const exportToCsvExcel = (filename: string, headers: string[], keys: ((row: any, idx?: number) => any)[], data: any[]) => {
  if (!data || data.length === 0) {
    message.warning('暂无可导出数据');
    return;
  }
  let csvContent = '\uFEFF';
  csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  data.forEach((row, idx) => {
    const rowValues = keys.map(k => {
      let val = k(row, idx);
      if (val === undefined || val === null) val = '—';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    csvContent += rowValues.join(',') + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  message.success(`已成功导出 ${data.length} 条记录至 Excel (CSV)`);
};

// HTML 实体转义还原助手函数
const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
};

/**
 * 分批分块并发查询 Wildcard 接口，防止数组过大引发 GET URL 长度超标 (HTTP 414 / 431)
 */
async function chunkedWildcardQuery(
  collection: string,
  field: string,
  values: (string | number)[],
  chunkSize: number = 60,
  extraQuery: Record<string, any> = {},
): Promise<any[]> {
  if (!values || values.length === 0) return [];
  const uniqueValues = Array.from(
    new Set(
      values
        .map(String)
        .map((v) => v.trim())
        .filter((v) => Boolean(v && v !== '-1' && v !== '0' && v !== 'null' && v !== 'undefined')),
    ),
  );
  if (uniqueValues.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    chunks.push(uniqueValues.slice(i, i + chunkSize));
  }

  const promises = chunks.map((chunk) =>
    request(`/api/v1/wildcards/${collection}`, {
      method: 'GET',
      params: {
        query: JSON.stringify({ ...extraQuery, [field]: { $in: chunk } }),
        options: JSON.stringify({ limit: 10000 }),
      },
    })
      .then((res) => (res.results || res.data?.results || []) as any[])
      .catch((err) => {
        console.warn(`[chunkedWildcardQuery] Failed querying ${collection} on field ${field}:`, err);
        return [] as any[];
      }),
  );

  const resultsArray = await Promise.all(promises);
  return resultsArray.flat();
}


// 预设富文本编辑颜色列表 (黑、白、红、黄、绿、蓝)
const PRESET_COLORS = [
  { label: '黑色', value: '#111827' },
  { label: '白色', value: '#ffffff' },
  { label: '红色', value: '#dc2626' },
  { label: '黄色', value: '#eab308' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
];

// 轻量级富文本编辑器 (支持粗体、斜体、文字颜色选择)
const RichTextEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}> = ({ value, onChange, style, autoFocus = true }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // 初始化设置 innerHTML，自动反转义解码
  useEffect(() => {
    if (editorRef.current) {
      const decoded = unescapeHtml(value || '');
      if (editorRef.current.innerHTML !== decoded) {
        editorRef.current.innerHTML = decoded;
      }
    }
  }, [value]);

  // 当 autoFocus 为 true 时，弹窗打开后自动聚焦可编辑文本框，并将光标移至文末
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      const timer = setTimeout(() => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (e) {
          // ignore
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const execCmd = (command: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden', ...style }}>
      {/* 工具栏，onMouseDown 阻止焦点离开编辑区以保持文字选中选区 */}
      <div
        style={{ background: '#f5f5f5', borderBottom: '1px solid #d9d9d9', padding: '6px 10px', display: 'flex', gap: '8px', alignItems: 'center' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Button
          size="small"
          type="text"
          style={{ fontWeight: 'bold', minWidth: 28 }}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('bold');
          }}
          title="加粗 (Bold)"
        >
          <b>B</b>
        </Button>
        <Button
          size="small"
          type="text"
          style={{ fontStyle: 'italic', minWidth: 28 }}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd('italic');
          }}
          title="斜体 (Italic)"
        >
          <i>I</i>
        </Button>
        <div style={{ width: '1px', height: '16px', background: '#d9d9d9', margin: '0 4px' }} />
        <span style={{ fontSize: '12px', color: '#666' }}>文字颜色:</span>
        {PRESET_COLORS.map(c => (
          <span
            key={c.value}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd('foreColor', c.value);
            }}
            title={c.label}
            style={{
              display: 'inline-block',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: c.value,
              cursor: 'pointer',
              border: c.value === '#ffffff' ? '1px solid #6b7280' : '1px solid #d1d5db',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              transition: 'transform 0.1s ease',
            }}
          />
        ))}
        {/* 自定义拾色器 */}
        <label
          style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginLeft: 4 }}
          title="自定义颜色"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            style={{ width: 22, height: 22, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
            onChange={(e) => execCmd('foreColor', e.target.value)}
          />
        </label>
      </div>

      {/* 可编辑区域 */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{
          minHeight: '120px',
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '8px 12px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.5',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
};

// 正则转义助手函数，用于合并多关键字正则匹配，防止 GET URL 过长导致 403 报错
const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// 文本数字 + 圆形 span 背景的清晰徽章组件
const NumberBadge: React.FC<{ num: string | number; style?: React.CSSProperties }> = ({ num, style }) => (
  <span
    className="tab-number-badge"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      backgroundColor: '#1677ff',
      fontSize: '11px',
      fontWeight: 'bold',
      lineHeight: '18px',
      marginRight: '6px',
      flexShrink: 0,
      transition: 'all 0.2s ease',
      ...style,
    }}
  >
    <span className="tab-number-text" style={{ color: '#ffffff', fontWeight: 'bold' }}>{num}</span>
  </span>
);

const NumberOneIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <NumberBadge num={1} style={style} />
);

const NumberTwoIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <NumberBadge num={2} style={style} />
);

const NumberThreeIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <NumberBadge num={3} style={style} />
);

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
  // 中文国家及地区名称对照支持
  '中国': 'cn', '中国香港': 'hk', '香港': 'hk', '中国澳门': 'mo', '澳门': 'mo', '中国台湾': 'tw', '台湾': 'tw',
  '美国': 'us', '英国': 'gb', '新加坡': 'sg', '日本': 'jp', '韩国': 'kr', '南韩': 'kr', '朝鲜': 'kp',
  '开曼群岛': 'ky', '开曼': 'ky', '维尔京群岛': 'vg', '英属维尔京群岛': 'vg', '维尔京': 'vg',
  '澳大利亚': 'au', '澳洲': 'au', '加拿大': 'ca', '德国': 'de', '法国': 'fr', '印度': 'in',
  '哈萨克斯坦': 'kz', '伊拉克': 'iq', '阿联酋': 'ae', '俄罗斯': 'ru', '秘鲁': 'pe',
  '印度尼西亚': 'id', '印尼': 'id', '巴西': 'br', '荷兰': 'nl', '瑞士': 'ch', '百慕大': 'bm',
  '巴拿马': 'pa', '马来西亚': 'my', '南非': 'za', '泰国': 'th', '越南': 'vn', '菲律宾': 'ph',
  '新西兰': 'nz', '墨西哥': 'mx', '意大利': 'it', '西班牙': 'es', '葡萄牙': 'pt',
  '瑞典': 'se', '挪威': 'no', '丹麦': 'dk', '芬兰': 'fi', '爱尔兰': 'ie', '比利时': 'be',
  '奥地利': 'at', '波兰': 'pl', '捷克': 'cz', '匈牙利': 'hu', '罗马尼亚': 'ro', '希腊': 'gr',
  '土耳其': 'tr', '埃及': 'eg', '沙特阿拉伯': 'sa', '沙特': 'sa', '卡塔尔': 'qa', '科威特': 'kw',
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
const HIDDEN_FIELDS = new Set(['_id', 'id', 'parentId', 'iconHtml', '_nodeType', '_highlighted', '_upToTheRootHighlighted', '_expanded', '_directSubordinates', '_totalSubordinates', 'cmiContacts', 'custContacts']);

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
// 注意：调用前数据已经过 filterTreeData 过滤，空城市/国家/区域需在此处也过滤掉
const buildRegionData = (originalData: any[]): any[] => {
  const rootNode = originalData.find((d) => d.parentId === '');
  if (!rootNode) return originalData;

  const regionNodes: any[] = [];
  const rootId = rootNode.id;

  regionNodes.push({
    ...rootNode,
    id: rootId,
    parentId: '',
    name: rootNode.name,
    companyNameCn: rootNode.companyNameCn,
    companyNameEn: rootNode.companyNameEn,
    position: rootNode.position,
    city: rootNode.city,
    iconHtml: rootNode.iconHtml,
    _nodeType: 'root',
    cmiContacts: rootNode.cmiContacts,
    custContacts: rootNode.custContacts, // 保留客户联系人
    nationAgent: rootNode.nationAgent,
  });

  const regionCountryMap: Record<string, Record<string, any[]>> = {};
  originalData.forEach((item) => {
    if (item.id === rootId) return;
    const country = item.position || 'Unknown';
    // 优先使用数据库中存储的 cmiRegion 字段进行分组，若无值则降级分类为 'Other Regions'
    const region = item.cmiRegion || 'Other Regions';
    if (!regionCountryMap[region]) regionCountryMap[region] = {};
    if (!regionCountryMap[region][country]) regionCountryMap[region][country] = [];
    regionCountryMap[region][country].push(item);
  });

  Object.keys(regionCountryMap).sort().forEach((region) => {
    const regionId = `__region__${region}`;

    // 预先收集该大区下所有有效的国家（及其城市分组），跳过无公司的城市/国家
    const validCountryEntries: Array<{ country: string; flagHtml: string; cityGroups: Record<string, any[]> }> = [];

    Object.keys(regionCountryMap[region]).sort().forEach((country) => {
      const cityGroups: Record<string, any[]> = {};
      regionCountryMap[region][country].forEach((item) => {
        const city = item.city || 'Unknown';
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(item);
      });

      // 过滤掉没有任何公司的城市
      const nonEmptyCities = Object.keys(cityGroups).filter((city) => cityGroups[city].length > 0);
      if (nonEmptyCities.length === 0) return; // 此国家下无有效公司，跳过

      const code = getCountryCode(country);
      const flagHtml = code ? getFlagHtml(code) : DEFAULT_AVATAR;
      // 只保留非空城市
      const validCityGroups: Record<string, any[]> = {};
      nonEmptyCities.forEach((city) => { validCityGroups[city] = cityGroups[city]; });
      validCountryEntries.push({ country, flagHtml, cityGroups: validCityGroups });
    });

    if (validCountryEntries.length === 0) return; // 此大区下无有效国家，跳过区域节点

    // 添加大区节点
    regionNodes.push({
      id: regionId, parentId: rootId, name: region,
      position: '', city: '', iconHtml: '', _nodeType: 'region',
    });

    // 添加各国家 → 城市 → 公司节点
    validCountryEntries.forEach(({ country, flagHtml, cityGroups }) => {
      const countryId = `__country__${country}`;
      regionNodes.push({
        id: countryId, parentId: regionId, name: country,
        position: '', city: '', iconHtml: flagHtml, _nodeType: 'country',
      });

      Object.keys(cityGroups).sort().forEach((city) => {
        const cityId = `__city__${country}__${city}`;
        regionNodes.push({
          id: cityId, parentId: countryId, name: city,
          position: '', city: '', iconHtml: '', _nodeType: 'city',
        });

        cityGroups[city].forEach((company) => {
          regionNodes.push({
            ...company,
            id: company.id,
            parentId: cityId,
            name: company.name,
            companyNameCn: company.companyNameCn,
            companyNameEn: company.companyNameEn,
            position: company.registeredAddress || company.position || '',
            city: '',
            iconHtml: '',
            _nodeType: 'company',
            cmiContacts: company.cmiContacts,
            custContacts: company.custContacts, // 保留客户联系人
            nationAgent: company.nationAgent,
            entityTypeName: company.entityTypeName, // 透传营业网点标识，用于灰色背景渲染
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
  const isNationAgent = d.data.nationAgent === 'TRUE' || d.data.nationAgent === 'true' || d.data.nationAgent === true;
  const borderStyle = d.data._highlighted || d.data._upToTheRootHighlighted
    ? '5px solid #1677ff'
    : (isNationAgent ? '1px solid #8b0000' : '1px solid #E4E2E9');

  const hasCmi = d.data.cmiContacts && d.data.cmiContacts.length > 0;
  const hasCust = d.data.custContacts && d.data.custContacts.length > 0;

  const cmiIndicator = hasCmi ? `
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 16px;
      height: 16px;
      border-bottom-left-radius: 9px;
      background: linear-gradient(45deg, #bae7ff 50%, transparent 50%);
      filter: drop-shadow(1px 1px 2px rgba(0, 58, 140, 0.2));
      pointer-events: none;
      z-index: 9;
    " title="存在 CMI 联系人"></div>
  ` : '';

  const custIndicator = hasCust ? `
    <div style="
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      border-bottom-right-radius: 9px;
      background: linear-gradient(-45deg, #d9f7be 50%, transparent 50%);
      filter: drop-shadow(-1px 1px 2px rgba(19, 82, 0, 0.2));
      pointer-events: none;
      z-index: 9;
    " title="存在客户联系人"></div>
  ` : '';

  // 根节点
  // 根节点
  if (nodeType === 'root') {
    const cnName = d.data.companyNameCn || d.data.name || '';
    const enName = d.data.companyNameEn || '';
    const hasDiffEn = Boolean(enName && enName !== cnName);

    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fff1f0;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;position:relative;">
          <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
          <div style="background-color:#fff1f0;margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
          <div style="font-size:13px;font-weight:600;color:#a8071a;margin-left:20px;margin-right:20px;margin-top:5px;line-height:1.2;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:${hasDiffEn ? '1' : '2'};-webkit-box-orient:vertical;overflow:hidden;height:${hasDiffEn ? '18px' : '34px'};" title="${cnName}">
            ${cnName}
          </div>
          ${hasDiffEn ? `
            <div style="font-size:11px;color:#cf1322;margin-left:20px;margin-right:20px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:${d.width - 40}px;" title="${enName}">
              ${enName}
            </div>
          ` : ''}
          ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;">${d.data.position}</div>` : ''}
          ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
          ${cmiIndicator}
          ${custIndicator}
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

  // 若该分支节点历史存在 TCV 项目，则节点背景用浅红色 (#fff1f0)，否则 Site 为浅灰 (#f0f0f0)，普通为白色 (#FFFFFF)
  const hasTcv = d.data._hasTcv || false;
  const bgColor = hasTcv ? '#fff1f0' : (d.data.entityTypeName === 'Site' ? '#f0f0f0' : '#FFFFFF');
  // 不改变节点边框原有的颜色样式，只保留原有的 borderStyle（用以标识是否为国家代表及高亮状态）
  const finalBorder = borderStyle;
  const showIcon = !nodeType;

  const cnName = d.data.companyNameCn || d.data.name || '';
  const enName = d.data.companyNameEn || '';
  const hasDiffEn = Boolean(enName && enName !== cnName);

  return `
    <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
      <div style="font-family:'Inter',sans-serif;background-color:${bgColor};margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${finalBorder};cursor:pointer;position:relative;">
        <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
        ${showIcon ? `
          <div style="background-color:${bgColor};margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
        ` : ''}
        <div style="font-size:13px;font-weight:600;color:#08011E;margin-left:20px;margin-right:20px;margin-top:${showIcon ? '5' : '10'}px;line-height:1.2;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:${hasDiffEn ? '1' : '2'};-webkit-box-orient:vertical;overflow:hidden;height:${hasDiffEn ? '18px' : '34px'};" title="${cnName}">
          ${cnName}
        </div>
        ${hasDiffEn ? `
          <div style="font-size:11px;color:#595959;margin-left:20px;margin-right:20px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:${d.width - 40}px;" title="${enName}">
            ${enName}
          </div>
        ` : ''}
        ${d.data.position ? `<div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:${d.width - 40}px;" title="${d.data.position}">${d.data.position}</div>` : ''}
        ${d.data.city ? `<div style="color:#999;margin-left:20px;margin-top:2px;font-size:11px;">${d.data.city}</div>` : ''}
        ${d.data.cmiContacts && d.data.cmiContacts.length > 0 ? `<div onclick="window.handleShowCmiContact(event, '${d.data.id}')" style="position:absolute; bottom:6px; right:8px; background-color:#e6f4ff; color:#1677ff; border:1px solid #91caff; font-size:11px; padding:2px 6px; border-radius:4px; cursor:pointer; z-index:10;">cmi contact</div>` : ''}
        ${cmiIndicator}
        ${custIndicator}
      </div>
    </div>`;
};

// ============ 详情 Drawer 组件 ============
const DetailDrawer: React.FC<{ record: any; open: boolean; onClose: () => void; tcvList?: any[] }> = ({ record, open, onClose, tcvList = [] }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // 定义历史 TCV 项目表格列（加入终端客户名称字段并放置在第二列）
  const tcvColumns = useMemo(() => [
    { headerName: '签约客户名称', field: '签约客户名称', minWidth: 150 },
    { headerName: '终端客户名称', field: '终端客户名称', minWidth: 150 },
    { headerName: '销售单元', field: '销售单元', width: 120 },
    { headerName: '电路编号', field: '电路编号', width: 120 },
    { headerName: '合同签署日期', field: '合同签署日期', width: 120 },
    { headerName: '产品分类', field: '产品分类', width: 110 },
    {
      headerName: '签单金额 (港币)',
      field: '签单金额 (港币)',
      width: 140,
      type: 'numericColumn',
      cellStyle: { textAlign: 'right' },
      valueFormatter: (params: any) => {
        const val = parseFloat(params.value || 0);
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
  ], []);

  // 去重并按照合同签署日期倒序排列
  // 规则：根据 电路编号、合同签署日期、产品分类 相同记录只取 1 条。优先取 TCV订单类型 === 'New' 的记录，如果都为 'New' 或都不为 'New'，则取 生成订单日期 最晚的记录。
  const sortedTcvList = useMemo(() => {
    if (!tcvList || tcvList.length === 0) return [];

    // 1. 根据电路编号、合同签署日期、产品分类进行分组
    const grouped: Record<string, any[]> = {};
    tcvList.forEach((item) => {
      const key = `${item['电路编号'] || ''}_${item['合同签署日期'] || ''}_${item['产品分类'] || ''}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    // 2. 在每个分组内筛选符合规则的唯一一条记录
    const filtered = Object.values(grouped).map((items) => {
      if (items.length <= 1) return items[0];

      return [...items].sort((a, b) => {
        const isNewA = String(a['TCV订单类型'] || '').trim() === 'New';
        const isNewB = String(b['TCV订单类型'] || '').trim() === 'New';

        // 优先保留 TCV订单类型 为 'New' 的记录
        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;

        // 如果 TCV订单类型 状态一致，则取 生成订单日期 最晚的记录
        const dateA = a['生成订单日期'] || '';
        const dateB = b['生成订单日期'] || '';
        return dateB.localeCompare(dateA); // 日期降序，最晚的排在前面
      })[0];
    });

    // 3. 对去重后的结果按 合同签署日期 倒序排列
    return filtered.sort((a, b) => {
      const dateA = a['合同签署日期'] || '';
      const dateB = b['合同签署日期'] || '';
      return dateB.localeCompare(dateA);
    });
  }, [tcvList]);

  // 计算并生成金额合计行（基于去重后的 sortedTcvList 计算）
  const pinnedBottomRowData = useMemo(() => {
    if (!sortedTcvList || sortedTcvList.length === 0) return [];
    const totalAmount = sortedTcvList.reduce((sum, item) => {
      const val = parseFloat(item['签单金额 (港币)'] || 0);
      return sum + val;
    }, 0);
    return [{
      '签约客户名称': '合计',
      '签单金额 (港币)': totalAmount
    }];
  }, [sortedTcvList]);

  // 当抽屉打开且 record 发生变化时，根据 GID 异步加载客户联系人
  useEffect(() => {
    if (open && record && (record.GID || record.id)) {
      setContactsLoading(true);
      const targetGid = record.GID || record.id;
      request('/api/v1/wildcards/custContacts', {
        method: 'GET',
        params: {
          query: JSON.stringify({
            $or: [
              { GID: targetGid },
              { companyGId: targetGid },
              { companyGID: targetGid }
            ]
          }),
          options: JSON.stringify({ limit: 100 }),
        },
      })
        .then((res: any) => {
          const data = res.results || res.data?.results || [];
          setContacts(data);
        })
        .catch((err: any) => {
          console.error('获取客户联系人失败:', err);
        })
        .finally(() => {
          setContactsLoading(false);
        });
    } else {
      setContacts([]);
    }
  }, [open, record]);

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
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{title}</div>
            {record.companyNameEn && record.companyNameEn !== title && (
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 'normal', marginTop: 2 }}>{record.companyNameEn}</div>
            )}
          </div>
        </div>
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
    >
      {/* TCV 历史签单项目信息段落，显示在抽屉最上方，使用 AG GRID 显示 */}
      {tcvList && tcvList.length > 0 && (
        <div
          style={{
            background: '#fff1f0',
            border: '1px solid #ffa39e',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(255, 77, 79, 0.08)',
          }}
        >
          <div style={{ fontWeight: 700, color: '#cf1322', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarOutlined /> <span>历史 TCV 项目信息 ({tcvList.length} 笔)</span>
          </div>
          <div className="ag-theme-quartz" style={{ height: '240px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={sortedTcvList}
              pinnedBottomRowData={pinnedBottomRowData}
              columnDefs={tcvColumns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                filter: false, // 禁用过滤
                suppressHeaderMenuButton: true, // 隐藏更多功能按钮
              }}
              onGridReady={(params) => {
                params.api.sizeColumnsToFit();
              }}
              onFirstDataRendered={(params) => {
                params.api.sizeColumnsToFit();
              }}
            />
          </div>
        </div>
      )}

      {/* CMI 联系人信息段落，浅蓝色背景区域 */}
      {record.cmiContacts && record.cmiContacts.length > 0 && (
        <div
          style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontWeight: 600, color: '#0958d9', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>👤 CMI 联系人信息</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {record.cmiContacts.map((contact: any, index: number) => (
              <div
                key={contact._id || index}
                style={{
                  borderBottom: index < record.cmiContacts.length - 1 ? '1px dashed #adc6ff' : 'none',
                  paddingBottom: index < record.cmiContacts.length - 1 ? '12px' : '0',
                }}
              >
                <Descriptions
                  size="small"
                  column={1}
                  colon={false}
                  contentStyle={{ color: '#333', fontSize: '13px' }}
                  labelStyle={{ color: '#595959', width: '120px', fontWeight: 500, fontSize: '13px' }}
                >
                  <Descriptions.Item label="姓名">
                    <span style={{ fontWeight: 600 }}>{contact.name || '—'}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="角色">
                    {contact.role || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="部门">
                    {contact.department || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="职位">
                    {contact.position || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="员工号">
                    {contact.staffNo || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="电话">
                    <span style={{ color: '#096dd9', fontWeight: 500 }}>{contact.phoneNumber || '—'}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">
                    {contact.email || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="城市">
                    {contact.City || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="直属上级">
                    {contact.直属上级 || '—'}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 客户联系人信息段落，显示在最上方，浅绿色背景区域 */}
      <div
        style={{
          background: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontWeight: 600, color: '#389e0d', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👥 客户联系人信息</span>
          {contactsLoading && <Spin size="small" />}
        </div>
        {contactsLoading ? (
          <div style={{ padding: '10px 0', textAlign: 'center', color: '#888' }}>加载中...</div>
        ) : contacts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contacts.map((contact, index) => (
              <div
                key={contact._id || index}
                style={{
                  borderBottom: index < contacts.length - 1 ? '1px dashed #d9f7be' : 'none',
                  paddingBottom: index < contacts.length - 1 ? '12px' : '0',
                }}
              >
                <Descriptions
                  size="small"
                  column={1}
                  colon={false}
                  contentStyle={{ color: '#333', fontSize: '13px' }}
                  labelStyle={{ color: '#595959', width: '120px', fontWeight: 500, fontSize: '13px' }}
                >
                  <Descriptions.Item label="姓名">
                    <span style={{ fontWeight: 600 }}>
                      {`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '—'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="头衔">
                    {contact.title || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="职能">
                    {contact.functionName || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    <span style={{ color: '#096dd9', fontWeight: 500 }}>
                      {contact.phoneNumber || '—'}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#8c8c8c', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
            暂无客户联系人信息
          </div>
        )}
      </div>

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

// ============ Dashboard Tab 子组件 ============
interface DashboardTabProps {
  gid?: string;
  originalData: any[];
  loading: boolean;
  dashboardData: any;
  dashboardLoading: boolean;
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  gid,
  originalData,
  loading,
  dashboardData,
  dashboardLoading,
}) => {
  // 查找根节点（即全球母公司）
  const rootNode = useMemo(() => {
    return originalData.find(d => d.parentId === '' || d._nodeType === 'root');
  }, [originalData]);

  // 客户经理列表
  const cmiContacts = useMemo(() => {
    return rootNode?.cmiContacts || [];
  }, [rootNode]);

  // 海外分支节点列表（排除母公司根节点且排除 Site 营业网点）
  const branchNodes = useMemo(() => {
    if (!rootNode) return [];
    return originalData.filter(d => d.id !== rootNode.id && d.entityTypeName !== 'Site');
  }, [originalData, rootNode]);

  // 营业网点列表（排除母公司根节点，只保留 Site 营业网点）
  const siteNodes = useMemo(() => {
    if (!rootNode) return [];
    return originalData.filter(d => d.id !== rootNode.id && d.entityTypeName === 'Site');
  }, [originalData, rootNode]);

  // 计算海外分支机构与网点的大区与国家分布统计
  const branchStats = useMemo(() => {
    const stats: Record<string, { branchCount: number; siteCount: number; countries: Record<string, { branchCount: number; siteCount: number }> }> = {};

    // 初始化大区默认框架属性以防止取值 undefined
    const DISPLAY_REGIONS_FLAT = ['Europe', 'APAC', 'Americas', 'MENA', 'STA', 'Euro-Asia', 'Mainland China', 'HKM', 'TW'];
    DISPLAY_REGIONS_FLAT.forEach(reg => {
      stats[reg] = { branchCount: 0, siteCount: 0, countries: {} };
    });

    // 1. 统计分支
    branchNodes.forEach(node => {
      const region = node.cmiRegion || 'Other Regions';
      const country = node.registeredCountry || node.position || 'Unknown';
      if (!stats[region]) {
        stats[region] = { branchCount: 0, siteCount: 0, countries: {} };
      }
      stats[region].branchCount += 1;
      if (!stats[region].countries[country]) {
        stats[region].countries[country] = { branchCount: 0, siteCount: 0 };
      }
      stats[region].countries[country].branchCount += 1;
    });

    // 2. 统计网点
    siteNodes.forEach(node => {
      const region = node.cmiRegion || 'Other Regions';
      const country = node.registeredCountry || node.position || 'Unknown';
      if (!stats[region]) {
        stats[region] = { branchCount: 0, siteCount: 0, countries: {} };
      }
      stats[region].siteCount += 1;
      if (!stats[region].countries[country]) {
        stats[region].countries[country] = { branchCount: 0, siteCount: 0 };
      }
      stats[region].countries[country].siteCount += 1;
    });

    return stats;
  }, [branchNodes, siteNodes]);

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [drawerType, setDrawerType] = useState<'branch' | 'site'>('branch');
  const [selectedBrYears, setSelectedBrYears] = useState<string[]>(['2026']);
  const [selectedTcvYears, setSelectedTcvYears] = useState<string[]>(['2024', '2025', '2026']);

  // 过滤出选中国家下的分支节点或网点节点列表
  const branchesInCountry = useMemo(() => {
    if (!selectedCountry) return [];
    if (drawerType === 'site') {
      return siteNodes.filter(node => {
        const countryVal = node.registeredCountry || node.position || '';
        return String(countryVal).trim().toLowerCase() === selectedCountry.trim().toLowerCase();
      });
    } else {
      return branchNodes.filter(node => {
        const countryVal = node.registeredCountry || node.position || '';
        return String(countryVal).trim().toLowerCase() === selectedCountry.trim().toLowerCase();
      });
    }
  }, [branchNodes, siteNodes, selectedCountry, drawerType]);

  // --- 第四部分：历史签单大区/销售单元联动状态 ---
  const rawTcvRecords = dashboardData?.tcvRecords || [];

  // 按照与抽屉相同的逻辑对原始 TCV 数据源进行去重
  // 规则：根据 电路编号、合同签署日期、产品分类 相同记录只取 1 条。优先取 TCV订单类型 === 'New' 的记录，如果都为 'New' 或都不为 'New'，则取 生成订单日期 最晚的记录。
  const tcvRecords = useMemo(() => {
    if (!rawTcvRecords || rawTcvRecords.length === 0) return [];

    // 1. 根据电路编号、合同签署日期、产品分类进行分组
    const grouped: Record<string, any[]> = {};
    rawTcvRecords.forEach((item: any) => {
      const key = `${item['电路编号'] || ''}_${item['合同签署日期'] || ''}_${item['产品分类'] || ''}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    // 2. 在每个分组内筛选符合规则的唯一一条记录
    const filtered = Object.values(grouped).map((items) => {
      if (items.length <= 1) return items[0];

      return [...items].sort((a, b) => {
        const isNewA = String(a['TCV订单类型'] || '').trim() === 'New';
        const isNewB = String(b['TCV订单类型'] || '').trim() === 'New';

        // 优先保留 TCV订单类型 为 'New' 的记录
        if (isNewA && !isNewB) return -1;
        if (!isNewA && isNewB) return 1;

        // 如果 TCV订单类型 状态一致，则取 生成订单日期 最晚的记录
        const dateA = a['生成订单日期'] || '';
        const dateB = b['生成订单日期'] || '';
        return dateB.localeCompare(dateA); // 日期降序，最晚的排在前面
      })[0];
    });

    return filtered;
  }, [rawTcvRecords]);

  // 动态由 tcvRecords 计算满足 selectedTcvYears 年份条件的各个国家的签单数据 (tcvStats)
  const tcvStats = useMemo(() => {
    const yrFiltered = tcvRecords.filter((r: any) => {
      const signDate = String(r['合同签署日期'] || r['设置起租日期'] || '');
      return selectedTcvYears.some(yr => signDate.startsWith(yr));
    });

    const unitMap = new Map<string, { unit: string; region: string; count: number; amount: number }>();
    yrFiltered.forEach((r: any) => {
      const unit = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
      const region = r['大区中文名称'] || r['大区'] || '其他大区';
      const amount = parseFloat(r['签单金额(港币)'] || 0);

      if (!unitMap.has(unit)) {
        unitMap.set(unit, {
          unit,
          region,
          count: 0,
          amount: 0
        });
      }
      const u = unitMap.get(unit)!;
      u.count += 1;
      u.amount += amount;
    });

    return Array.from(unitMap.values());
  }, [tcvRecords, selectedTcvYears]);

  const tcvRegions = useMemo(() => {
    const regions = new Set<string>();
    tcvStats.forEach((s: any) => {
      if (s.region) regions.add(s.region);
    });
    return ['All', ...Array.from(regions)];
  }, [tcvStats]);

  const [selectedTcvRegion, setSelectedTcvRegion] = useState<string>('All');
  const [selectedTcvUnit, setSelectedTcvUnit] = useState<string | null>(null);
  const [selectedLargeProductCat, setSelectedLargeProductCat] = useState<string>('通讯服务');

  // 小类合同详情弹窗状态
  const [subCatModalVisible, setSubCatModalVisible] = useState<boolean>(false);
  const [selectedSubCat, setSelectedSubCat] = useState<string>('');
  const [subCatTcvRecords, setSubCatTcvRecords] = useState<any[]>([]);

  // 签单明细与客户分组汇总弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [customerGroupModalVisible, setCustomerGroupModalVisible] = useState<boolean>(false);

  // 大区变化时，重置所选国家(销售单元)为 null
  useEffect(() => {
    setSelectedTcvUnit(null);
  }, [selectedTcvRegion]);

  const activeTcvStats = useMemo(() => {
    if (selectedTcvRegion === 'All') {
      return tcvStats;
    }
    return tcvStats.filter((s: any) => s.region === selectedTcvRegion);
  }, [tcvStats, selectedTcvRegion]);

  // 合计数据：根据选定大区计算签单个数和总金额
  const { totalTcvCount, totalTcvAmount } = useMemo(() => {
    let count = 0;
    let amount = 0;
    activeTcvStats.forEach((s: any) => {
      count += s.count;
      amount += s.amount;
    });
    return { totalTcvCount: count, totalTcvAmount: amount };
  }, [activeTcvStats]);

  // 单元排名
  const sortedTcvStats = useMemo(() => {
    return [...activeTcvStats].sort((a: any, b: any) => b.amount - a.amount);
  }, [activeTcvStats]);

  // 提取当前筛选大区下排名前 5 的销售单元(国家)作为柱状图的分组国家
  const topCountries = useMemo(() => {
    return sortedTcvStats.slice(0, 5).map(item => item.unit);
  }, [sortedTcvStats]);

  // 计算 Top 5 销售单元在 selectedTcvYears 年份下的年度堆积签单数据 (金额与笔数)
  const yearlyChartStackedData = useMemo(() => {
    const years = selectedTcvYears.length > 0 ? [...selectedTcvYears].sort() : ['2024', '2025', '2026'];
    return years.map(yr => {
      let yearTotalAmount = 0;
      let yearTotalCount = 0;
      const countryData: Record<string, { amount: number; count: number }> = {};
      topCountries.forEach(cName => {
        const recs = tcvRecords.filter((r: any) => {
          const uName = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
          const signDate = String(r['合同签署日期'] || r['设置起租日期'] || '');
          const passRegion = selectedTcvRegion === 'All' || (r['大区中文名称'] || r['大区'] || '其他大区') === selectedTcvRegion;
          return passRegion && uName === cName && signDate.startsWith(yr);
        });
        const amount = recs.reduce((sum: number, r: any) => sum + parseFloat(r['签单金额(港币)'] || 0), 0);
        countryData[cName] = { amount, count: recs.length };
        yearTotalAmount += amount;
        yearTotalCount += recs.length;
      });
      return { year: yr, data: countryData, yearTotalAmount, yearTotalCount };
    });
  }, [tcvRecords, topCountries, selectedTcvYears, selectedTcvRegion]);

  // 获取各年份堆积柱最高的总金额，以确定 Y 轴刻度的最大值
  const stackedMaxVal = useMemo(() => {
    let max = 1;
    yearlyChartStackedData.forEach(yrData => {
      if (yrData.yearTotalAmount > max) max = yrData.yearTotalAmount;
    });
    return max;
  }, [yearlyChartStackedData]);

  // 当前选中年份、大区及销售单元下的已过滤签单记录全集
  const yearlyFilteredTcvRecords = useMemo(() => {
    return tcvRecords.filter((r: any) => {
      const signDate = String(r['合同签署日期'] || r['设置起租日期'] || '');
      const passYear = selectedTcvYears.length === 0 || selectedTcvYears.some(yr => signDate.startsWith(yr));
      if (!passYear) return false;

      if (selectedTcvRegion !== 'All') {
        const region = r['大区中文名称'] || r['大区'] || '其他大区';
        if (region !== selectedTcvRegion) return false;
      }

      if (selectedTcvUnit) {
        const unit = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
        if (unit !== selectedTcvUnit) return false;
      }

      return true;
    });
  }, [tcvRecords, selectedTcvYears, selectedTcvRegion, selectedTcvUnit]);

  // 当前筛选条件下的签单笔数与金额合计
  const currentSelectedTotalCount = yearlyFilteredTcvRecords.length;
  const currentSelectedTotalAmount = useMemo(() => {
    return yearlyFilteredTcvRecords.reduce((sum: number, r: any) => sum + parseFloat(r['签单金额(港币)'] || 0), 0);
  }, [yearlyFilteredTcvRecords]);

  // 按签约客户名称分组的金额统计数据 (降序)
  const customerGroupedTcvStats = useMemo(() => {
    const map = new Map<string, { signingCustomer: string; count: number; totalAmount: number }>();
    yearlyFilteredTcvRecords.forEach((r: any) => {
      const cust = r['签约客户名称'] || '未填签约客户';
      const amount = parseFloat(r['签单金额(港币)'] || 0);
      if (!map.has(cust)) {
        map.set(cust, { signingCustomer: cust, count: 0, totalAmount: 0 });
      }
      const item = map.get(cust)!;
      item.count += 1;
      item.totalAmount += amount;
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [yearlyFilteredTcvRecords]);

  // 提炼当前客户名称作为文件名前缀
  const companyPrefix = useMemo(() => {
    if (tcvRecords && tcvRecords.length > 0) {
      const first = tcvRecords[0];
      const name = first['签约客户名称'] || first['终端客户名称'];
      if (name) return name;
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      const n = sp.get('nameCn');
      if (n) return n;
    } catch (e) {}
    return '全量客户';
  }, [tcvRecords]);

  // 1. 导出签单全量明细
  const handleExportDetailExcel = useCallback(() => {
    const headers = ['签约客户名称', '终端客户名称', '销售单元', '电路编号', '合同签署日期', '产品分类', '签单金额 (港币)'];
    const keys = [
      (r: any) => r['签约客户名称'] || '—',
      (r: any) => r['终端客户名称'] || '—',
      (r: any) => r['销售单元'] || r['销售单元中文名称'] || r['销售单元编码'] || '—',
      (r: any) => r['电路编号'] || r['电路参考编号'] || '—',
      (r: any) => r['合同签署日期'] || r['设置起租日期'] || '—',
      (r: any) => r['产品分类'] || r['市场经分产品分类'] || r['TCV产品名称'] || '—',
      (r: any) => {
        const val = parseFloat(r['签单金额(港币)'] !== undefined ? r['签单金额(港币)'] : (r['签单金额（港币）'] || r['签单金额 (港币)'] || r['签单金额'] || 0));
        return val.toFixed(2);
      }
    ];
    const yrsStr = selectedTcvYears.length > 0 ? selectedTcvYears.join('_') : '全量';
    exportToCsvExcel(`${companyPrefix}_历史签单全量明细_${yrsStr}`, headers, keys, yearlyFilteredTcvRecords);
  }, [yearlyFilteredTcvRecords, selectedTcvYears, companyPrefix]);

  // 2. 导出签约客户分组汇总
  const handleExportCustomerGroupExcel = useCallback(() => {
    const headers = ['序号', '签约客户名称', '签单笔数', '签单金额合计 (港币)'];
    const keys = [
      (_: any, idx?: number) => (idx !== undefined ? idx + 1 : 1),
      (r: any) => r.signingCustomer || '未填签约客户',
      (r: any) => r.count,
      (r: any) => parseFloat(r.totalAmount || 0).toFixed(2)
    ];
    const yrsStr = selectedTcvYears.length > 0 ? selectedTcvYears.join('_') : '全量';
    exportToCsvExcel(`${companyPrefix}_签约客户签单金额汇总_${yrsStr}`, headers, keys, customerGroupedTcvStats);
  }, [customerGroupedTcvStats, selectedTcvYears, companyPrefix]);

  // 计算指定销售单元(国家)过去 3 年 (2024-2026) 签单趋势
  const getCountryYearlyStats = useCallback((countryName: string) => {
    const years = ['2024', '2025', '2026'];
    const stats = years.map(yr => {
      const recs = tcvRecords.filter((r: any) => {
        const uName = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
        const signDate = String(r['合同签署日期'] || r['设置起租日期'] || '');
        return uName === countryName && signDate.startsWith(yr);
      });
      const count = recs.length;
      const amount = recs.reduce((sum: number, r: any) => sum + parseFloat(r['签单金额(港币)'] || 0), 0);
      return { year: yr, count, amount };
    });
    const maxVal = Math.max(...stats.map(s => s.amount), 1);
    return { stats, maxVal };
  }, [tcvRecords]);

  // 根据当前联动的大区和销售单元(国家)过滤出活跃 TCV 签单明细列表
  const activeTcvRecords = useMemo(() => {
    return yearlyFilteredTcvRecords;
  }, [yearlyFilteredTcvRecords]);

  // 基于活跃 TCV 明细列表计算产品构成分布
  const PRODUCT_CATEGORY_MAP: Record<string, { parent: string; sub: string }> = {
    '算力服务': { parent: '算力服务', sub: '算力服务' },
    '多云服务': { parent: '算力服务', sub: '多云服务' },
    '数据中心': { parent: '算力服务', sub: '数据中心' },

    'IPVPN': { parent: '通讯服务', sub: 'IPVPN' },
    'SD-WAN': { parent: '通讯服务', sub: 'SD-WAN' },
    '云连接': { parent: '通讯服务', sub: '云连接' },
    '互联网转接': { parent: '通讯服务', sub: '互联网转接' },
    '全球卡': { parent: '通讯服务', sub: '全球卡' },
    '其他云网': { parent: '通讯服务', sub: '其他云网' },
    '国际专线': { parent: '通讯服务', sub: '国际专线' },
    'IPX': { parent: '通讯服务', sub: 'IPX' },
    'LBO流量包': { parent: '通讯服务', sub: 'LBO流量包' },
    '物联网连接': { parent: '通讯服务', sub: '物联网连接' },

    '5G应用': { parent: '智能服务', sub: '5G应用' },
    'A2P短信': { parent: '智能服务', sub: 'A2P短信' },
    'ICT': { parent: '智能服务', sub: 'ICT' },
    'MVNO': { parent: '智能服务', sub: 'MVNO' },
    '内容平台': { parent: '智能服务', sub: '内容平台' },
    '其他云网-CDN': { parent: '智能服务', sub: '其他云网-CDN' },
    '加速产品': { parent: '智能服务', sub: '加速产品' },
    '安全产品': { parent: '智能服务', sub: '安全产品' },
    '智能终端': { parent: '智能服务', sub: '智能终端' },
    '物联网应用': { parent: '智能服务', sub: '物联网应用' },
    '登陆站': { parent: '智能服务', sub: '登陆站' },
    '其他': { parent: '智能服务', sub: '其他' }
  };

  const productStatsMerged = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};
    activeTcvRecords.forEach((rec: any) => {
      const prodCategory = rec['市场经分产品分类'] || '其他';
      const mapping = PRODUCT_CATEGORY_MAP[prodCategory] || { parent: '智能服务', sub: '其他' };
      const largeCat = mapping.parent;
      const subCat = mapping.sub;
      const amount = parseFloat(rec['签单金额(港币)'] || 0);

      if (!stats[largeCat]) stats[largeCat] = {};
      if (!stats[largeCat][subCat]) stats[largeCat][subCat] = 0;
      stats[largeCat][subCat] += amount;
    });
    return stats;
  }, [activeTcvRecords]);

  const largeCatTotals = useMemo(() => {
    const totals: Record<string, number> = { '通讯服务': 0, '算力服务': 0, '智能服务': 0 };
    let grandTotal = 0;
    Object.keys(productStatsMerged).forEach(largeCat => {
      let sum = 0;
      const subCats = productStatsMerged[largeCat] || {};
      Object.keys(subCats).forEach(subCat => {
        sum += subCats[subCat];
      });
      totals[largeCat] = sum;
      grandTotal += sum;
    });
    return { totals, grandTotal };
  }, [productStatsMerged]);

  // --- 第五部分：项目计收费占比统计 ---
  // brStats: 计收费记录列表, tcvRecords: 签单合同明细列表
  const brStats = dashboardData?.brStats || [];

  // 计算 2026 年的项目计收占比数据
  const brProjectStats = useMemo(() => {
    // 1. 过滤出 2026 年签署合同的项目记录
    const tcv2026Records = tcvRecords.filter((r: any) =>
      String(r['合同签署日期'] || r['设置起租日期'] || '').startsWith('2026')
    );

    // 2. 按电路编号聚合项目的 TCV 金额
    const projectMap = new Map<string, { circuit: string; product: string; customer: string; tcvAmount: number; brAmount: number; realPercent: number }>();
    tcv2026Records.forEach((r: any) => {
      const circuit = String(r['电路编号'] || '无电路号').trim();
      if (!circuit || circuit === '无电路号') return;
      const amount = parseFloat(r['签单金额(港币)'] || 0);

      if (!projectMap.has(circuit)) {
        projectMap.set(circuit, {
          circuit,
          product: r['市场经分产品分类'] || '其他',
          customer: r['签约客户名称'] || '未知客户',
          tcvAmount: 0,
          brAmount: 0,
          realPercent: 0
        });
      }
      projectMap.get(circuit)!.tcvAmount += amount;
    });

    // 3. 关联计收费表（brStats），统计已计收的金额合计
    brStats.forEach((item: any) => {
      const circuit = String(item.电路参考编号 || '').trim();
      if (projectMap.has(circuit)) {
        const amount = parseFloat(item.金额 || 0);
        projectMap.get(circuit)!.brAmount += amount;
      }
    });

    // 4. 计算占比百分比并以 TCV 金额进行降序排序
    return Array.from(projectMap.values())
      .map(item => {
        const percent = item.tcvAmount > 0 ? (item.brAmount / item.tcvAmount) * 100 : 0;
        return {
          ...item,
          realPercent: percent
        };
      })
      .sort((a, b) => b.tcvAmount - a.tcvAmount);
  }, [tcvRecords, brStats]);

  // 2026年项目的总 TCV 与总计收金额
  const totalTcv2026Amount = useMemo(() => {
    return brProjectStats.reduce((sum, item) => sum + item.tcvAmount, 0);
  }, [brProjectStats]);

  const totalBrFor2026Projects = useMemo(() => {
    return brProjectStats.reduce((sum, item) => sum + item.brAmount, 0);
  }, [brProjectStats]);

  const brColumns = [
    { title: '签约客户名称', dataIndex: '签约客户名称', key: '签约客户名称' },
    { title: '数据月份', dataIndex: '数据月份', key: '数据月份', sorter: (a: any, b: any) => a.数据月份.localeCompare(b.数据月份) },
    { title: '电路参考编号', dataIndex: '电路参考编号', key: '电路参考编号' },
    { title: '大区', dataIndex: '大区中文名称', key: '大区中文名称' },
    { title: '销售单元', dataIndex: '销售单元中文名称', key: '销售单元中文名称' },
    { title: '产品分类', dataIndex: '市场经分产品分类', key: '市场经分产品分类' },
    { title: '分成比例 (%)', dataIndex: '分成比例', key: '分成比例', render: (val: any) => `${parseFloat(val || 0).toFixed(2)}%` },
    {
      title: '金额 (港币)',
      dataIndex: '金额',
      key: '金额',
      sorter: (a: any, b: any) => a.金额 - b.金额,
      align: 'right' as const,
      render: (val: any) => `${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`
    }
  ];

  if (loading || dashboardLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="正在加载 Dashboard 统计数据..." />
      </div>
    );
  }

  return (
    <div style={{ paddingRight: '4px', paddingBottom: '24px' }}>

      {/* 第一、二部分：母公司信息与客户经理 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card
            title={<span><InfoCircleOutlined style={{ marginRight: 6, color: '#1890ff' }} />基础信息</span>}
            bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}
            bodyStyle={{ padding: '16px' }}
          >
            {rootNode ? (
              <Descriptions column={2} bordered size="small" labelStyle={{ background: '#fafafa', fontWeight: 500 }}>
                <Descriptions.Item label="公司名称" span={2}>
                  <strong style={{ color: '#111' }}>{rootNode.companyNameCn || rootNode.companyNameEn || rootNode.name}</strong>
                  {rootNode.companyNameEn && rootNode.companyNameCn && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: 2 }}>{rootNode.companyNameEn}</div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Root GID">{rootNode.id}</Descriptions.Item>
                <Descriptions.Item label="DUNS 号">{rootNode.duns || '—'}</Descriptions.Item>
                <Descriptions.Item label="注册国家">{rootNode.registeredCountry || rootNode.position || '—'}</Descriptions.Item>
                <Descriptions.Item label="注册城市">{rootNode.registeredCity || rootNode.city || '—'}</Descriptions.Item>
                <Descriptions.Item label="行业分类">{rootNode.cmiIndustry || '—'}</Descriptions.Item>
                <Descriptions.Item label="CMCC行业">{rootNode.cmccIndustry || '—'}</Descriptions.Item>
                <Descriptions.Item label="主营业务" span={2}>{rootNode.mainBusiness || '—'}</Descriptions.Item>
                <Descriptions.Item label="运营状态">{rootNode.operatingStatus || '—'}</Descriptions.Item>
                <Descriptions.Item label="建立日期">{rootNode.establishmentDate || '—'}</Descriptions.Item>
              </Descriptions>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>未找到根节点母公司数据</div>
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card
            title={<span><TeamOutlined style={{ marginRight: 6, color: '#52c41a' }} />CMI内地客户经理</span>}
            bordered={false}
            style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}
            bodyStyle={{ padding: '16px', overflowY: 'auto', maxHeight: '315px' }}
          >
            {cmiContacts.length > 0 ? (
              <Row gutter={[12, 12]}>
                {cmiContacts.map((contact: any, index: number) => (
                  <Col span={24} key={index}>
                    <div style={{
                      background: '#f6ffed',
                      border: '1px solid #d9f7be',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ fontWeight: 600, color: '#389e0d', fontSize: '14px', marginBottom: '6px' }}>
                        👤 {contact.name || '—'} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }}>({contact.role || '客户经理'})</span>
                      </div>
                      <Descriptions size="small" column={1} colon={false} contentStyle={{ fontSize: '12px' }} labelStyle={{ color: '#666', width: '80px', fontSize: '12px' }}>
                        <Descriptions.Item label="部门">{contact.department || '—'}</Descriptions.Item>
                        <Descriptions.Item label="电话"><span style={{ color: '#096dd9' }}>{contact.phoneNumber || '—'}</span></Descriptions.Item>
                        <Descriptions.Item label="邮箱">{contact.email || '—'}</Descriptions.Item>
                        <Descriptions.Item label="城市">{contact.City || '—'}</Descriptions.Item>
                      </Descriptions>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999', fontStyle: 'italic' }}>
                暂无客户经理维护信息
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 第三部分：海外分支的统计信息 */}
      <Card
        title={<span><GlobalOutlined style={{ marginRight: 6, color: '#1890ff' }} />海外分支机构分布 (共 {branchNodes.length} 个分支｜{siteNodes.length} 个网点)</span>}
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 16 }}
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            ['Europe', 'APAC', 'Americas'],
            ['MENA', 'STA', 'Euro-Asia'],
            ['Mainland China', 'HKM', 'TW']
          ].map((row, rowIdx) => (
            <Row key={rowIdx} gutter={[16, 16]} style={{ display: 'flex', flexWrap: 'wrap' }}>
              {row.map(region => {
                const countryMap = (branchStats[region] && branchStats[region].countries) || {};
                const sortedCountries = Object.keys(countryMap).map(c => ({
                  name: c,
                  branchCount: countryMap[c].branchCount,
                  siteCount: countryMap[c].siteCount
                })).sort((a, b) => {
                  if (b.branchCount !== a.branchCount) return b.branchCount - a.branchCount;
                  return b.siteCount - a.siteCount;
                });

                const regionBranchTotal = (branchStats[region] && branchStats[region].branchCount) || 0;
                const regionSiteTotal = (branchStats[region] && branchStats[region].siteCount) || 0;

                return (
                  <Col key={region} xs={24} md={8} style={{ display: 'flex', flexDirection: 'column' }}>
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ background: '#e6f7ff', color: '#1890ff', padding: '1px 6px', borderRadius: 10, fontSize: '11px', fontWeight: 'bold' }}>
                            {regionBranchTotal} 分支
                          </span>
                          {regionSiteTotal > 0 && (
                            <span style={{ background: '#fff7e6', color: '#fa8c16', padding: '1px 6px', borderRadius: 10, fontSize: '11px', fontWeight: 'bold' }}>
                              {regionSiteTotal} 网点
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 国家列表小标签 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingRight: 4 }}>
                        {sortedCountries.length === 0 ? (
                          <span style={{ color: '#ccc', fontSize: '12px', padding: '4px 0' }}>暂无国家数据</span>
                        ) : (
                          sortedCountries.map(c => (
                            <React.Fragment key={c.name}>
                              {/* 1. 分支 Badge */}
                              {c.branchCount > 0 && (
                                <div
                                  onClick={() => {
                                    setSelectedCountry(c.name);
                                    setDrawerType('branch');
                                    setDrawerVisible(true);
                                  }}
                                  className="country-hover-badge"
                                  style={{
                                    background: '#fff',
                                    border: '1px solid #e8e8e8',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span style={{ color: '#666' }}>{c.name}</span>
                                  <strong style={{ color: '#1890ff' }}>{c.branchCount}</strong>
                                </div>
                              )}

                              {/* 2. 网点 Badge (背景用浅灰色 #f5f5f5/#f0f0f0) */}
                              {c.siteCount > 0 && (
                                <div
                                  onClick={() => {
                                    setSelectedCountry(c.name);
                                    setDrawerType('site');
                                    setDrawerVisible(true);
                                  }}
                                  className="country-hover-badge"
                                  style={{
                                    background: '#f5f5f5',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <span style={{ color: '#666' }}>{c.name}</span>
                                  <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>{c.siteCount}网点</span>
                                </div>
                              )}
                            </React.Fragment>
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

      {/* 海外分支机构与网点全球地图可视化分布 */}
      <OverseasBranchWorldMap
        branchNodes={branchNodes}
        siteNodes={siteNodes}
        onSelectCountry={(countryName, type) => {
          setSelectedCountry(countryName);
          setDrawerType(type || 'branch');
          setDrawerVisible(true);
        }}
      />

      {/* 国家海外分支机构明细展示抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlobalOutlined style={{ color: drawerType === 'site' ? '#fa8c16' : '#1890ff' }} />
            <span>【{selectedCountry}】海外{drawerType === 'site' ? '营业网点' : '分支机构'}明细</span>
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={750}
        bodyStyle={{ padding: '20px', background: '#f5f7fa' }}
      >
        <div style={{ background: '#fff', padding: '16px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
              {drawerType === 'site' ? '营业网点列表' : '分支机构列表'} (共 {branchesInCountry.length} 个)
            </span>
          </div>
          <Table
            dataSource={branchesInCountry}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            onRow={(record) => {
              const isNationAgent = record.nationAgent === 'TRUE' || record.nationAgent === 'true' || record.nationAgent === true;
              if (isNationAgent) {
                return {
                  style: { backgroundColor: '#fff1f0' } // 国家代表用浅红色背景
                };
              }
              return {};
            }}
            columns={[
              {
                title: '公司名称 (中文 / 英文)',
                dataIndex: 'name',
                key: 'name',
                render: (text, record) => (
                  <span style={{ fontWeight: 500, color: '#333' }}>
                    🏢 {record.companyNameCn || text || record.id}
                    {record.companyNameEn && record.companyNameEn !== record.companyNameCn && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: 2, fontWeight: 'normal' }}>
                        {record.companyNameEn}
                      </div>
                    )}
                  </span>
                )
              },
              {
                title: '注册城市',
                dataIndex: 'registeredCity',
                key: 'registeredCity',
                render: (text, record) => text || record.city || '—'
              },
              {
                title: '注册地址',
                dataIndex: 'registeredAddress',
                key: 'registeredAddress',
                render: (text, record) => text || record.position || '—'
              },
              {
                title: '企业性质',
                dataIndex: 'enterpriseNature',
                key: 'enterpriseNature',
                render: (text) => text || '—'
              }
            ]}
          />
        </div>
      </Drawer>

      {/* 第四部分：历史签单情况 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DollarOutlined style={{ color: '#f5222d' }} />
              分支与 CMI 历史签单统计情况
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#555' }}>年份选择:</span>
                <Select
                  mode="multiple"
                  size="small"
                  value={selectedTcvYears}
                  onChange={setSelectedTcvYears}
                  style={{ minWidth: 120, maxWidth: 220 }}
                  placeholder="选择年份"
                  maxTagCount="responsive"
                  options={[
                    { label: '2026年', value: '2026' },
                    { label: '2025年', value: '2025' },
                    { label: '2024年', value: '2024' },
                    { label: '2023年', value: '2023' },
                    { label: '2022年', value: '2022' }
                  ]}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#555' }}>大区选择:</span>
                <Select
                  size="small"
                  value={selectedTcvRegion}
                  onChange={setSelectedTcvRegion}
                  style={{ width: 150 }}
                  options={tcvRegions.map(r => ({ label: r === 'All' ? '全部大区汇总' : r, value: r }))}
                />
              </div>
            </div>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 16 }}
      >
        <Row gutter={16} style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* 第一列：销售单元 (国家公司) 堆积柱状图 + 右侧汇总卡片 (span={11}) */}
          <Col span={11}>
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {sortedTcvStats.length > 0 ? (
                <Row gutter={12} align="middle">
                  {/* 左侧：堆积柱状图与图例 */}
                  <Col span={14}>
                    {/* 国家/单元色彩映射图例 (点击可快速联动筛选该国家) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', marginBottom: 10 }}>
                      {topCountries.map((cName, idx) => {
                        const COUNTRY_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'];
                        const isSelected = selectedTcvUnit === cName;
                        return (
                          <div
                            key={cName}
                            onClick={() => setSelectedTcvUnit(isSelected ? null : cName)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '11px',
                              color: isSelected ? '#1890ff' : '#666',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              border: isSelected ? '1px solid #91d5ff' : '1px solid transparent',
                              background: isSelected ? '#e6f7ff' : 'transparent',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: COUNTRY_COLORS[idx % COUNTRY_COLORS.length],
                              marginRight: 4
                            }}></span>
                            {cName}
                          </div>
                        );
                      })}
                    </div>

                    {/* SVG 手工堆积柱状图面板 */}
                    <div style={{ width: '100%', height: '280px', position: 'relative' }}>
                      <svg viewBox="0 0 400 280" width="100%" height="100%" style={{ display: 'block' }}>
                        <defs>
                          {topCountries.map((cName, idx) => {
                            const COUNTRY_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'];
                            const col = COUNTRY_COLORS[idx % COUNTRY_COLORS.length];
                            return (
                              <linearGradient key={cName} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={col} />
                                <stop offset="100%" stopColor={col + 'aa'} />
                              </linearGradient>
                            );
                          })}
                        </defs>

                        {/* 背景虚线网格与 Y 轴刻度 (以百万 HKD 为单位) */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                          const y = 20 + (200 * (1 - ratio));
                          const val = (stackedMaxVal / 1000000) * ratio;
                          return (
                            <g key={idx}>
                              <line x1="38" y1={y} x2="390" y2={y} stroke="#f0f0f0" strokeDasharray="3,3" />
                              <text x="33" y={y + 3.5} textAnchor="end" fontSize="8" fill="#aaa">{val.toFixed(2)}M</text>
                            </g>
                          );
                        })}

                        {/* 按选中年份堆积柱状图渲染 (多单元堆叠为一根柱) */}
                        {yearlyChartStackedData.map((yrData, yIdx) => {
                          const xStart = 45;
                          const xEnd = 385;
                          const countYears = yearlyChartStackedData.length;
                          const interval = countYears > 0 ? (xEnd - xStart) / countYears : 340;
                          const groupCenterX = xStart + interval * yIdx + interval / 2;
                          const barWidth = 26; // 堆积柱宽度
                          const barX = groupCenterX - barWidth / 2;

                          let currentY = 220;

                          return (
                            <g key={yrData.year}>
                              {/* 年份标题 */}
                              <text x={groupCenterX} y="245" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#555">
                                {yrData.year}年
                              </text>

                              {/* 垂直分层堆叠各个销售单元 */}
                              {topCountries.map((cName, cIdx) => {
                                const val = yrData.data[cName] || { amount: 0, count: 0 };
                                if (val.amount <= 0 && val.count <= 0) return null;

                                const segmentH = (val.amount / stackedMaxVal) * 200;
                                const segmentY = currentY - segmentH;
                                currentY = segmentY; // 为上层提供起点

                                const isSelected = selectedTcvUnit === cName;
                                const isAnySelected = selectedTcvUnit !== null;

                                return (
                                  <g key={cName}>
                                    <Tooltip title={`${yrData.year}年 [${cName}]: ${val.count} 笔 / ${(val.amount / 1000000).toFixed(2)} M HKD`}>
                                      <rect
                                        x={barX}
                                        y={segmentY}
                                        width={barWidth}
                                        height={segmentH}
                                        fill={`url(#grad-${cIdx})`}
                                        stroke="#ffffff"
                                        strokeWidth="1"
                                        rx={1}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        opacity={isAnySelected ? (isSelected ? 1 : 0.3) : 1}
                                        onClick={() => setSelectedTcvUnit(isSelected ? null : cName)}
                                      />
                                    </Tooltip>
                                  </g>
                                );
                              })}

                              {/* 柱顶部绘制该年份全单元总签单笔数 */}
                              {yrData.yearTotalCount > 0 && (
                                <text
                                  x={groupCenterX}
                                  y={Math.max(currentY - 4, 12)}
                                  textAnchor="middle"
                                  fontSize="8.5"
                                  fill="#1890ff"
                                  fontWeight="bold"
                                >
                                  {yrData.yearTotalCount}笔
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* X 轴横基线 */}
                        <line x1="38" y1="220" x2="390" y2="220" stroke="#ccc" strokeWidth="1" />
                      </svg>
                    </div>
                  </Col>

                  {/* 右侧：上下 2 个数据统计卡片 */}
                  <Col span={10}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', height: '100%', minHeight: '280px' }}>
                      {/* 卡片1：签单数合计 */}
                      <div
                        onClick={() => setDetailModalVisible(true)}
                        style={{
                          background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)',
                          border: '1px solid #91d5ff',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(24,144,255,0.08)',
                          transition: 'all 0.2s cubic-bezier(0.38, 0, 0.24, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(24,144,255,0.22)';
                          e.currentTarget.style.borderColor = '#1890ff';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.08)';
                          e.currentTarget.style.borderColor = '#91d5ff';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '12px', color: '#595959', fontWeight: 600 }}>签单数合计</span>
                          <FileTextOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1890ff', lineHeight: 1.2 }}>
                          {currentSelectedTotalCount.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>笔</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span>点击查看全量明细</span>
                          <RightOutlined style={{ fontSize: 9 }} />
                        </div>
                      </div>

                      {/* 卡片2：签单金额合计 */}
                      <div
                        onClick={() => setCustomerGroupModalVisible(true)}
                        style={{
                          background: 'linear-gradient(135deg, #fff1f0 0%, #ffffff 100%)',
                          border: '1px solid #ffa39e',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245,34,45,0.08)',
                          transition: 'all 0.2s cubic-bezier(0.38, 0, 0.24, 1)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(245,34,45,0.22)';
                          e.currentTarget.style.borderColor = '#ff4d4f';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(245,34,45,0.08)';
                          e.currentTarget.style.borderColor = '#ffa39e';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '12px', color: '#595959', fontWeight: 600 }}>签单金额合计</span>
                          <DollarOutlined style={{ fontSize: '18px', color: '#f5222d' }} />
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#cf1322', lineHeight: 1.2, wordBreak: 'break-all' }}>
                          {(currentSelectedTotalAmount / 1000000).toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#666' }}>M HKD</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 8, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span>按签约客户查看汇总</span>
                          <RightOutlined style={{ fontSize: 9 }} />
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#999', fontStyle: 'italic' }}>
                  当前筛选条件下暂无历史签单趋势数据
                </div>
              )}
            </div>
          </Col>

          {/* 第二列：CMI 产品大类分解 (span={6}) */}
          <Col span={6}>
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 16 }}>
                📦 CMI 产品大类占比
              </div>

              {largeCatTotals.grandTotal > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['通讯服务', '算力服务', '智能服务'].map(cat => {
                    const amount = largeCatTotals.totals[cat] || 0;
                    const percent = parseFloat(((amount / (largeCatTotals.grandTotal || 1)) * 100).toFixed(1));
                    const isSelected = selectedLargeProductCat === cat;

                    return (
                      <div
                        key={cat}
                        onClick={() => setSelectedLargeProductCat(cat)}
                        style={{
                          border: isSelected ? '1px solid #91d5ff' : '1px solid #e8e8e8',
                          background: isSelected ? '#e6f7ff' : '#fff',
                          borderRadius: '6px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: isSelected ? '#1890ff' : '#444' }}>{cat}</span>
                          <span style={{ color: '#666' }}>
                            {(amount / 1000000).toFixed(2)}M HKD ({percent}%)
                          </span>
                        </div>
                        <Progress
                          percent={percent}
                          strokeColor={cat === '通讯服务' ? '#1890ff' : cat === '算力服务' ? '#722ed1' : '#52c41a'}
                          showInfo={false}
                          strokeWidth={6}
                          style={{ margin: 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#999', fontStyle: 'italic' }}>
                  当前筛选条件下暂无大类数据
                </div>
              )}
            </div>
          </Col>

          {/* 第三列：子分类小类分解排行 (span={7}) */}
          <Col span={7}>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold', marginBottom: 12, borderBottom: '1px solid #e8e8e8', paddingBottom: 6 }}>
                📝 【{selectedLargeProductCat}】小类排行
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                {productStatsMerged[selectedLargeProductCat] && Object.keys(productStatsMerged[selectedLargeProductCat]).length > 0 ? (
                  Object.entries(productStatsMerged[selectedLargeProductCat])
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([subCat, amount]) => (
                      <div
                        key={subCat}
                        onClick={() => {
                          setSelectedSubCat(subCat);
                          const filtered = activeTcvRecords.filter((r: any) => {
                            const prodCategory = r['市场经分产品分类'] || '其他';
                            const mapping = PRODUCT_CATEGORY_MAP[prodCategory] || { parent: '智能服务', sub: '其他' };
                            return mapping.sub === subCat;
                          });
                          setSubCatTcvRecords(filtered);
                          setSubCatModalVisible(true);
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'row', // 改为水平排列布局以实现对齐
                          justifyContent: 'space-between', // 名称居左，金额居右分布
                          alignItems: 'center', // 垂直方向居中对齐
                          borderBottom: '1px dashed #f0f0f0',
                          paddingBottom: 4
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e6f7ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ color: '#555', fontWeight: 500 }}>{subCat}</span>
                        <span style={{ fontWeight: 600, color: '#1890ff' }}>
                          {(amount / 1000000).toFixed(2)}M HKD
                        </span>
                      </div>
                    ))
                ) : (
                  <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '40px 0', flex: 1 }}>
                    暂无子小类数据
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 需求3 Modal：点击「签单数合计」，弹出 modal 使用 AG Grid 显示所有签单明细 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>历史签单明细列表 (年份: {selectedTcvYears.length > 0 ? selectedTcvYears.join(', ') : '全量'})</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="export" icon={<DownloadOutlined />} onClick={handleExportDetailExcel}>
            导出 Excel
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1100}
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 12, color: '#666', fontSize: 12 }}>
          当前筛选条件下共计 <strong style={{ color: '#1890ff' }}>{yearlyFilteredTcvRecords.length}</strong> 笔签单明细
        </div>
        <div className="ag-theme-alpine" style={{ width: '100%', height: 450 }}>
          <AgGridReact
            rowData={yearlyFilteredTcvRecords}
            columnDefs={[
              {
                headerName: '签约客户名称',
                field: '签约客户名称',
                minWidth: 160,
                flex: 1,
                valueGetter: (params: any) => params.data?.['签约客户名称'] || '—',
                filter: true,
                sortable: true
              },
              {
                headerName: '终端客户名称',
                field: '终端客户名称',
                minWidth: 160,
                flex: 1,
                valueGetter: (params: any) => params.data?.['终端客户名称'] || '—',
                filter: true,
                sortable: true
              },
              {
                headerName: '销售单元',
                field: '销售单元',
                width: 140,
                valueGetter: (params: any) => {
                  const r = params.data || {};
                  return r['销售单元'] || r['销售单元中文名称'] || r['销售单元编码'] || '—';
                },
                filter: true,
                sortable: true
              },
              {
                headerName: '电路编号',
                field: '电路编号',
                width: 140,
                valueGetter: (params: any) => {
                  const r = params.data || {};
                  return r['电路编号'] || r['电路参考编号'] || '—';
                },
                filter: true,
                sortable: true
              },
              {
                headerName: '合同签署日期',
                field: '合同签署日期',
                width: 130,
                valueGetter: (params: any) => {
                  const r = params.data || {};
                  return r['合同签署日期'] || r['设置起租日期'] || '—';
                },
                filter: true,
                sortable: true
              },
              {
                headerName: '产品分类',
                field: '产品分类',
                width: 130,
                valueGetter: (params: any) => {
                  const r = params.data || {};
                  return r['产品分类'] || r['市场经分产品分类'] || r['TCV产品名称'] || '—';
                },
                filter: true,
                sortable: true
              },
              {
                headerName: '签单金额 (港币)',
                field: '签单金额(港币)',
                width: 160,
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', fontWeight: 'bold' },
                valueGetter: (params: any) => {
                  const r = params.data || {};
                  return parseFloat(r['签单金额(港币)'] !== undefined ? r['签单金额(港币)'] : (r['签单金额（港币）'] || r['签单金额 (港币)'] || r['签单金额'] || 0));
                },
                valueFormatter: (params: any) => {
                  const val = parseFloat(params.value || 0);
                  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                },
                filter: true,
                sortable: true
              }
            ]}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true
            }}
            pagination={true}
            paginationPageSize={100}
          />
        </div>
      </Modal>

      {/* 需求4 Modal：点击「签单金额合计」，弹出 modal 使用 AG Grid 显示，按照「签约客户名称」分组 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarOutlined style={{ color: '#f5222d' }} />
            <span>签约客户签单金额汇总 (按签约客户名称分组)</span>
          </div>
        }
        open={customerGroupModalVisible}
        onCancel={() => setCustomerGroupModalVisible(false)}
        footer={[
          <Button key="export" icon={<DownloadOutlined />} onClick={handleExportCustomerGroupExcel}>
            导出 Excel
          </Button>,
          <Button key="close" type="primary" onClick={() => setCustomerGroupModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 12, color: '#666', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>签约客户数: <strong style={{ color: '#1890ff' }}>{customerGroupedTcvStats.length}</strong> 家</span>
          <span>签单总金额: <strong style={{ color: '#cf1322' }}>{currentSelectedTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD</strong></span>
        </div>
        <div className="ag-theme-alpine" style={{ width: '100%', height: 450 }}>
          <AgGridReact
            rowData={customerGroupedTcvStats}
            columnDefs={[
              { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 70, filter: false, sortable: false },
              { headerName: '签约客户名称', field: 'signingCustomer', minWidth: 240, flex: 1, filter: true, sortable: true },
              { headerName: '签单笔数', field: 'count', width: 120, type: 'numericColumn', cellStyle: { textAlign: 'right' }, filter: true, sortable: true },
              {
                headerName: '签单金额合计 (港币)',
                field: 'totalAmount',
                width: 200,
                type: 'numericColumn',
                cellStyle: { textAlign: 'right', fontWeight: 'bold', color: '#1890ff' },
                valueFormatter: (params: any) => {
                  const val = parseFloat(params.value || 0);
                  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                },
                filter: true,
                sortable: true
              }
            ]}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true
            }}
            pagination={true}
            paginationPageSize={100}
          />
        </div>
      </Modal>

      {/* 第五部分：项目计收占比柱状图 */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ProfileOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                {selectedBrYears.length > 0 ? [...selectedBrYears].sort().join(',') : '无'}年项目计收情况
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 'normal' }}>年份过滤:</span>
                <Select
                  mode="multiple"
                  size="small"
                  value={selectedBrYears}
                  onChange={setSelectedBrYears}
                  style={{ minWidth: 120, maxWidth: 220 }}
                  placeholder="选择年份"
                  maxTagCount="responsive"
                  options={[
                    { label: '2026年', value: '2026' },
                    { label: '2025年', value: '2025' },
                    { label: '2024年', value: '2024' },
                    { label: '2023年', value: '2023' },
                    { label: '2022年', value: '2022' }
                  ]}
                />
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 'normal', color: '#666' }}>
              {selectedBrYears.length > 0 ? [...selectedBrYears].sort().join(',') : '无'}年项目总签单 (TCV): <strong style={{ color: '#1890ff' }}>{(totalTcv2026Amount / 1000000).toFixed(4)}M</strong> | 已计收: <strong style={{ color: '#52c41a' }}>{(totalBrFor2026Projects / 1000000).toFixed(4)}M</strong> 港币
            </span>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        {brProjectStats.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '350px', overflowY: 'auto', paddingRight: 4 }}>
            {brProjectStats.map((item: any, index: number) => {
              return (
                <div key={item.circuit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: '#444' }}>
                      {index + 1}. 电路: {item.circuit} <span style={{ color: '#999', fontSize: 11, fontWeight: 'normal' }}>({item.product} | {item.customer})</span>
                    </span>
                    <span style={{ color: '#333' }}>
                      已收 <strong>{item.brAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> / TCV <strong>{item.tcvAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD</strong> (计收率: <strong style={{ color: item.realPercent >= 100 ? '#52c41a' : '#1890ff' }}>{item.realPercent.toFixed(2)}%</strong>)
                    </span>
                  </div>
                  <Progress
                    percent={Math.min(item.realPercent, 100)}
                    strokeColor={item.realPercent >= 100 ? '#52c41a' : 'linear-gradient(90deg, #722ed1 0%, #fa541c 100%)'}
                    showInfo={false}
                    status="active"
                    strokeWidth={6}
                    style={{ margin: 0 }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#999', fontStyle: 'italic' }}>
            2026年暂无任何项目的财务计收费实收与签单关联数据
          </div>
        )}
      </Card>

      {/* 子小类签单合同明细弹出 Modal */}
      <Modal
        title={<span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: 15 }}>📄 【{selectedSubCat}】产品小类签单合同明细列表</span>}
        open={subCatModalVisible}
        onCancel={() => setSubCatModalVisible(false)}
        footer={null}
        width={950}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Table
          dataSource={subCatTcvRecords}
          rowKey="_id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
          bordered
          columns={[
            { title: '签约客户名称', dataIndex: '签约客户名称', key: '签约客户名称', width: 220 },
            { title: '终端客户名称', dataIndex: '终端客户名称', key: '终端客户名称', width: 220 },
            { title: '大区', dataIndex: '大区中文名称', key: '大区中文名称', width: 100 },
            { title: '销售单元', dataIndex: '销售单元中文名称', key: '销售单元中文名称', width: 110 },
            { title: '电路编号', dataIndex: '电路编号', key: '电路编号', width: 130 },
            { title: '合同签署日期', dataIndex: '合同签署日期', key: '合同签署日期', width: 120 },
            { title: '产品分类', dataIndex: '市场经分产品分类', key: '市场经分产品分类', width: 130 },
            {
              title: '签单金额 (港币)',
              dataIndex: '签单金额(港币)',
              key: '签单金额(港币)',
              align: 'right' as const,
              width: 140,
              render: (val: any) => `${parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD`
            }
          ]}
        />
      </Modal>
    </div>
  );
};

// 全局缓存已渗透的 GIDs 映射以防止 React 状态不一致引起的计算落空
const globalPenetratedGidsMap = new Map<string, string[]>();

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
  const [showSites, setShowSites] = useState(false); // 是否显示营业网点，默认不显示
  const [penetratedGids, setPenetratedGids] = useState<string[]>([]);

  // 计算当前家族树的节点渗透率与渗透率百分比 (结合全局缓存防 React 状态不同步与防崩溃双保险计算)
  const activeGids = (penetratedGids && Array.isArray(penetratedGids) && penetratedGids.length > 0)
    ? penetratedGids
    : (globalPenetratedGidsMap.get(String(gid || '')) || []);
  const penetratedNodesCount = (!originalData || !Array.isArray(originalData) || originalData.length === 0 || activeGids.length === 0)
    ? 0
    : originalData.filter(d => d && activeGids.map(String).includes(String(d.id || d.GID))).length;
  const penetrationRate = (!originalData || !Array.isArray(originalData) || originalData.length === 0)
    ? '0.00%'
    : ((penetratedNodesCount / originalData.length) * 100).toFixed(2) + '%';

  // 树数据过滤重连函数：若隐藏营业网点，将隐藏节点的子节点重连到最近的非 Site 祖先节点，防止树断层

  const filterTreeData = useCallback((data: any[], displaySites: boolean) => {
    if (displaySites) return data;

    const nonSiteData = data.filter(item => item.entityTypeName !== 'Site');
    const nonSiteIds = new Set(nonSiteData.map(item => item.id));
    const idToNodeMap = new Map(data.map(item => [item.id, item]));

    return nonSiteData.map(item => {
      let pId = item.parentId;
      // 循环寻找，直到祖先节点未被过滤或到达最顶层
      while (pId && !nonSiteIds.has(pId)) {
        const parentNode = idToNodeMap.get(pId);
        pId = parentNode ? parentNode.parentId : '';
      }
      return {
        ...item,
        parentId: pId
      };
    });
  }, []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [gidToTcvMap, setGidToTcvMap] = useState<Record<string, any[]>>({});
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState<any>(null);
  const [tableSearchText, setTableSearchText] = useState('');

  // 比对 Tab 状态
  const [diffRowData, setDiffRowData] = useState<any[]>([]);
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [diffSearchText, setDiffSearchText] = useState<string>('');

  // 映射 Tab 状态
  const [mappingRowData, setMappingRowData] = useState<any[]>([]);
  const [mappingLoading, setMappingLoading] = useState<boolean>(false);
  const [mappingSearchText, setMappingSearchText] = useState<string>('');
  const mappingGridRef = useRef<any>(null);

  // 治理比对 Tab 状态
  const [governanceRowData, setGovernanceRowData] = useState<any[]>([]);
  const [governanceLoading, setGovernanceLoading] = useState<boolean>(false);
  const [governanceSearchText, setGovernanceSearchText] = useState<string>('');
  const [governanceKeywordsOptions, setGovernanceKeywordsOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [savedKeywords, setSavedKeywords] = useState<string[]>([]);
  const [submittingKeywords, setSubmittingKeywords] = useState<boolean>(false);
  const governanceGridRef = useRef<any>(null);
  // 参与方新增树节点 Modal 状态
  const [addNodeModalVisible, setAddNodeModalVisible] = useState<boolean>(false);
  const [addNodeFormData, setAddNodeFormData] = useState<any>({});
  const addNodeFormDataRef = useRef<any>({});
  const [targetParticipantRow, setTargetParticipantRow] = useState<any>(null);
  const [submittingAddNode, setSubmittingAddNode] = useState<boolean>(false);
  const [translatingCn, setTranslatingCn] = useState<boolean>(false);
  const [translatingEn, setTranslatingEn] = useState<boolean>(false);
  const [grandparentNodeInfo, setGrandparentNodeInfo] = useState<any>(null);
  const [citySearchInput, setCitySearchInput] = useState<string>('');

  const updateAddNodeFormData = useCallback((updater: any) => {
    setAddNodeFormData((prev: any) => {
      const nextVal = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      addNodeFormDataRef.current = nextVal;
      return nextVal;
    });
  }, []);

  const [rawParticipantOriginals, setRawParticipantOriginals] = useState<{ country: string; region: string; city: string }>({
    country: '-',
    region: '-',
    city: '-'
  });

  // 全量 keyGlobalFamilyTree 集合 distinct 下拉选项状态 (如全量 151 个国家等)
  const [globalDistinctOptions, setGlobalDistinctOptions] = useState<{
    registeredCountryOptions: { value: string; label: string }[];
    cmiRegionOptions: { value: string; label: string }[];
    registeredCityOptions: { value: string; label: string }[];
    entityTypeOptions: { value: string; label: string }[];
    enterpriseNatureOptions: { value: string; label: string }[];
    cmiIndustryOptions: { value: string; label: string }[];
    countryToRegionMap: Record<string, string>;
  }>({
    registeredCountryOptions: [],
    cmiRegionOptions: [],
    registeredCityOptions: [],
    entityTypeOptions: [],
    enterpriseNatureOptions: [],
    cmiIndustryOptions: [],
    countryToRegionMap: {},
  });

  const fetchGlobalDistinctOptions = useCallback(async () => {
    try {
      const res = await request('/api/v1/key-customer-overview/family-tree-distinct-options');
      if (res && res.code === 200 && res.data) {
        setGlobalDistinctOptions(res.data);
      }
    } catch (err) {
      console.error('获取 keyGlobalFamilyTree 全表 distinct 下拉选项失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalDistinctOptions();
  }, [fetchGlobalDistinctOptions]);

  // 从 keyGlobalFamilyTree 全量集合及 originalData 提炼 distinct 去重下拉列表 items
  const familyTreeOptions = useMemo(() => {
    const entityTypes = new Set<string>((globalDistinctOptions?.entityTypeOptions || []).map(o => o.value));
    const natures = new Set<string>((globalDistinctOptions?.enterpriseNatureOptions || []).map(o => o.value));
    const countries = new Set<string>((globalDistinctOptions?.registeredCountryOptions || []).map(o => o.value));
    const regions = new Set<string>((globalDistinctOptions?.cmiRegionOptions || []).map(o => o.value));
    const cities = new Set<string>((globalDistinctOptions?.registeredCityOptions || []).map(o => o.value));
    const cmiIndustries = new Set<string>((globalDistinctOptions?.cmiIndustryOptions || []).map(o => o.value));

    (originalData || []).forEach((node: any) => {
      if (node.entityTypeName && typeof node.entityTypeName === 'string' && node.entityTypeName.trim()) {
        entityTypes.add(node.entityTypeName.trim());
      }
      if (node.enterpriseNature && typeof node.enterpriseNature === 'string' && node.enterpriseNature.trim()) {
        natures.add(node.enterpriseNature.trim());
      }
      if (node.registeredCountry && typeof node.registeredCountry === 'string' && node.registeredCountry.trim()) {
        countries.add(node.registeredCountry.trim());
      }
      if (node.cmiRegion && typeof node.cmiRegion === 'string' && node.cmiRegion.trim()) {
        regions.add(node.cmiRegion.trim());
      }
      if (node.registeredCity && typeof node.registeredCity === 'string' && node.registeredCity.trim()) {
        cities.add(node.registeredCity.trim());
      }
      if (node.cmiIndustry && typeof node.cmiIndustry === 'string' && node.cmiIndustry.trim()) {
        cmiIndustries.add(node.cmiIndustry.trim());
      }
    });

    return {
      entityTypeOptions: Array.from(entityTypes).sort().map(v => ({ value: v, label: v })),
      enterpriseNatureOptions: Array.from(natures).sort().map(v => ({ value: v, label: v })),
      registeredCountryOptions: Array.from(countries).sort().map(v => ({ value: v, label: v })),
      cmiRegionOptions: Array.from(regions).sort().map(v => ({ value: v, label: v })),
      registeredCityOptions: Array.from(cities).sort().map(v => ({ value: v, label: v })),
      cmiIndustryOptions: Array.from(cmiIndustries).sort().map(v => ({ value: v, label: v })),
    };
  }, [originalData, globalDistinctOptions]);

  // 需求3：注册城市动态派生下拉列表 (支持手工输入不在列表里的新城市)
  const dynamicCityOptions = useMemo(() => {
    const base = familyTreeOptions.registeredCityOptions || [];
    if (citySearchInput && citySearchInput.trim() && !base.some(o => o.value.toLowerCase() === citySearchInput.trim().toLowerCase())) {
      return [
        { value: citySearchInput.trim(), label: `➕ 使用手工输入城市: "${citySearchInput.trim()}"` },
        ...base
      ];
    }
    return base;
  }, [familyTreeOptions.registeredCityOptions, citySearchInput]);

  // 需求2：校验注册国家、CMI区域、注册城市是否非空且对应下拉选项
  const formValidationStatus = useMemo(() => {
    const country = addNodeFormData.registeredCountry || '';
    const region = addNodeFormData.cmiRegion || '';
    const city = addNodeFormData.registeredCity || '';

    const countryValid = Boolean(country && familyTreeOptions.registeredCountryOptions.some(o => o.value === country));
    const regionValid = Boolean(region && familyTreeOptions.cmiRegionOptions.some(o => o.value === region));
    const cityValid = Boolean(city && city.trim() !== '');

    return {
      countryValid,
      regionValid,
      cityValid,
      isValid: countryValid && regionValid && cityValid
    };
  }, [addNodeFormData.registeredCountry, addNodeFormData.cmiRegion, addNodeFormData.registeredCity, familyTreeOptions]);

  // 终端客户治理 Tab 状态
  const [endCustomerRowData, setEndCustomerRowData] = useState<any[]>([]);
  const [endCustomerLoading, setEndCustomerLoading] = useState<boolean>(false);
  const [endCustomerSearchText, setEndCustomerSearchText] = useState<string>('');
  const [savingEndCustomerIdMap, setSavingEndCustomerIdMap] = useState<Record<string, boolean>>({});
  const endCustomerGridRef = useRef<any>(null);

  // 企业客户治理 Tab 状态
  const [enterpriseCustomerRowData, setEnterpriseCustomerRowData] = useState<any[]>([]);
  const [enterpriseCustomerLoading, setEnterpriseCustomerLoading] = useState<boolean>(false);
  const [enterpriseCustomerSearchText, setEnterpriseCustomerSearchText] = useState<string>('');
  const [savingEnterpriseCustomerIdMap, setSavingEnterpriseCustomerIdMap] = useState<Record<string, boolean>>({});
  const enterpriseCustomerGridRef = useRef<any>(null);

  // 对应 Saving Map 与 Handler 的 Ref 存储，解耦 columnDefs 避免点击关联触发列计算重置
  const savingEnterpriseCustomerIdMapRef = useRef<Record<string, boolean>>({});
  const savingEndCustomerIdMapRef = useRef<Record<string, boolean>>({});
  const savingCompanyIdMapRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    savingCompanyIdMapRef.current = savingCompanyIdMap;
  }, [savingCompanyIdMap]);

  useEffect(() => {
    savingEndCustomerIdMapRef.current = savingEndCustomerIdMap;
  }, [savingEndCustomerIdMap]);

  useEffect(() => {
    savingEnterpriseCustomerIdMapRef.current = savingEnterpriseCustomerIdMap;
  }, [savingEnterpriseCustomerIdMap]);
  // 企业客户 TCV 项目 Modal 状态
  const [enterpriseTcvModalVisible, setEnterpriseTcvModalVisible] = useState<boolean>(false);
  const [selectedEnterpriseTcvList, setSelectedEnterpriseTcvList] = useState<any[]>([]);
  const [selectedEnterpriseInfo, setSelectedEnterpriseInfo] = useState<{ custId: string; enterpriseName: string } | null>(null);

  // 获取当前登录用户与只读角色判定
  const { initialState } = useModel('@@initialState');
  const isReadOnly = (initialState as any)?.currentUser?.role === 'readonly' || (initialState as any)?.currentUser?.isReadOnly === true;

  // 数据治理日志 (dataGovernanceLog) 状态
  const [governanceLogsMap, setGovernanceLogsMap] = useState<Record<string, any>>({});
  const governanceLogsMapRef = useRef<Record<string, any>>({});
  const [annotateModalVisible, setAnnotateModalVisible] = useState<boolean>(false);
  const [currentAnnotateRow, setCurrentAnnotateRow] = useState<any>(null);
  const [notesContent, setNotesContent] = useState<string>('');
  const [submittingAnnotate, setSubmittingAnnotate] = useState<boolean>(false);

  // 拉取当前集团客户 (rootGID = gid) 的治理日志列表
  const fetchGovernanceLogs = useCallback(async () => {
    if (!gid) return;
    try {
      const res = await request(`/api/v1/data-governance-logs?rootGID=${gid}`);
      if (res && res.code === 200 && Array.isArray(res.data)) {
        const map: Record<string, any> = {};
        res.data.forEach((log: any) => {
          const processedLog = {
            ...log,
            notes: unescapeHtml(log.notes || ''),
          };
          if (log.companyId) {
            map[`companyId_${log.companyId}`] = processedLog;
          }
          if (log.custId) {
            map[`custId_${log.custId}`] = processedLog;
          }
        });
        governanceLogsMapRef.current = map;
        setGovernanceLogsMap(map);
      }
    } catch (err) {
      console.error('获取数据治理日志失败:', err);
    }
  }, [gid]);

  useEffect(() => {
    fetchGovernanceLogs();
  }, [fetchGovernanceLogs]);

  // 提交标注数据治理日志 (dataGovernanceLog)
  const handleSubmitAnnotateLog = async () => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法提交或修改标注数据');
      return;
    }
    const targetCompanyId = currentAnnotateRow?.companyId ? String(currentAnnotateRow.companyId) : '';
    const targetCustId = currentAnnotateRow?.custId ? String(currentAnnotateRow.custId) : '';

    if (!targetCompanyId && !targetCustId) {
      message.warning('无法提交标注：缺少有效标识(companyId 或 custId)');
      return;
    }
    setSubmittingAnnotate(true);
    try {
      const staffName = (initialState as any)?.currentUser?.name || (initialState as any)?.currentUser?.username || 'admin';
      const payload = {
        rootGID: String(gid || ''),
        companyId: targetCompanyId,
        custId: targetCustId,
        status: 'no',
        notes: notesContent || '',
        staff: staffName,
      };

      const res = await request('/api/v1/data-governance-logs', {
        method: 'POST',
        data: payload,
      });

      if (res && res.code === 200) {
        message.success('标注保存成功！');
        setAnnotateModalVisible(false);
        await fetchGovernanceLogs();

        // 局部刷新 AG Grid 单元格与行着色，保持当前列宽不变
        if (endCustomerGridRef.current && endCustomerGridRef.current.api) {
          endCustomerGridRef.current.api.refreshCells({ force: true });
          endCustomerGridRef.current.api.redrawRows();
        }
        if (governanceGridRef.current && governanceGridRef.current.api) {
          governanceGridRef.current.api.refreshCells({ force: true });
          governanceGridRef.current.api.redrawRows();
        }
        if (enterpriseCustomerGridRef.current && enterpriseCustomerGridRef.current.api) {
          enterpriseCustomerGridRef.current.api.refreshCells({ force: true });
          enterpriseCustomerGridRef.current.api.redrawRows();
        }
      } else {
        message.error(res?.message || '标注提交失败');
      }
    } catch (err) {
      console.error('提交标注日志出错:', err);
      message.error('提交标注日志出错');
    } finally {
      setSubmittingAnnotate(false);
    }
  };

  // 删除标注数据治理日志
  const handleDeleteAnnotateLog = async () => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法删除标注数据');
      return;
    }
    const targetCompanyId = currentAnnotateRow?.companyId ? String(currentAnnotateRow.companyId) : '';
    const targetCustId = currentAnnotateRow?.custId ? String(currentAnnotateRow.custId) : '';

    if (!targetCompanyId && !targetCustId) {
      message.warning('无法删除标注：缺少有效标识(companyId 或 custId)');
      return;
    }
    setSubmittingAnnotate(true);
    try {
      const res = await request('/api/v1/data-governance-logs', {
        method: 'DELETE',
        data: {
          rootGID: String(gid || ''),
          companyId: targetCompanyId,
          custId: targetCustId,
        },
      });

      if (res && res.code === 200) {
        message.success('标注已成功删除！');
        setNotesContent('');
        setAnnotateModalVisible(false);
        await fetchGovernanceLogs();

        // 局部刷新 3 个 AG Grid 单元格与行着色，保持当前列宽不变
        if (endCustomerGridRef.current && endCustomerGridRef.current.api) {
          endCustomerGridRef.current.api.refreshCells({ force: true });
          endCustomerGridRef.current.api.redrawRows();
        }
        if (governanceGridRef.current && governanceGridRef.current.api) {
          governanceGridRef.current.api.refreshCells({ force: true });
          governanceGridRef.current.api.redrawRows();
        }
        if (enterpriseCustomerGridRef.current && enterpriseCustomerGridRef.current.api) {
          enterpriseCustomerGridRef.current.api.refreshCells({ force: true });
          enterpriseCustomerGridRef.current.api.redrawRows();
        }
      } else {
        message.error(res?.message || '删除标注失败');
      }
    } catch (err) {
      console.error('删除标注日志出错:', err);
      message.error('删除标注日志出错');
    } finally {
      setSubmittingAnnotate(false);
    }
  };

  const currentExistingLog = useMemo(() => {
    if (!currentAnnotateRow) return null;
    const compId = currentAnnotateRow.companyId ? String(currentAnnotateRow.companyId) : '';
    const custId = currentAnnotateRow.custId ? String(currentAnnotateRow.custId) : '';
    if (compId && governanceLogsMap[`companyId_${compId}`]) {
      return governanceLogsMap[`companyId_${compId}`];
    }
    if (custId && governanceLogsMap[`custId_${custId}`]) {
      return governanceLogsMap[`custId_${custId}`];
    }
    return null;
  }, [currentAnnotateRow, governanceLogsMap]);

  const hasExistingNotes = !!(currentExistingLog?.notes && currentExistingLog.notes.trim() !== '');

  const isKeywordsChanged = useMemo(() => {
    const s1 = [...(selectedKeywords || [])].sort().join('||');
    const s2 = [...(savedKeywords || [])].sort().join('||');
    return s1 !== s2;
  }, [selectedKeywords, savedKeywords]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const [cmiContactModalOpen, setCmiContactModalOpen] = useState(false);
  const [currentCmiContacts, setCurrentCmiContacts] = useState<any[]>([]);

  useEffect(() => {
    (window as any).handleShowCmiContact = (e: any, gid: string) => {
      e.stopPropagation();
      const node = originalData.find(d => d.id === gid);
      if (node && node.cmiContacts && node.cmiContacts.length > 0) {
        setCurrentCmiContacts(node.cmiContacts);
        setCmiContactModalOpen(true);
      }
    };
    return () => {
      delete (window as any).handleShowCmiContact;
    };
  }, [originalData]);

  const cmiContactColumns = [
    { title: '角色', dataIndex: 'role', key: 'role' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '职位', dataIndex: 'position', key: 'position' },
    { title: '员工号', dataIndex: 'staffNo', key: 'staffNo' },
    { title: '电话', dataIndex: 'phoneNumber', key: 'phoneNumber' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '城市', dataIndex: 'City', key: 'City' },
    { title: '直属上级', dataIndex: '直属上级', key: '直属上级' },
  ].map(col => ({ ...col, onCell: () => ({ style: { whiteSpace: 'nowrap' } }), title: <span style={{ whiteSpace: 'nowrap' }}>{col.title}</span> }));

  // 打开抽屉
  const openDrawer = useCallback((record: any) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  }, []);

  // 展示比对行详情（已关联则打开本地详情，缺失则平铺展示 API 详情）
  const handleShowDiffDetail = useCallback((rowData: any) => {
    if (rowData.status === 'consistent') {
      const apiDuns = String(rowData.duns).trim();
      const apiName = String(rowData.companyName).trim().toLowerCase();
      const found = originalData.find((item: any) =>
        (item.duns && String(item.duns).trim() === apiDuns) ||
        (item.companyNameEn && String(item.companyNameEn).trim().toLowerCase() === apiName) ||
        (item.registeredName && String(item.registeredName).trim().toLowerCase() === apiName)
      );
      if (found) {
        openDrawer(found);
        return;
      }
    }

    const raw = rowData.rawRecord;
    if (raw) {
      const flatRecord: any = {
        duns: raw.duns || rowData.duns,
        companyNameEn: raw.primaryName || rowData.companyName,
        registeredCountry: raw.primaryAddress?.addressCountry?.name || rowData.country,
        registeredCity: raw.primaryAddress?.addressLocality?.name || rowData.city,
        registeredAddress: raw.primaryAddress?.streetAddress?.line1 || undefined,
        postalCode: raw.primaryAddress?.postalCode || undefined,
      };
      if (Array.isArray(raw.multilingualPrimaryName) && raw.multilingualPrimaryName.length > 0) {
        flatRecord.multilingualName = raw.multilingualPrimaryName[0].name;
      }
      if (Array.isArray(raw.multilingualPrimaryAddress) && raw.multilingualPrimaryAddress.length > 0) {
        const addr = raw.multilingualPrimaryAddress[0];
        flatRecord.multilingualAddress = `${addr.addressRegion?.name || ''}${addr.addressLocality?.name || ''}${addr.streetAddress?.line1 || ''}`.trim();
      }
      if (raw.dunsControlStatus?.operatingStatus?.description) {
        flatRecord.operatingStatus = raw.dunsControlStatus.operatingStatus.description;
      }
      openDrawer(flatRecord);
    } else {
      openDrawer(rowData);
    }
  }, [originalData, openDrawer]);

  // 比对表格列定义
  const diffColDefs = useMemo(() => [
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
      headerName: 'DUNS号',
      field: 'duns',
      width: 160,
      filter: true,
      sortable: true,
    },
    {
      headerName: '公司名称 (API)',
      field: 'companyName',
      width: 320,
      filter: true,
      sortable: true,
      cellRenderer: (p: any) => {
        return (
          <a onClick={() => handleShowDiffDetail(p.data)} style={{ fontWeight: 500, textDecoration: 'underline' }}>
            {p.value}
          </a>
        );
      }
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
      width: 200,
      filter: true,
      sortable: true,
      cellRenderer: (p: any) => {
        const status = p.value;
        if (status === 'consistent') return <Tag color="green">数据一致 (家族树已存在)</Tag>;
        if (status === 'only_api') return <Tag color="orange">仅在 API 存在 (家族树缺失)</Tag>;
        return null;
      }
    }
  ], [handleShowDiffDetail]);

  // 获取并比对 API 与本地家族树数据差异
  const fetchDiffData = useCallback(async (localData: any[]) => {
    if (!gid || localData.length === 0) return;

    // 优先从 parentId === '' (根节点) 的记录中获取 duns，如果获取不到再 fallback 寻找任何非空的 duns
    const dunsObj = localData.find((item) => item.parentId === '') || localData.find((item) => item.duns);
    const duns = dunsObj?.duns;
    if (!duns || !abbr) {
      console.warn('缺少 duns 或 abbr，无法进行 API 境外分支差异比对', { duns, abbr });
      return;
    }

    setDiffLoading(true);
    const collectionName = `DNBFamilyTree-${abbr}-${duns}`;
    try {
      const res = await request(`/api/v1/wildcards/${collectionName}`, {
        method: 'GET',
        params: {
          query: JSON.stringify({
            "primaryAddress.addressCountry.name": { "$ne": "China", "$nin": [null, ""] }
          }),
          options: JSON.stringify({ limit: 10000 }),
        },
      });
      const apiRecords = res?.results || res?.data?.results || [];

      const localDunsSet = new Set<string>();
      const localNamesSet = new Set<string>();
      localData.forEach((item: any) => {
        if (item.duns) localDunsSet.add(String(item.duns).trim());
        if (item.companyNameCn) localNamesSet.add(String(item.companyNameCn).trim().toLowerCase());
        if (item.companyNameEn) localNamesSet.add(String(item.companyNameEn).trim().toLowerCase());
        if (item.registeredName) localNamesSet.add(String(item.registeredName).trim().toLowerCase());
      });

      const compareList: any[] = apiRecords.map((apiItem: any) => {
        const apiDuns = String(apiItem.duns || '').trim();
        const apiName = String(apiItem.primaryName || '').trim().toLowerCase();

        const exists = (apiDuns && localDunsSet.has(apiDuns)) || (apiName && localNamesSet.has(apiName));

        return {
          duns: apiItem.duns || '-',
          companyName: apiItem.primaryName || '未知公司',
          country: apiItem.primaryAddress?.addressCountry?.name || '-',
          city: apiItem.primaryAddress?.addressLocality?.name || '-',
          status: exists ? 'consistent' : 'only_api',
          rawRecord: apiItem,
        };
      });

      compareList.sort((a, b) => {
        const aDiff = a.status === 'only_api' ? 1 : 0;
        const bDiff = b.status === 'only_api' ? 1 : 0;
        return bDiff - aDiff;
      });

      setDiffRowData(compareList);
    } catch (err) {
      console.error(`拉取对比集合 ${collectionName} 数据失败:`, err);
      setDiffRowData([]);
    } finally {
      setDiffLoading(false);
    }
  }, [gid, abbr]);

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!gid) return;
    isChartInitialized.current = false;
    chartRef.current = null;
    setLoading(true);
    try {
      const res = await request('/api/v1/wildcards/keyGlobalFamilyTree', {
        method: 'GET',
        params: {
          query: JSON.stringify({ ultimateGID: gid }),
          options: JSON.stringify({ limit: 10000 }), // 确保拉取完整家族树
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

      // 获取 CMI 联系人 (分批请求以避免超长 URL 导致 403 错误)
      try {
        const allIdsArray = Array.from(allIds);
        const chunkSize = 150; // 每批 150 个 GID
        const chunks = [];
        for (let i = 0; i < allIdsArray.length; i += chunkSize) {
          chunks.push(allIdsArray.slice(i, i + chunkSize));
        }

        const keyCmiRecords: any[] = [];
        // 并行请求所有分批
        const chunkPromises = chunks.map(chunk =>
          request('/api/v1/wildcards/keyCMIContacts', {
            method: 'GET',
            params: {
              query: JSON.stringify({ GID: { $in: chunk } }),
              options: JSON.stringify({ limit: 10000 }),
            },
          })
        );
        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(res => {
          const records = res?.results || res?.data?.results || [];
          keyCmiRecords.push(...records);
        });

        const cmiContactIds = keyCmiRecords.map((r: any) => r.cmiContactId).filter(Boolean);

        let cmiContactsRecords: any[] = [];
        if (cmiContactIds.length > 0) {
          const cmiContactsRes = await request('/api/v1/wildcards/cmiContacts', {
            method: 'GET',
            params: {
              query: JSON.stringify({}),
              options: JSON.stringify({ limit: 10000 }),
            },
          });
          cmiContactsRecords = cmiContactsRes.results || cmiContactsRes.data?.results || [];
        }

        const contactDetailsMap = new Map();
        cmiContactsRecords.forEach((c: any) => contactDetailsMap.set(String(c._id), c));

        const gidToContactsMap = new Map();
        keyCmiRecords.forEach((k: any) => {
          const kGid = String(k.GID).trim();
          const cid = String(k.cmiContactId);
          if (contactDetailsMap.has(cid)) {
            if (!gidToContactsMap.has(kGid)) gidToContactsMap.set(kGid, []);
            gidToContactsMap.get(kGid).push(contactDetailsMap.get(cid));
          }
        });

        uniqueRecords.forEach((r: any) => {
          const rGid = String(r.GID).trim();
          r.cmiContacts = gidToContactsMap.get(rGid) || [];
        });
      } catch (err) {
        console.error('获取CMI联系人失败', err);
      }

      // Fetch Customer Contacts
      try {
        const custContactsRes = await request('/api/v1/wildcards/custContacts', {
          method: 'GET',
          params: {
            query: JSON.stringify({ ultimateGID: gid }),
            options: JSON.stringify({ limit: 10000 }),
          },
        });
        const custContactsRecords = custContactsRes.results || custContactsRes.data?.results || [];

        const gidToCustContactsMap = new Map();
        custContactsRecords.forEach((c: any) => {
          const cGid = String(c.companyGId || c.companyGID || c.GID || '').trim();
          if (cGid) {
            if (!gidToCustContactsMap.has(cGid)) {
              gidToCustContactsMap.set(cGid, []);
            }
            gidToCustContactsMap.get(cGid).push(c);
          }
        });

        uniqueRecords.forEach((r: any) => {
          const rGid = String(r.GID).trim();
          r.custContacts = gidToCustContactsMap.get(rGid) || [];
        });
      } catch (err) {
        console.error('获取客户联系人失败', err);
      }

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
      fetchDiffData(mappedData);
    } catch (err) {
      console.error('获取要客海外家族树数据失败', err);
      message.error('获取家族树数据失败');
    } finally {
      setLoading(false);
    }
  }, [gid]);

  // 获取映射 iBOSS 客户数据
  const fetchMappingData = useCallback(async () => {
    if (!gid) return;
    setMappingLoading(true);
    try {
      const mapRes = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'GET',
        params: {
          query: JSON.stringify({ ultimateGID: gid }),
          options: JSON.stringify({ limit: 10000 })
        }
      });
      const t4Data = mapRes.results || mapRes.data?.results || [];
      if (t4Data.length === 0) {
        setMappingRowData([]);
        return;
      }

      const gids = t4Data.map((r: any) => r.GID).filter(Boolean);
      const extIds = t4Data.map((r: any) => r.extCustId).filter(Boolean);

      const gTreeInfoMap = new Map();
      if (gids.length > 0) {
        try {
          const gTreeRecords = await chunkedWildcardQuery('keyGlobalFamilyTree', 'GID', gids, 60);
          gTreeRecords.forEach((r: any) => gTreeInfoMap.set(String(r.GID), r));
        } catch (e) {
          console.error('Failed to fetch keyGlobalFamilyTree details', e);
        }
      }

      const custToCompanyIdMap = new Map();
      if (extIds.length > 0) {
        try {
          const partMapRecords = await chunkedWildcardQuery('excelParticipantCustMapping', 'extCustId', extIds, 60);
          partMapRecords.forEach((r: any) => custToCompanyIdMap.set(String(r.extCustId), r));
        } catch (e) {
          console.error('Failed to fetch excelParticipantCustMapping', e);
        }
      }

      const customerMap = new Map();
      if (extIds.length > 0) {
        try {
          const custRecords = await chunkedWildcardQuery('ibosscustomers', 'custId', extIds, 60);
          custRecords.forEach((r: any) => customerMap.set(String(r.custId), r));
        } catch (e) {
          console.error('Failed to fetch ibosscustomers', e);
        }
      }

      const companyIds = Array.from(new Set(Array.from(custToCompanyIdMap.values()).map((r: any) => r.companyId).filter(Boolean)));
      const participantMap = new Map();
      if (companyIds.length > 0) {
        try {
          const partRecords = await chunkedWildcardQuery('ibossParticipantDetail', 'companyId', companyIds.map(String), 60);
          partRecords.forEach((r: any) => participantMap.set(String(r.companyId), r));
        } catch (e) {
          console.error('Failed to fetch ibossParticipantDetail', e);
        }
      }

      const assembledList = t4Data.map((r: any) => {
        const rowGid = String(r.GID || '');
        const rowExtId = String(r.extCustId || '');

        const gTreeMatch = gTreeInfoMap.get(rowGid) || {};

        const mapMatch = custToCompanyIdMap.get(rowExtId) || {};
        const companyId = mapMatch.companyId || '';

        const partMatch = companyId ? (participantMap.get(String(companyId)) || {}) : {};
        const companyBasic = partMatch.detailInfo?.companyBasicDTO || {};

        const custMatch = customerMap.get(rowExtId) || {};

        let companyNum = custMatch.companyNum || custMatch.companyCode || '';
        if (mapMatch.companyNum || mapMatch.companyCode) {
          companyNum = mapMatch.companyNum || mapMatch.companyCode;
        }

        return {
          _id: r._id,
          GID: rowGid,
          companyNameCn: gTreeMatch.companyNameCn || '',
          companyNameEn: gTreeMatch.companyNameEn || '',
          registeredCountry: gTreeMatch.registeredCountry || '',
          registeredCity: gTreeMatch.registeredCity || '',
          detailCompanyName: companyBasic.companyName || '',
          detailCountry: companyBasic.registeredCountryName || '',
          detailCity: companyBasic.registeredCityName || companyBasic.cityName || companyBasic.city || '',
          ibossEnterpriseName: custMatch.enterpriseName || '',
          ibossCountry: custMatch.country || '',
          ibossCity: custMatch.city || '',
          companyId,
          companyNum,
          enterpriseId: custMatch.enterpriseId || '',
          ebsCustCode: custMatch.ebsCustCode || custMatch.ebsCustomerCode || '',
          mappingPath: r.mappingPath || '',
          method: r.method || (r.mappingPath === 'manual' ? 'manual' : ''),
          isManualMapped: r.method === 'manual' || r.mappingPath === 'manual',
          treeLevel: gTreeMatch.treeLevel != null ? gTreeMatch.treeLevel : (gTreeMatch.treeLeval != null ? gTreeMatch.treeLeval : '')
        };
      });

      // 需求2：默认按“映射路径”倒序 DESC 排序
      assembledList.sort((a: any, b: any) => {
        const pathA = String(a.mappingPath || '');
        const pathB = String(b.mappingPath || '');
        return pathB.localeCompare(pathA, 'zh-CN', { numeric: true });
      });

      setMappingRowData(assembledList);
      setTimeout(() => {
        mappingGridRef.current?.api?.autoSizeAllColumns();
      }, 100);
    } catch (err) {
      console.error('获取映射数据失败', err);
      message.error('获取映射数据失败');
    } finally {
      setMappingLoading(false);
    }
  }, [gid]);

  // 需求1：删除分支数据节点 (通过 _id 或 GID 关联 keyGlobalFamilyTree 表)
  const handleDeleteFamilyTreeNode = useCallback(async (record: any) => {
    if (!record) return;
    const targetId = record._id || record.id;
    const targetGid = record.GID;

    if (!targetId && !targetGid) {
      message.error('未找到该节点的唯一标识 (_id 或 GID)');
      return;
    }

    // 预校验该 GID 在 keyFamilyTreeCustMapping 表中是否存在对应的治理映射记录
    if (targetGid) {
      try {
        const checkMappingRes = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
          method: 'GET',
          params: {
            query: JSON.stringify({ GID: String(targetGid) }),
            options: JSON.stringify({ limit: 1 })
          }
        });
        const mappingRecords = checkMappingRes?.results || checkMappingRes?.data?.results || [];
        if (mappingRecords.length > 0) {
          message.warning(`分支节点【${record.companyNameCn || record.name || targetGid}】(GID: ${targetGid}) 在已治理映射表 (keyFamilyTreeCustMapping) 中存在对应映射记录，不允许删除！请先在「已治理」映射表中删除对应映射后再试。`);
          return;
        }
      } catch (err) {
        console.error('校验映射存在状态失败', err);
      }
    }

    try {
      if (targetId) {
        await request(`/api/v1/wildcards/keyGlobalFamilyTree/${targetId}`, {
          method: 'DELETE'
        });
      } else {
        await request('/api/v1/wildcards/keyGlobalFamilyTree', {
          method: 'DELETE',
          params: { query: JSON.stringify({ GID: targetGid }) }
        });
      }

      message.success(`已成功删除分支节点【${record.companyNameCn || record.name || targetGid}】`);

      // 从 originalData 中过滤删除，触发重新绘制家族树与表格更新
      setOriginalData(prev => prev.filter(item => {
        if (targetId && item._id) return String(item._id) !== String(targetId);
        if (targetGid && item.GID) return String(item.GID) !== String(targetGid);
        return true;
      }));
    } catch (err: any) {
      console.error('删除分支节点失败', err);
      const errMsg = err?.data?.message || err?.message || '删除节点失败，请稍后重试';
      message.error(errMsg);
    }
  }, []);

  // 需求2：删除已治理映射记录 (通过 _id 关联 keyFamilyTreeCustMapping 表)
  const handleDeleteMappingRecord = useCallback(async (record: any) => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法删除映射记录');
      return;
    }
    if (!record) return;
    const targetId = record._id;
    if (!targetId) {
      message.error('未找到该映射记录的唯一标识 (_id)');
      return;
    }

    try {
      await request(`/api/v1/wildcards/keyFamilyTreeCustMapping/${targetId}`, {
        method: 'DELETE'
      });

      message.success('已成功删除该已治理映射记录！');

      // 更新映射表格数据
      setMappingRowData(prev => prev.filter(item => String(item._id) !== String(targetId)));
    } catch (err) {
      console.error('删除映射记录失败', err);
      message.error('删除映射记录失败，请稍后重试');
    }
  }, []);

  // 国家与城市 Badge 标签辅助渲染组件
  const LocationBadges: React.FC<{ country?: string; city?: string }> = ({ country, city }) => {
    if (!country && !city) return null;
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
        {country && (
          <Badge
            count={country}
            style={{
              backgroundColor: '#e6f4ff',
              color: '#0958d9',
              borderColor: '#91caef',
              fontSize: '11px',
              height: '18px',
              lineHeight: '16px',
              padding: '0 6px',
              borderRadius: '4px',
              boxShadow: 'none',
              fontWeight: 'normal'
            }}
          />
        )}
        {city && (
          <Badge
            count={city}
            style={{
              backgroundColor: '#f6ffed',
              color: '#389e0d',
              borderColor: '#b7eb8f',
              fontSize: '11px',
              height: '18px',
              lineHeight: '16px',
              padding: '0 6px',
              borderRadius: '4px',
              boxShadow: 'none',
              fontWeight: 'normal'
            }}
          />
        )}
      </div>
    );
  };

  const mappingColDefs = useMemo(() => [
    {
      headerName: 'GID',
      field: 'GID',
      minWidth: 140,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '参与方 ID',
      field: 'companyId',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '企业编号',
      field: 'companyNum',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: 'iBOSS企业 ID',
      field: 'enterpriseId',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: 'EBS客户编码',
      field: 'ebsCustCode',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '映射路径',
      field: 'mappingPath',
      minWidth: 150,
      filter: true,
      sortable: true,
      sort: 'desc' as const,
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: '客户树层级',
      field: 'treeLevel',
      minWidth: 120,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: '客户树中文名',
      field: 'companyNameCn',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: any) => {
        const val = params.value || '-';
        const country = params.data?.registeredCountry;
        const city = params.data?.registeredCity;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 0', whiteSpace: 'normal', lineHeight: '1.4' }}>
            <span style={{ fontWeight: 500, color: '#111827' }}>{val}</span>
            <LocationBadges country={country} city={city} />
          </div>
        );
      }
    },
    {
      headerName: '客户树英文名',
      field: 'companyNameEn',
      minWidth: 180,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: '客户树国家',
      field: 'registeredCountry',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '客户树城市',
      field: 'registeredCity',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '参与方企业名',
      field: 'detailCompanyName',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: any) => {
        const val = params.value || '-';
        const country = params.data?.detailCountry;
        const city = params.data?.detailCity;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 0', whiteSpace: 'normal', lineHeight: '1.4' }}>
            <span style={{ fontWeight: 500, color: '#111827' }}>{val}</span>
            <LocationBadges country={country} city={city} />
          </div>
        );
      }
    },
    {
      headerName: '参与方国家',
      field: 'detailCountry',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: 'iBOSS企业名',
      field: 'ibossEnterpriseName',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellRenderer: (params: any) => {
        const val = params.value || '-';
        const country = params.data?.ibossCountry;
        const city = params.data?.ibossCity;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 0', whiteSpace: 'normal', lineHeight: '1.4' }}>
            <span style={{ fontWeight: 500, color: '#111827' }}>{val}</span>
            <LocationBadges country={country} city={city} />
          </div>
        );
      }
    },
    {
      headerName: 'iBOSS客户国家',
      field: 'ibossCountry',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: 'iBOSS客户城市',
      field: 'ibossCity',
      minWidth: 130,
      filter: true,
      sortable: true,
      hide: true,
    },
    {
      headerName: '操作',
      field: 'actions',
      pinned: 'right' as const,
      width: 90,
      filter: false,
      sortable: false,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: any) => {
        if (!p.data) return null;
        return (
          <Popconfirm
            title="确定要删除该已治理映射记录吗？"
            onConfirm={() => handleDeleteMappingRecord(p.data)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        );
      }
    }
  ], [handleDeleteMappingRecord]);

  // --- 治理比对工具：数据获取与匹配映射 ---
  const fetchGovernanceData = useCallback(async (overrideKeywords?: string[]) => {
    if (!gid) return;
    const kwList = overrideKeywords !== undefined ? overrideKeywords : selectedKeywords;
    if (!kwList || kwList.length === 0) {
      setGovernanceData([]);
      setGovernanceLoading(false);
      return;
    }
    setGovernanceLoading(true);
    try {
      // 节点信息字典映射
      const nodeMap = new Map<string, any>();
      originalData.forEach(d => {
        if (d.GID || d.id) {
          nodeMap.set(String(d.GID || d.id), d);
        }
      });

      // 映射表拉取
      const custMappingRes = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'GET',
        params: { options: JSON.stringify({ limit: 50000 }) }
      }).catch(() => ({ results: [] }));
      const custMappingRecords = custMappingRes.results || custMappingRes.data?.results || [];

      const partMappingRes = await request('/api/v1/wildcards/excelParticipantCustMapping', {
        method: 'GET',
        params: { options: JSON.stringify({ limit: 50000 }) }
      }).catch(() => ({ results: [] }));
      const partMappingRecords = partMappingRes.results || partMappingRes.data?.results || [];

      const extCustToGidMap = new Map<string, string>();
      const extCustToMethodMap = new Map<string, string>();
      const companyIdToGidMap = new Map<string, string>();
      const companyIdToMappingPathMap = new Map<string, string>();
      const companyIdToMethodMap = new Map<string, string>();

      // 1. 遍历 keyFamilyTreeCustMapping 表：提取 extCustId ➔ GID 以及手选保存的 companyId ➔ GID 映射
      custMappingRecords.forEach((r: any) => {
        const extId = String(r.extCustId || '');
        const compId = String(r.companyId || '');
        const gidVal = String(r.GID || '');
        const mPath = String(r.mappingPath || '');
        const mMethod = String(r.method || '');

        if (extId && gidVal) {
          extCustToGidMap.set(extId, gidVal);
          if (mMethod) {
            extCustToMethodMap.set(extId, mMethod);
          }
        }
        // 若记录中存有手选关联保存的 companyId 与 GID，直接写入 companyIdToGidMap
        if (compId && gidVal) {
          companyIdToGidMap.set(compId, gidVal);
          if (mPath) {
            companyIdToMappingPathMap.set(compId, mPath);
          }
          if (mMethod) {
            companyIdToMethodMap.set(compId, mMethod);
          }
        }
      });

      // 2. 遍历 excelParticipantCustMapping 表：补全通过 extCustId 桥接的二跳映射关系并统计关联客户数量
      const partCustSetMap = new Map<string, Set<string>>();
      partMappingRecords.forEach((r: any) => {
        const extId = String(r.extCustId || '').trim();
        const compId = String(r.companyId || '').trim();
        // 过滤掉 '-1', '0', 'null', 'undefined' 等无效占位 ID
        const isValidExtCustId = Boolean(extId && extId !== '-1' && extId !== '0' && extId !== 'null' && extId !== 'undefined');

        if (compId && isValidExtCustId) {
          if (!partCustSetMap.has(compId)) {
            partCustSetMap.set(compId, new Set());
          }
          partCustSetMap.get(compId)!.add(extId);

          const matchedGid = extCustToGidMap.get(extId);
          const matchedMethod = extCustToMethodMap.get(extId);
          // 若之前没有手选覆盖，则补全桥接关联
          if (matchedGid && !companyIdToGidMap.has(compId)) {
            companyIdToGidMap.set(compId, matchedGid);
          }
          if (matchedMethod && !companyIdToMethodMap.has(compId)) {
            companyIdToMethodMap.set(compId, matchedMethod);
          }
        }
      });

      // 构建模糊正则检索 $or 选项 (采用分块并发，每个请求最多 8 个关键字，防止 URL 超长引发 414/431)
      const validKws = kwList.map((kw) => kw.trim()).filter(Boolean);
      if (validKws.length === 0) {
        setGovernanceData([]);
        setGovernanceLoading(false);
        return;
      }

      const kwChunks: string[][] = [];
      for (let i = 0; i < validKws.length; i += 8) {
        kwChunks.push(validKws.slice(i, i + 8));
      }

      const partPromises = kwChunks.map((chunk) => {
        const pattern = chunk.map((kw) => escapeRegExp(kw)).join('|');
        const rx = { $regex: pattern, $options: 'i' };
        const queryObj = {
          $or: [
            { companyName: rx },
            { companyEnglishName: rx },
            { 'detailInfo.companyBasicDTO.companyName': rx },
            { 'detailInfo.companyBasicDTO.companyEnglishName': rx },
          ],
        };
        return request('/api/v1/wildcards/ibossParticipantDetail', {
          method: 'GET',
          params: {
            query: JSON.stringify(queryObj),
            options: JSON.stringify({ limit: 50000 }),
          },
        })
          .then((res) => (res.results || res.data?.results || []) as any[])
          .catch(() => [] as any[]);
      });

      const partChunkResults = await Promise.all(partPromises);
      const rawPartMap = new Map<string, any>();
      partChunkResults.flat().forEach((r: any) => {
        const idKey = String(r._id || r.companyId || '');
        if (idKey && !rawPartMap.has(idKey)) {
          rawPartMap.set(idKey, r);
        }
      });
      const rawPartList = Array.from(rawPartMap.values());

      const assembled = rawPartList.map((r: any) => {
        const basic = r.detailInfo?.companyBasicDTO || {};
        const compId = String(r.companyId || basic.companyId || '');
        const compName = basic.companyName || r.companyName || '';
        const compEnName = basic.companyEnglishName || r.companyEnglishName || '';
        const regCountry = basic.registeredCountryName || r.registeredCountryName || '';
        const regRegion = basic.registeredRegionName || r.registeredRegionName || '';
        const addrDetail = basic.addressDetail || r.addressDetail || '';

        const mappedGid = companyIdToGidMap.get(compId) || '';
        const mappingPath = companyIdToMappingPathMap.get(compId) || '';
        const method = companyIdToMethodMap.get(compId) || '';
        const nodeMatch = mappedGid ? nodeMap.get(mappedGid) : null;
        const isMapped = !!nodeMatch;

        const relatedCustCount = partCustSetMap.get(compId)?.size || 0;

        // 计算当前行命中的关键字
        const matchedKeywords: string[] = [];
        if (kwList && kwList.length > 0) {
          const compNameLower = compName.toLowerCase();
          const compEnNameLower = compEnName.toLowerCase();
          kwList.forEach(kw => {
            if (!kw) return;
            const kwLower = kw.trim().toLowerCase();
            if (kwLower && (compNameLower.includes(kwLower) || compEnNameLower.includes(kwLower))) {
              matchedKeywords.push(kw.trim());
            }
          });
        }

        let mappedCnName = '';
        let mappedEnName = '';
        let mappedCountry = '';
        let mappedCity = '';
        if (nodeMatch) {
          mappedCnName = nodeMatch.companyNameCn || nodeMatch.name || mappedGid;
          mappedEnName = nodeMatch.companyNameEn || '';
          mappedCountry = nodeMatch.registeredCountry || nodeMatch.position || '';
          mappedCity = nodeMatch.registeredCity || nodeMatch.city || '';
        }

        return {
          _id: r._id,
          matchedKeywords,
          companyId: compId,
          companyName: compName,
          companyEnglishName: compEnName,
          registeredCountryName: regCountry,
          registeredRegionName: regRegion,
          addressDetail: addrDetail,
          mappedGid,
          mappedCnName,
          mappedEnName,
          mappedCountry,
          mappedCity,
          mappingPath,
          method,
          isMapped,
          relatedCustCount
        };
      });

      // 需求1：将未能关联的记录（isMapped === false）排列在最上面；同状态下按照「命中关键字」升序排序
      assembled.sort((a: any, b: any) => {
        if (a.isMapped !== b.isMapped) {
          return a.isMapped ? 1 : -1;
        }
        const kwA = (a.matchedKeywords || []).join(',');
        const kwB = (b.matchedKeywords || []).join(',');
        return kwA.localeCompare(kwB, 'zh-CN');
      });

      setGovernanceRowData(assembled);
      setTimeout(() => {
        governanceGridRef.current?.api?.autoSizeAllColumns();
      }, 100);
    } catch (err) {
      console.error('获取治理比对数据失败', err);
      message.error('获取治理比对数据失败');
    } finally {
      setGovernanceLoading(false);
    }
  }, [gid, originalData, selectedKeywords]);

  // 共享 nodeMapRef 引用，快速供单元格编辑器与 Renderer 读取
  const nodeMapRef = useRef<Map<string, any>>(new Map());
  useEffect(() => {
    const map = new Map<string, any>();
    originalData.forEach(d => {
      if (d.GID || d.id) {
        map.set(String(d.GID || d.id), d);
      }
    });
    nodeMapRef.current = map;
  }, [originalData]);

  // 辅助函数：根据中英文国家/地区字符串，自动扩展输出对应的英文名与 ISO 缩写词（如 Hong Kong HK），供搜索匹配
  const getCountryEnExt = (c: string): string => {
    if (!c) return '';
    const lc = c.toLowerCase();
    if (lc.includes('香港') || lc.includes('hong kong')) return 'Hong Kong HK';
    if (lc.includes('中国') || lc.includes('china')) return 'China CN';
    if (lc.includes('新加坡') || lc.includes('singapore')) return 'Singapore SG';
    if (lc.includes('美国') || lc.includes('usa') || lc.includes('united states')) return 'USA United States US';
    if (lc.includes('英国') || lc.includes('uk') || lc.includes('united kingdom')) return 'UK United Kingdom GB';
    if (lc.includes('开曼') || lc.includes('cayman')) return 'Cayman Islands KY';
    if (lc.includes('维尔京') || lc.includes('virgin')) return 'Virgin Islands BVI VG';
    if (lc.includes('日本') || lc.includes('japan')) return 'Japan JP';
    if (lc.includes('韩国') || lc.includes('korea')) return 'Korea KR';
    if (lc.includes('德国') || lc.includes('germany')) return 'Germany DE';
    if (lc.includes('法国') || lc.includes('france')) return 'France FR';
    if (lc.includes('波兰') || lc.includes('poland')) return 'Poland PL';
    if (lc.includes('澳洲') || lc.includes('australia')) return 'Australia AU';
    return '';
  };

  // 辅助函数：格式化全维度打字检索标签（组合中文名、英文名、国家中文、国家英文/ISO代码、城市、GID，均由半角空格分隔供Tokenizer多词求交集匹配）
  const getFormatSearchText = (node: any, val: any): string => {
    if (!node) return String(val || '未关联');
    const cn = node.companyNameCn || node.name || '';
    const en = node.companyNameEn || '';
    const country = node.registeredCountry || node.position || '';
    const countryExt = getCountryEnExt(country);
    const city = node.registeredCity || node.city || '';
    return `${cn} ${en} ${country} ${countryExt} ${city} ${val}`.trim();
  };

  const [savingCompanyIdMap, setSavingCompanyIdMap] = useState<Record<string, boolean>>({});

  // 需求2：参与方关联客户详情 Modal 状态
  const [participantDetailModalVisible, setParticipantDetailModalVisible] = useState(false);
  const [participantDetailLoading, setParticipantDetailLoading] = useState(false);
  const [selectedParticipantCompId, setSelectedParticipantCompId] = useState('');
  const [participantCustomerList, setParticipantCustomerList] = useState<any[]>([]);

  // 需求2：点击参与方 ID，跨表查询 excelParticipantCustMapping 与 ibosscustomers 显示客户详情
  const handleOpenParticipantDetail = useCallback(async (companyId: string) => {
    if (!companyId) return;
    setSelectedParticipantCompId(companyId);
    setParticipantDetailModalVisible(true);
    setParticipantDetailLoading(true);
    try {
      // 1. 查询 excelParticipantCustMapping 得到该 companyId 的 extCustId 列表
      const mapRes = await request('/api/v1/wildcards/excelParticipantCustMapping', {
        method: 'GET',
        params: {
          query: JSON.stringify({ companyId: String(companyId) }),
          options: JSON.stringify({ limit: 1000 })
        }
      });
      const mapRecords = mapRes.results || mapRes.data?.results || [];
      const extCustIds = Array.from(
        new Set(
          mapRecords
            .map((r: any) => String(r.extCustId || '').trim())
            .filter((id: string) => Boolean(id && id !== '-1' && id !== '0' && id !== 'null' && id !== 'undefined'))
        )
      );

      if (extCustIds.length === 0) {
        setParticipantCustomerList([]);
        return;
      }

      // 2. 查询 ibosscustomers 表，匹配 custId
      const custRecords = await chunkedWildcardQuery('ibosscustomers', 'custId', extCustIds, 60);
      setParticipantCustomerList(custRecords);
    } catch (e) {
      console.error('获取参与方关联客户详情失败', e);
      message.error('获取参与方关联客户详情失败');
    } finally {
      setParticipantDetailLoading(false);
    }
  }, []);

  // 简易 Tab 标签内部元素（取消嵌套内框，整体加深背景由原生 Tab 控件 CSS 处理）
  const renderTabLabel = useCallback((icon: React.ReactNode, title: string) => {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span>{title}</span>
      </span>
    );
  }, []);

  // --- 治理比对工具：手选分支节点联动修改 handler (需求2：自动选定新增节点) ---
  const handleSelectMappedNode = useCallback((rowRecord: any, selectedGid: string, fallbackNode?: any) => {
    const targetNode = nodeMapRef.current.get(String(selectedGid)) ||
      originalData.find(d => String(d.GID || d.id) === String(selectedGid)) ||
      fallbackNode;

    if (!targetNode) return;

    if (selectedGid && !nodeMapRef.current.has(String(selectedGid))) {
      nodeMapRef.current.set(String(selectedGid), targetNode);
    }

    const cnName = targetNode.companyNameCn || targetNode.name || selectedGid;
    const enName = targetNode.companyNameEn || '';
    const regCountry = targetNode.registeredCountry || targetNode.position || '';
    const regCity = targetNode.registeredCity || targetNode.city || '';

    setGovernanceRowData(prevData => {
      return prevData.map(item => {
        if (item.companyId === rowRecord.companyId) {
          return {
            ...item,
            mappedGid: String(selectedGid),
            mappedCnName: cnName,
            mappedEnName: enName,
            mappedCountry: regCountry,
            mappedCity: regCity,
            isMapped: true,
            isManualMapped: true,
          };
        }
        return item;
      });
    });

    // 强制刷新 AG Grid 单元格渲染
    if (governanceGridRef.current && governanceGridRef.current.api) {
      setTimeout(() => {
        governanceGridRef.current.api.refreshCells({ force: true });
      }, 50);
    }

    message.success(`已为【${rowRecord.companyName || rowRecord.companyId}】默认自动选择新节点: ${cnName} (#${selectedGid})，请点击右侧“保存手动关联”按钮提交落库`);
  }, [originalData]);

  // 辅助函数：根据原国家名映射标准英文国家名
  const getStandardCountryEnName = (rawCountry: string): string => {
    if (!rawCountry) return '';
    const code = getCountryCode(rawCountry);
    if (!code) return rawCountry;

    const codeToEnMap: Record<string, string> = {
      cn: 'China', hk: 'Hong Kong', mo: 'Macau', tw: 'Taiwan',
      us: 'United States', gb: 'United Kingdom', sg: 'Singapore', jp: 'Japan',
      kr: 'South Korea', ky: 'Cayman Islands', vg: 'British Virgin Islands',
      au: 'Australia', ca: 'Canada', de: 'Germany', fr: 'France', in: 'India',
      kz: 'Kazakhstan', iq: 'Iraq', ae: 'United Arab Emirates', ru: 'Russia',
      pe: 'Peru', id: 'Indonesia', br: 'Brazil', nl: 'Netherlands', ch: 'Switzerland',
      bm: 'Bermuda', pa: 'Panama', my: 'Malaysia', za: 'South Africa', th: 'Thailand',
      vn: 'Vietnam', ph: 'Philippines', nz: 'New Zealand', mx: 'Mexico', it: 'Italy',
      es: 'Spain', pt: 'Portugal', se: 'Sweden', no: 'Norway', dk: 'Denmark',
      fi: 'Finland', ie: 'Ireland', be: 'Belgium', at: 'Austria', pl: 'Poland',
      cz: 'Czech Republic', hu: 'Hungary', ro: 'Romania', gr: 'Greece', tr: 'Turkey',
      eg: 'Egypt', sa: 'Saudi Arabia', qa: 'Qatar', kw: 'Kuwait'
    };

    return codeToEnMap[code] || rawCountry;
  };

  // 需求4：实时查找并计算父节点的父节点信息（Grandparent Node）
  const updateGrandparentInfo = useCallback((parentGid: string) => {
    if (!parentGid) {
      setGrandparentNodeInfo(null);
      return;
    }
    const parentNode = nodeMapRef.current.get(String(parentGid)) || originalData.find(d => String(d.GID || d.id) === String(parentGid));
    if (!parentNode) {
      setGrandparentNodeInfo(null);
      return;
    }
    const grandGid = parentNode.parentGID || parentNode.parentId;
    if (!grandGid) {
      setGrandparentNodeInfo(null);
      return;
    }
    const grandNode = nodeMapRef.current.get(String(grandGid)) || originalData.find(d => String(d.GID || d.id) === String(grandGid));
    if (grandNode) {
      setGrandparentNodeInfo({
        companyNameCn: grandNode.companyNameCn || grandNode.name || '-',
        companyNameEn: grandNode.companyNameEn || '-',
        GID: String(grandNode.GID || grandNode.id || grandGid),
        registeredCountry: grandNode.registeredCountry || '-',
        registeredCity: grandNode.registeredCity || '-',
        treeLevel: grandNode.treeLevel ?? '-'
      });
    } else {
      setGrandparentNodeInfo({
        companyNameCn: '-',
        companyNameEn: '-',
        GID: String(grandGid),
        registeredCountry: '-',
        registeredCity: '-',
        treeLevel: '-'
      });
    }
  }, [originalData]);

  // 智能模糊/最相近比对函数
  const findBestMatchOption = useCallback((rawInput: string, options: { value: string; label: string }[]): string => {
    if (!Array.isArray(options) || options.length === 0) return '';
    if (!rawInput || !rawInput.trim()) return options[0]?.value || '';

    const cleanInput = rawInput.trim().toLowerCase();

    // 1. 完全大小写/空格精确匹配
    const exact = options.find(o => o.value.toLowerCase() === cleanInput || o.label.toLowerCase() === cleanInput);
    if (exact) return exact.value;

    // 2. 常见国家/区域别名映射
    const aliasMap: Record<string, string[]> = {
      'China': ['cn', 'prc', 'china', '中国', '中华人民共和国', '内地', 'mainland china'],
      'Hong Kong': ['hk', 'hong kong', 'hongkong', '香港', '中国香港'],
      'Singapore': ['sg', 'singapore', 'singapor', '新加坡', '新加坡共和国'],
      'United States': ['us', 'usa', 'united states', 'united states of america', '美国', '美利坚合众国'],
      'United Kingdom': ['uk', 'united kingdom', 'britain', 'great britain', '英国'],
      'Japan': ['jp', 'japan', '日本'],
      'Germany': ['de', 'germany', '德国'],
      'Australia': ['au', 'australia', '澳大利亚', '澳洲']
    };

    for (const [targetValue, aliases] of Object.entries(aliasMap)) {
      if (aliases.some(a => a === cleanInput || cleanInput.includes(a))) {
        const matchInOpts = options.find(o => o.value.toLowerCase() === targetValue.toLowerCase());
        if (matchInOpts) return matchInOpts.value;
      }
    }

    // 3. 包含或子串匹配
    const partial = options.find(o => {
      const v = o.value.toLowerCase();
      return v.includes(cleanInput) || cleanInput.includes(v);
    });
    if (partial) return partial.value;

    // 4. 默认返回列表中第一个有效项
    return options[0]?.value || '';
  }, []);

  // 从注册详细地址中分离并匹配列表中最相近的城市
  const extractAndMatchCity = useCallback((regAddress: string, rawCityInput: string, cityOptions: { value: string; label: string }[]): string => {
    const opts = cityOptions || [];
    const textToScan = `${rawCityInput || ''} ${regAddress || ''}`.trim();
    if (!textToScan) return opts[0]?.value || '';

    // 1. 从现有的 distinct 城市列表中，优先按匹配最长城市名扫描
    const sortedOpts = [...opts].sort((a, b) => b.value.length - a.value.length);
    for (const opt of sortedOpts) {
      if (opt.value && opt.value.trim() && textToScan.toLowerCase().includes(opt.value.toLowerCase().trim())) {
        return opt.value;
      }
    }

    // 2. 如果详细地址中有中文 "xx市" 正则提取
    const cityMatch = regAddress.match(/(北京市|上海市|天津市|重庆市|深圳市|广州市|成都市|杭州市|武汉市|西安市|南京市|香港|澳门|[\u4e00-\u9fa5]{2,6}市)/);
    if (cityMatch && cityMatch[1]) {
      const matchedCnCity = cityMatch[1];
      const matchInOpts = opts.find(o => o.value.includes(matchedCnCity) || matchedCnCity.includes(o.value));
      if (matchInOpts) return matchInOpts.value;
      return matchedCnCity;
    }

    // 3. 如果从原 rawCityInput 里面最相近匹配
    if (rawCityInput) {
      const best = findBestMatchOption(rawCityInput, opts);
      if (best) return best;
    }

    // 4. 退回列表第一项或 rawCityInput
    return opts[0]?.value || rawCityInput || '';
  }, [findBestMatchOption]);

  // 需求2：调用 Google 翻译 API 自动互相翻译 (双重通道保障)
  const handleGoogleTranslate = useCallback(async (direction: 'cn2en' | 'en2cn') => {
    const currentData = addNodeFormDataRef.current || addNodeFormData || {};
    if (direction === 'cn2en') {
      const text = currentData.companyNameCn || addNodeFormData.companyNameCn;
      if (!text || !text.trim()) {
        message.warning('请先输入公司中文名称');
        return;
      }
      try {
        setTranslatingEn(true);
        let translatedText = '';
        try {
          const res = await request('/api/v1/translate', {
            method: 'POST',
            data: { text: text.trim(), targetLang: 'en' }
          });
          if (res && res.translatedText) translatedText = res.translatedText;
        } catch (e) {
          console.warn('后端翻译代理未返回结果，切换客户端直接请求...', e);
        }

        if (!translatedText) {
          const rawRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.trim())}`);
          const jsonRes = await rawRes.json();
          if (Array.isArray(jsonRes) && Array.isArray(jsonRes[0])) {
            translatedText = jsonRes[0].map((item: any) => item[0]).join('');
          }
        }

        if (translatedText) {
          updateAddNodeFormData((prev: any) => ({
            ...prev,
            companyNameEn: translatedText,
            registeredName: translatedText
          }));
          message.success(`谷歌翻译已成功填充英文：${translatedText}`);
        } else {
          message.error('翻译失败：未获取到有效翻译文本');
        }
      } catch (e: any) {
        console.error('翻译失败:', e);
        message.error(`谷歌翻译失败: ${e.message || '网络连接超时'}`);
      } finally {
        setTranslatingEn(false);
      }
    } else {
      const text = currentData.companyNameEn || addNodeFormData.companyNameEn;
      if (!text || !text.trim()) {
        message.warning('请先输入公司英文名称');
        return;
      }
      try {
        setTranslatingCn(true);
        let translatedText = '';
        try {
          const res = await request('/api/v1/translate', {
            method: 'POST',
            data: { text: text.trim(), targetLang: 'zh-CN' }
          });
          if (res && res.translatedText) translatedText = res.translatedText;
        } catch (e) {
          console.warn('后端翻译代理未返回结果，切换客户端直接请求...', e);
        }

        if (!translatedText) {
          const rawRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text.trim())}`);
          const jsonRes = await rawRes.json();
          if (Array.isArray(jsonRes) && Array.isArray(jsonRes[0])) {
            translatedText = jsonRes[0].map((item: any) => item[0]).join('');
          }
        }

        if (translatedText) {
          updateAddNodeFormData((prev: any) => ({
            ...prev,
            companyNameCn: translatedText
          }));
          message.success(`谷歌翻译已成功填充中文：${translatedText}`);
        } else {
          message.error('翻译失败：未获取到有效翻译文本');
        }
      } catch (e: any) {
        console.error('翻译失败:', e);
        message.error(`谷歌翻译失败: ${e.message || '网络连接超时'}`);
      } finally {
        setTranslatingCn(false);
      }
    }
  }, [addNodeFormData, updateAddNodeFormData]);

  // --- 参与方治理：双击单元格打开新增基因树节点弹窗 ---
  const handleOpenAddNodeModal = useCallback((rowRecord: any) => {
    if (!rowRecord) return;
    setTargetParticipantRow(rowRecord);
    setCitySearchInput('');

    // 1. 查找根节点 (Root Node)
    const rootNode = originalData.find(d => !d.parentId) || originalData[0] || {};
    const rootGid = String(rootNode.GID || rootNode.id || gid || '');
    const prefix = rootGid.slice(0, 9);

    // 2. 计算 GID (prefix + 9位数字自增长，以 900000001 起步)
    let maxSeq = 900000000;
    originalData.forEach(node => {
      const g = String(node.GID || node.id || '');
      if (g.startsWith(prefix)) {
        const suffix = g.slice(prefix.length);
        if (/^9\d{8}$/.test(suffix)) {
          const seqNum = parseInt(suffix, 10);
          if (seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    });
    const nextSeq = maxSeq + 1;
    const newGid = `${prefix}${nextSeq}`;

    // 3. 提取参与方基础数据
    const rawCompName = rowRecord.companyName || '';
    const rawCompEnName = rowRecord.companyEnglishName || '';

    const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str);
    let compCn = rawCompName;
    let compEn = rawCompEnName;

    if (hasChinese(rawCompName)) {
      compCn = rawCompName;
      if (!compEn) compEn = rawCompEnName || rawCompName;
    } else {
      compEn = rawCompName || rawCompEnName;
      if (!compCn) compCn = rawCompEnName || rawCompName;
    }

    const parentNode = rootNode;
    const parentGid = String(parentNode.GID || parentNode.id || rootGid);
    const parentName = parentNode.companyNameCn || parentNode.name || parentNode.companyNameEn || parentGid;

    // 提取参与方详细联系人、商业注册号、地址等
    const detailInfo = rowRecord.detailInfo || {};
    const basicDTO = detailInfo.companyBasicDTO || {};
    const contactList = detailInfo.companyContactDTOList || [];

    const regNumber = basicDTO.businessRegistrationNumber || basicDTO.registrationNumber || '';
    const regAddress = basicDTO.addressDetail || rowRecord.addressDetail || basicDTO.postalAddress || '';

    // 需求3：从注册详细地址 (registeredAddress) 中分离出城市，并匹配列表中最相近的选择上
    const rawCityInput = basicDTO.registeredCity || rowRecord.registeredCityName || '';
    const matchedCity = extractAndMatchCity(regAddress, rawCityInput, familyTreeOptions.registeredCityOptions);

    // 提取 email, phone, website, otherExecutives
    let email = basicDTO.email || '';
    let contactPhone = basicDTO.companyPhoneNumber || '';
    let website = basicDTO.officialWebsite || '';
    let otherExecutives = '';

    if (Array.isArray(contactList) && contactList.length > 0) {
      const execNames: string[] = [];
      contactList.forEach((c: any) => {
        if (!email && c.email && c.email !== 'nill@nill.com') email = c.email;
        if (!contactPhone && c.contactPhone && !c.contactPhone.includes('敏感信息')) contactPhone = c.contactPhone;
        if (c.contactName && !c.contactName.includes('敏感信息')) {
          execNames.push(c.contactName);
        }
      });
      if (execNames.length > 0) {
        otherExecutives = Array.from(new Set(execNames)).join('; ');
      }
    }

    // 需求2：注册国家/地区，CMI 区域默认需要从列表中匹配一个最相近的选择上
    const rawCountry = rowRecord.registeredCountryName || basicDTO.registeredCountryName || '';
    const stdCountryName = getStandardCountryEnName(rawCountry);
    const matchedCountry = findBestMatchOption(stdCountryName || rawCountry, familyTreeOptions.registeredCountryOptions);
    const rawCmiRegion = getRegion(matchedCountry || stdCountryName);
    const matchedRegion = findBestMatchOption(rawCmiRegion, familyTreeOptions.cmiRegionOptions);

    // 保存参与方的这三个字段的原值以供在选择框下方呈现参考
    setRawParticipantOriginals({
      country: rawCountry || stdCountryName || '无',
      region: rawCmiRegion || '无',
      city: rawCityInput || (regAddress ? `地址: ${regAddress}` : '无')
    });

    // 需求3：CMI 行业 (cmiIndustry) 匹配最相近下拉选项
    const matchedCmiIndustry = findBestMatchOption(rootNode.cmiIndustry || parentNode.cmiIndustry || '', familyTreeOptions.cmiIndustryOptions);

    // 需求5：entityTypeName 与 enterpriseNature 也自动匹配最相近选项
    const matchedEntityType = findBestMatchOption(parentNode.entityTypeName || 'Subsidiary', familyTreeOptions.entityTypeOptions);
    const matchedNature = findBestMatchOption('CoreMember', familyTreeOptions.enterpriseNatureOptions);

    const defaultFormData = {
      dataSource: 'CMI',
      ultimateName: rootNode.companyNameEn || rootNode.name || '',
      GID: newGid,
      companyNameCn: compCn,
      companyNameEn: compEn,
      registeredName: compEn,
      establishmentDate: '',
      cmiIndustry: matchedCmiIndustry,
      cmccIndustry: rootNode.cmccIndustry || '',
      duns: '',
      ultimateGID: rootGid,
      parentGID: parentGid,
      parentCompanyName: parentName,
      entityTypeName: matchedEntityType,
      operatingStatus: 'Active',
      registeredCountry: matchedCountry,
      registeredCity: matchedCity,
      registeredAddress: regAddress,
      registrationNumber: regNumber,
      registrationType: '',
      enterpriseNature: matchedNature,
      email: email,
      contactPhone: contactPhone,
      website: website,
      ceo: '',
      otherExecutives: otherExecutives,
      mainBusiness: parentNode.mainBusiness || '',
      employeeCount: '',
      revenueCurrency: 'USD',
      revenueYear: '2024',
      summary: '', // 需求4：公司简介 (summary) 默认为空
      tags: parentNode.tags || '',
      treeLevel: (parentNode.treeLevel || 1) + 1,
      subCount: 0,
      latitude: null,
      longitude: null,
      assetsUSD: null,
      salesUSD: null,
      annualRevenue: null,
      isDomesticUltimate: false,
      nationAgent: false,
      cmiRegion: matchedRegion,
    };

    updateAddNodeFormData(defaultFormData);
    updateGrandparentInfo(parentGid);
    setAddNodeModalVisible(true);
  }, [originalData, gid, updateGrandparentInfo, updateAddNodeFormData, familyTreeOptions, findBestMatchOption, extractAndMatchCity]);

  // 父节点改变时自动更新属性与Grandparent信息
  const handleParentNodeChangeInForm = useCallback((parentGid: string) => {
    const parentNode = nodeMapRef.current.get(String(parentGid)) || originalData.find(d => String(d.GID || d.id) === String(parentGid));
    if (!parentNode) return;

    const parentCn = parentNode.companyNameCn || parentNode.name || parentGid;
    const parentLevel = Number(parentNode.treeLevel || 1);

    updateAddNodeFormData((prev: any) => ({
      ...prev,
      parentGID: String(parentGid),
      parentCompanyName: parentCn,
      treeLevel: parentLevel + 1,
      entityTypeName: parentNode.entityTypeName || prev?.entityTypeName || 'Subsidiary',
      mainBusiness: parentNode.mainBusiness || prev?.mainBusiness || '',
      summary: parentNode.summary || prev?.summary || '',
      tags: parentNode.tags || prev?.tags || ''
    }));

    updateGrandparentInfo(parentGid);
  }, [originalData, updateGrandparentInfo, updateAddNodeFormData]);

  // 提交新增树节点到 keyGlobalFamilyTree 集合
  const handleSubmitAddNode = useCallback(async () => {
    if (!addNodeFormData || !addNodeFormData.GID || !addNodeFormData.companyNameCn || !addNodeFormData.parentGID) {
      message.warning('请填写必填信息：节点 GID、中文名称与父节点！');
      return;
    }

    if (!formValidationStatus.countryValid) {
      message.error('无法提交：注册国家/地区 (registeredCountry) 不能为空，且必须与下拉列表中现有内容一致！');
      return;
    }
    if (!formValidationStatus.regionValid) {
      message.error('无法提交：CMI 区域 (cmiRegion) 不能为空，且必须与下拉列表中现有内容一致！');
      return;
    }
    if (!formValidationStatus.cityValid) {
      message.error('无法提交：注册城市 (registeredCity) 不能为空！');
      return;
    }

    try {
      setSubmittingAddNode(true);
      const recordToInsert = {
        ...addNodeFormData,
        subCount: 0,
        treeLevel: Number(addNodeFormData.treeLevel || 2)
      };

      // 1. 提交至数据库 keyGlobalFamilyTree 集合
      await request('/api/v1/wildcards/keyGlobalFamilyTree/bulk-upsert', {
        method: 'POST',
        data: {
          records: [recordToInsert],
          primaryKey: 'GID'
        }
      });

      // 2. 本地更新 originalData 与 nodeMapRef 全局基因树节点
      setOriginalData(prev => [...prev, recordToInsert]);
      nodeMapRef.current.set(String(recordToInsert.GID), recordToInsert);

      // 3. 在参与方治理 TAB1 界面上，默认把此新增节点在界面上自动选择上 (不自动关联落库)
      if (targetParticipantRow) {
        handleSelectMappedNode(targetParticipantRow, recordToInsert.GID, recordToInsert);
      }

      setAddNodeModalVisible(false);
      message.success(`节点【${recordToInsert.companyNameCn}】(#${recordToInsert.GID}) 已成功落库 keyGlobalFamilyTree 表！已为您在界面自动选择该节点，请点击最右侧“保存手动关联”按钮提交落库。`);
    } catch (e: any) {
      console.error('提交新增节点失败', e);
      message.error(`提交新增节点失败: ${e.message || '未知错误'}`);
    } finally {
      setSubmittingAddNode(false);
    }
  }, [addNodeFormData, targetParticipantRow, handleSelectMappedNode, formValidationStatus]);




  // 治理比对工具：全量企业分支 GID 列表（不进行国家过滤，展示该企业所有分支）
  const allBranchGids = useMemo(() => {
    return originalData
      .filter(d => d._nodeType !== 'region' && d._nodeType !== 'country' && d._nodeType !== 'city')
      .map(d => String(d.GID || d.id))
      .filter(Boolean);
  }, [originalData]);

  // --- 治理比对工具：关键字提取与预置 ---
  const loadGovernanceKeywords = useCallback(async () => {
    if (!gid) return;
    try {
      let keywords: string[] = [];
      const res = await request('/api/v1/wildcards/keycustomer', {
        method: 'GET',
        params: { query: JSON.stringify({ GID: String(gid) }) }
      }).catch(() => ({ results: [] }));
      const recs = res.results || res.data?.results || [];
      if (recs.length > 0 && Array.isArray(recs[0].keyWords) && recs[0].keyWords.length > 0) {
        keywords = recs[0].keyWords;
      } else {
        const rootNode = originalData.find(d => !d.parentId) || originalData[0];
        const names = [
          recs[0]?.nameCn,
          recs[0]?.nameEn,
          recs[0]?.abbr,
          rootNode?.companyNameCn,
          rootNode?.companyNameEn,
          rootNode?.abbr
        ].filter(Boolean);
        keywords = Array.from(new Set(names));
      }
      const opts = keywords.map(kw => ({ label: kw, value: kw }));
      setGovernanceKeywordsOptions(opts);
      setSelectedKeywords(keywords); // 默认多选全选
      setSavedKeywords(keywords); // 同步已落库关键字基准
      if (keywords.length > 0) {
        fetchGovernanceData(keywords);
        fetchEndCustomerGovernanceData(keywords);
        fetchEnterpriseCustomerGovernanceData(keywords);
      } else {
        setGovernanceData([]);
        setEndCustomerData([]);
        setEnterpriseCustomerData([]);
      }
    } catch (e) {
      console.error('加载治理关键字失败', e);
    }
  }, [gid, originalData, fetchGovernanceData]);

  // --- 治理比对工具：提交关键字更新 keycustomer 表 ---
  const handleSubmitKeywords = useCallback(async () => {
    if (!gid) {
      message.error('未找到当前要客 GID');
      return;
    }
    try {
      setSubmittingKeywords(true);
      const res = await request('/api/v1/wildcards/keycustomer', {
        method: 'GET',
        params: { query: JSON.stringify({ GID: String(gid) }) }
      });
      const recs = res.results || res.data?.results || [];
      if (recs.length > 0 && recs[0]._id) {
        await request(`/api/v1/wildcards/keycustomer/${recs[0]._id}`, {
          method: 'PATCH',
          data: { keyWords: selectedKeywords }
        });
      } else {
        await request('/api/v1/wildcards/keycustomer/bulk-upsert', {
          method: 'POST',
          data: {
            records: [{ GID: String(gid), keyWords: selectedKeywords }],
            primaryKey: 'GID'
          }
        });
      }
      message.success('更新要客关键字成功！');
      setSavedKeywords(selectedKeywords); // 同步已落库关键字基准
      fetchGovernanceData(selectedKeywords);
      fetchEndCustomerGovernanceData(selectedKeywords);
      fetchEnterpriseCustomerGovernanceData(selectedKeywords);
    } catch (e: any) {
      console.error('提交关键字失败', e);
      message.error(`提交关键字失败: ${e.message || '未知错误'}`);
    } finally {
      setSubmittingKeywords(false);
    }
  }, [gid, selectedKeywords, fetchGovernanceData]);

  // --- 终端客户治理工具：数据获取与匹配映射 ---
  const fetchEndCustomerGovernanceData = useCallback(async (overrideKeywords?: string[]) => {
    if (!gid) return;
    const kwList = overrideKeywords !== undefined ? overrideKeywords : selectedKeywords;
    if (!kwList || kwList.length === 0) {
      setEndCustomerData([]);
      setEndCustomerLoading(false);
      return;
    }
    setEndCustomerLoading(true);
    try {
      const nodeMap = new Map<string, any>();
      originalData.forEach(d => {
        if (d.GID || d.id) {
          nodeMap.set(String(d.GID || d.id), d);
        }
      });

      const custMappingRes = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'GET',
        params: { options: JSON.stringify({ limit: 50000 }) }
      }).catch(() => ({ results: [] }));
      const custMappingRecords = custMappingRes.results || custMappingRes.data?.results || [];

      const extCustToGidMap = new Map<string, string>();
      const extCustToMappingPathMap = new Map<string, string>();
      const extCustToMethodMap = new Map<string, string>();

      custMappingRecords.forEach((r: any) => {
        const extId = String(r.extCustId || '');
        const gidVal = String(r.GID || '');
        const mPath = String(r.mappingPath || '');
        const mMethod = String(r.method || '');

        if (extId && gidVal) {
          extCustToGidMap.set(extId, gidVal);
          if (mPath) {
            extCustToMappingPathMap.set(extId, mPath);
          }
          if (mMethod) {
            extCustToMethodMap.set(extId, mMethod);
          }
        }
      });

      const validKws = kwList.map((kw) => kw.trim()).filter(Boolean);
      if (validKws.length === 0) {
        setEndCustomerData([]);
        setEndCustomerLoading(false);
        return;
      }

      const kwChunks: string[][] = [];
      for (let i = 0; i < validKws.length; i += 8) {
        kwChunks.push(validKws.slice(i, i + 8));
      }

      const custPromises = kwChunks.map((chunk) => {
        const pattern = chunk.map((kw) => escapeRegExp(kw)).join('|');
        const rx = { $regex: pattern, $options: 'i' };
        const queryObj = {
          customerTypeName: 'End Customer',
          $or: [
            { enterpriseName: rx },
            { custId: rx },
            { custCode: rx },
          ],
        };
        return request('/api/v1/wildcards/ibosscustomers', {
          method: 'GET',
          params: {
            query: JSON.stringify(queryObj),
            options: JSON.stringify({ limit: 50000 }),
          },
        })
          .then((res) => (res.results || res.data?.results || []) as any[])
          .catch(() => [] as any[]);
      });

      const custChunkResults = await Promise.all(custPromises);
      const rawCustMap = new Map<string, any>();
      custChunkResults.flat().forEach((r: any) => {
        const idKey = String(r._id || r.custId || '');
        if (idKey && !rawCustMap.has(idKey)) {
          rawCustMap.set(idKey, r);
        }
      });
      const rawCustList = Array.from(rawCustMap.values());

      // 提取当前终端客户记录列表的所有企业名称 (enterpriseName) 集合，关联 dmcTCV 表中的“终端客户名称”
      const currentEnterpriseNames = Array.from(new Set(rawCustList.map((r: any) => String(r.enterpriseName || '').trim()).filter(Boolean))) as string[];

      let rawTcvList: any[] = [];
      if (currentEnterpriseNames.length > 0) {
        try {
          // 为了防范大量企业名称导致 GET URL 参数超长 (HTTP 414/431)，采用 Chunk=30 分块并发抓取，最多抓取前 300 家企业
          const chunkSize = 30;
          const chunks: string[][] = [];
          const cappedNames = currentEnterpriseNames.slice(0, 300);
          for (let i = 0; i < cappedNames.length; i += chunkSize) {
            chunks.push(cappedNames.slice(i, i + chunkSize));
          }

          const promises = chunks.map((chunk: string[]) =>
            request('/api/v1/wildcards/dmcTCV', {
              method: 'GET',
              params: {
                query: JSON.stringify({ '终端客户名称': { $in: chunk } }),
                options: JSON.stringify({ limit: 50000 })
              }
            }).then(res => ((res.results || res.data?.results || []) as any[])).catch(() => [] as any[])
          );

          const resultsArray = await Promise.all(promises);
          rawTcvList = (resultsArray.flat() as any[]);
        } catch (tcvErr) {
          console.warn('获取终端客户 dmcTCV 项目明细失败，忽略 TCV 匹配', tcvErr);
        }
      }

      const tcvByEndCustNameMap = new Map<string, any[]>();

      rawTcvList.forEach((rec: any) => {
        const endCustName = String(rec['终端客户名称'] || '').trim();
        if (!endCustName) return;

        const formattedItem = {
          _id: rec._id,
          '签约客户名称': rec['签约客户名称'] || '—',
          '终端客户名称': rec['终端客户名称'] || '—',
          '大区': rec['大区'] || rec['大区中文名称'] || rec['区域'] || rec['销售大区'] || rec['销售单元大区'] || rec['区域名称'] || '—',
          '销售单元': rec['销售单元中文名称'] || rec['销售单元编码'] || rec['销售单元'] || '—',
          '电路编号': rec['电路编号'] || rec['电路参考编号'] || '—',
          '合同签署日期': rec['合同签署日期'] || '—',
          '产品分类': rec['市场经分产品分类'] || rec['TCV产品名称'] || rec['产品分类'] || '—',
          '签单金额 (港币)': rec['签单金额(港币)'] !== undefined ? rec['签单金额(港币)'] : (rec['签单金额（港币）'] || rec['签单金额'] || 0)
        };

        if (!tcvByEndCustNameMap.has(endCustName)) {
          tcvByEndCustNameMap.set(endCustName, []);
        }
        tcvByEndCustNameMap.get(endCustName)!.push(formattedItem);
      });

      const assembled = rawCustList.map((r: any) => {
        const custId = String(r.custId || '').trim();
        const enterpriseName = String(r.enterpriseName || '').trim();
        const country = r.country || r.registerAreaName || '';
        const city = r.city || '';
        const commAddr = r.commAddr || r.address || '';

        const mappedGid = extCustToGidMap.get(custId) || '';
        const mappingPath = extCustToMappingPathMap.get(custId) || '';
        const method = extCustToMethodMap.get(custId) || '';
        const nodeMatch = mappedGid ? nodeMap.get(mappedGid) : null;
        const isMapped = !!nodeMatch;

        // 根据终端客户的 enterpriseName 匹配 dmcTCV 表的“终端客户名称”项目列表
        const tcvList = enterpriseName ? (tcvByEndCustNameMap.get(enterpriseName) || []) : [];
        const hasTcv = tcvList.length > 0;

        const matchedKeywords: string[] = [];
        if (kwList && kwList.length > 0) {
          const compNameLower = enterpriseName.toLowerCase();
          kwList.forEach(kw => {
            if (!kw) return;
            const kwLower = kw.trim().toLowerCase();
            if (kwLower && compNameLower.includes(kwLower)) {
              matchedKeywords.push(kw.trim());
            }
          });
        }

        let mappedCnName = '';
        let mappedEnName = '';
        let mappedCountry = '';
        let mappedCity = '';
        if (nodeMatch) {
          mappedCnName = nodeMatch.companyNameCn || nodeMatch.name || mappedGid;
          mappedEnName = nodeMatch.companyNameEn || '';
          mappedCountry = nodeMatch.registeredCountry || nodeMatch.position || '';
          mappedCity = nodeMatch.registeredCity || nodeMatch.city || '';
        }

        return {
          _id: r._id,
          matchedKeywords,
          custId,
          enterpriseName,
          country,
          city,
          commAddr,
          mappedGid,
          mappedCnName,
          mappedEnName,
          mappedCountry,
          mappedCity,
          mappingPath,
          method,
          isMapped,
          isManualMapped: false,
          hasTcv,
          tcvList
        };
      });

      assembled.sort((a: any, b: any) => {
        if (a.isMapped !== b.isMapped) {
          return a.isMapped ? 1 : -1;
        }
        const kwA = (a.matchedKeywords || []).join(',');
        const kwB = (b.matchedKeywords || []).join(',');
        return kwA.localeCompare(kwB, 'zh-CN');
      });

      setEndCustomerRowData(assembled);
      setTimeout(() => {
        endCustomerGridRef.current?.api?.autoSizeAllColumns();
      }, 100);
    } catch (err) {
      console.error('获取终端客户治理数据失败', err);
      message.error('获取终端客户治理数据失败');
    } finally {
      setEndCustomerLoading(false);
    }
  }, [gid, originalData, selectedKeywords]);

  // --- 终端客户治理工具：保存手动选择的关联到 keyFamilyTreeCustMapping 表 ---
  const handleSaveEndCustomerManualMapping = useCallback(async (rowRecord: any) => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法保存终端客户关联');
      return;
    }
    if (!rowRecord || !rowRecord.custId || !rowRecord.mappedGid) {
      message.warning('无法提交：缺少客户标识或映射节点 GID');
      return;
    }

    const custId = String(rowRecord.custId);
    const selectedGid = String(rowRecord.mappedGid);
    const ultimateGid = String(gid || rowRecord.ultimateGID || selectedGid);

    setSavingEndCustomerIdMap(prev => ({ ...prev, [custId]: true }));

    try {
      const payload = {
        ultimateGID: ultimateGid,
        GID: selectedGid,
        extCustId: custId,
        mappingPath: 'endCustomer',
        method: 'manual',
        createdAt: new Date().toISOString()
      };

      await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'POST',
        data: payload
      });

      message.success(`关联成功！已成功保存终端客户与家族树节点关联`);

      setEndCustomerRowData(prevData => {
        return prevData.map(item => {
          if (item.custId === custId) {
            return {
              ...item,
              isManualMapped: false,
              isMapped: true,
              mappingPath: 'endCustomer',
              method: 'manual'
            };
          }
          return item;
        });
      });
      setTimeout(() => {
        endCustomerGridRef.current?.api?.refreshCells({ force: true });
        endCustomerGridRef.current?.api?.redrawRows();
      }, 50);
    } catch (err) {
      console.error('保存终端客户关联失败:', err);
      message.error('保存终端客户关联失败，请稍后重试');
    } finally {
      setSavingEndCustomerIdMap(prev => ({ ...prev, [custId]: false }));
    }
  }, [gid]);

  // --- 终端客户治理工具：手选分支节点联动修改 handler ---
  const handleSelectEndCustomerMappedNode = useCallback((rowRecord: any, selectedGid: string) => {
    const targetNode = nodeMapRef.current.get(String(selectedGid)) || originalData.find(d => String(d.GID || d.id) === String(selectedGid));
    if (!targetNode) return;

    const cnName = targetNode.companyNameCn || targetNode.name || selectedGid;
    const enName = targetNode.companyNameEn || '';
    const regCountry = targetNode.registeredCountry || targetNode.position || '';
    const regCity = targetNode.registeredCity || targetNode.city || '';

    setEndCustomerRowData(prevData => {
      return prevData.map(item => {
        if (item.custId === rowRecord.custId) {
          return {
            ...item,
            mappedGid: selectedGid,
            mappedCnName: cnName,
            mappedEnName: enName,
            mappedCountry: regCountry,
            mappedCity: regCity,
            isMapped: true,
            isManualMapped: true,
          };
        }
        return item;
      });
    });

    message.success(`已为【${rowRecord.enterpriseName || rowRecord.custId}】选中节点: ${cnName} (#${selectedGid})，请点击最右侧“关联”按钮提交落库`);
  }, [originalData]);

  // --- 企业客户治理工具：拉取 ibosscustomers 表 customerTypeName = "Enterprise" 记录并组装节点映射 ---
  const fetchEnterpriseCustomerGovernanceData = useCallback(async (overrideKeywords?: string[]) => {
    if (!gid || !originalData || originalData.length === 0) return;
    const kwList = overrideKeywords !== undefined ? overrideKeywords : selectedKeywords;
    if (!kwList || kwList.length === 0) {
      setEnterpriseCustomerData([]);
      setEnterpriseCustomerLoading(false);
      return;
    }

    setEnterpriseCustomerLoading(true);
    try {
      const nodeMap = new Map<string, any>();
      originalData.forEach((d: any) => {
        if (d.GID || d.id) {
          nodeMap.set(String(d.GID || d.id), d);
        }
      });

      const custMappingRes = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'GET',
        params: { options: JSON.stringify({ limit: 50000 }) }
      }).catch(() => ({ results: [] }));
      const custMappingRecords = custMappingRes.results || custMappingRes.data?.results || [];

      const extCustToGidMap = new Map<string, string>();
      const extCustToMappingPathMap = new Map<string, string>();
      const extCustToMethodMap = new Map<string, string>();

      custMappingRecords.forEach((r: any) => {
        const extId = String(r.extCustId || '');
        const gidVal = String(r.GID || '');
        const mPath = String(r.mappingPath || '');
        const mMethod = String(r.method || '');

        if (extId && gidVal) {
          extCustToGidMap.set(extId, gidVal);
          if (mPath) {
            extCustToMappingPathMap.set(extId, mPath);
          }
          if (mMethod) {
            extCustToMethodMap.set(extId, mMethod);
          }
        }
      });

      const validKws = kwList.map((kw) => kw.trim()).filter(Boolean);
      if (validKws.length === 0) {
        setEnterpriseCustomerData([]);
        setEnterpriseCustomerLoading(false);
        return;
      }

      const kwChunks: string[][] = [];
      for (let i = 0; i < validKws.length; i += 8) {
        kwChunks.push(validKws.slice(i, i + 8));
      }

      const custPromises = kwChunks.map((chunk) => {
        const pattern = chunk.map((kw) => escapeRegExp(kw)).join('|');
        const rx = { $regex: pattern, $options: 'i' };
        const queryObj = {
          customerTypeName: 'Enterprise',
          $or: [
            { enterpriseName: rx },
            { custId: rx },
            { custCode: rx },
          ],
        };
        return request('/api/v1/wildcards/ibosscustomers', {
          method: 'GET',
          params: {
            query: JSON.stringify(queryObj),
            options: JSON.stringify({ limit: 50000 }),
          },
        })
          .then((res) => (res.results || res.data?.results || []) as any[])
          .catch(() => [] as any[]);
      });

      const custChunkResults = await Promise.all(custPromises);
      const rawCustMap = new Map<string, any>();
      custChunkResults.flat().forEach((r: any) => {
        const idKey = String(r._id || r.custId || '');
        if (idKey && !rawCustMap.has(idKey)) {
          rawCustMap.set(idKey, r);
        }
      });
      const rawCustList = Array.from(rawCustMap.values());

      // 提取当前企业客户记录列表的所有 custId 集合，精准关联 dmcTCV 表中的“签约客户标识”
      const currentCustIds = Array.from(new Set(rawCustList.map((r: any) => String(r.custId || '').trim()).filter(Boolean))) as string[];

      let rawTcvList: any[] = [];
      if (currentCustIds.length > 0) {
        try {
          // 为了防范大量 custId 导致 GET URL 参数超长 (HTTP 414/431)，采用 Chunk=30 分块并发抓取，最多抓取前 300 家企业
          const chunkSize = 30;
          const chunks: string[][] = [];
          const cappedCustIds = currentCustIds.slice(0, 300);
          for (let i = 0; i < cappedCustIds.length; i += chunkSize) {
            chunks.push(cappedCustIds.slice(i, i + chunkSize));
          }

          const promises = chunks.map((chunk: string[]) =>
            request('/api/v1/wildcards/dmcTCV', {
              method: 'GET',
              params: {
                query: JSON.stringify({ '签约客户标识': { $in: chunk } }),
                options: JSON.stringify({ limit: 50000 })
              }
            }).then(res => ((res.results || res.data?.results || []) as any[])).catch(() => [] as any[])
          );

          const resultsArray = await Promise.all(promises);
          rawTcvList = (resultsArray.flat() as any[]);
        } catch (tcvErr) {
          console.warn('获取 dmcTCV 项目明细失败，忽略 TCV 匹配', tcvErr);
        }
      }

      const tcvByCustIdMap = new Map<string, any[]>();

      rawTcvList.forEach((rec: any) => {
        const signId = String(rec['签约客户标识'] || rec['签约客户Id'] || rec['签约客户ID'] || '').trim();
        if (!signId) return;

        const formattedItem = {
          _id: rec._id,
          '签约客户名称': rec['签约客户名称'] || '—',
          '终端客户名称': rec['终端客户名称'] || '—',
          '大区': rec['大区'] || rec['大区中文名称'] || rec['区域'] || rec['销售大区'] || rec['销售单元大区'] || rec['区域名称'] || '—',
          '销售单元': rec['销售单元中文名称'] || rec['销售单元编码'] || rec['销售单元'] || '—',
          '电路编号': rec['电路编号'] || rec['电路参考编号'] || '—',
          '合同签署日期': rec['合同签署日期'] || '—',
          '产品分类': rec['市场经分产品分类'] || rec['TCV产品名称'] || rec['产品分类'] || '—',
          '签单金额 (港币)': rec['签单金额(港币)'] !== undefined ? rec['签单金额(港币)'] : (rec['签单金额（港币）'] || rec['签单金额'] || 0)
        };

        if (!tcvByCustIdMap.has(signId)) {
          tcvByCustIdMap.set(signId, []);
        }
        tcvByCustIdMap.get(signId)!.push(formattedItem);
      });

      const assembled = rawCustList.map((r: any) => {
        const custId = String(r.custId || '').trim();
        const enterpriseName = String(r.enterpriseName || '').trim();
        const country = r.country || r.registerAreaName || '';
        const city = r.city || '';
        const commAddr = r.commAddr || r.address || '';

        const mappedGid = extCustToGidMap.get(custId) || '';
        const mappingPath = extCustToMappingPathMap.get(custId) || '';
        const method = extCustToMethodMap.get(custId) || '';
        const nodeMatch = mappedGid ? nodeMap.get(mappedGid) : null;
        const isMapped = !!nodeMatch;

        // 根据企业客户的 custId 匹配 dmcTCV 表的“签约客户标识”项目列表
        const tcvList = custId ? (tcvByCustIdMap.get(custId) || []) : [];
        const hasTcv = tcvList.length > 0;

        const matchedKeywords: string[] = [];
        if (kwList && kwList.length > 0) {
          const compNameLower = enterpriseName.toLowerCase();
          kwList.forEach(kw => {
            if (!kw) return;
            const kwLower = kw.trim().toLowerCase();
            if (kwLower && compNameLower.includes(kwLower)) {
              matchedKeywords.push(kw.trim());
            }
          });
        }

        let mappedCnName = '';
        let mappedEnName = '';
        let mappedCountry = '';
        let mappedCity = '';
        if (nodeMatch) {
          mappedCnName = nodeMatch.companyNameCn || nodeMatch.name || mappedGid;
          mappedEnName = nodeMatch.companyNameEn || '';
          mappedCountry = nodeMatch.registeredCountry || nodeMatch.position || '';
          mappedCity = nodeMatch.registeredCity || nodeMatch.city || '';
        }

        return {
          _id: r._id,
          matchedKeywords,
          custId,
          enterpriseName,
          country,
          city,
          commAddr,
          mappedGid,
          mappedCnName,
          mappedEnName,
          mappedCountry,
          mappedCity,
          mappingPath,
          method,
          isMapped,
          isManualMapped: false,
          hasTcv,
          tcvList
        };
      });

      assembled.sort((a: any, b: any) => {
        if (a.isMapped !== b.isMapped) {
          return a.isMapped ? 1 : -1;
        }
        const kwA = (a.matchedKeywords || []).join(',');
        const kwB = (b.matchedKeywords || []).join(',');
        return kwA.localeCompare(kwB, 'zh-CN');
      });

      setEnterpriseCustomerRowData(assembled);
      setTimeout(() => {
        enterpriseCustomerGridRef.current?.api?.autoSizeAllColumns();
      }, 100);
    } catch (err) {
      console.error('获取企业客户治理数据失败', err);
      message.error('获取企业客户治理数据失败');
    } finally {
      setEnterpriseCustomerLoading(false);
    }
  }, [gid, originalData, selectedKeywords]);

  // --- 企业客户治理工具：保存手动选择的关联到 keyFamilyTreeCustMapping 表 ---
  const handleSaveEnterpriseCustomerManualMapping = useCallback(async (rowRecord: any) => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法保存企业客户关联');
      return;
    }
    if (!rowRecord || !rowRecord.custId || !rowRecord.mappedGid) {
      message.warning('无法提交：缺少客户标识或映射节点 GID');
      return;
    }

    const custId = String(rowRecord.custId);
    const selectedGid = String(rowRecord.mappedGid);
    const ultimateGid = String(gid || rowRecord.ultimateGID || selectedGid);

    setSavingEnterpriseCustomerIdMap(prev => ({ ...prev, [custId]: true }));

    try {
      const payload = {
        ultimateGID: ultimateGid,
        GID: selectedGid,
        extCustId: custId,
        mappingPath: 'enterprise',
        method: 'manual',
        createdAt: new Date().toISOString()
      };

      await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        method: 'POST',
        data: payload
      });

      message.success(`关联成功！已成功保存企业客户与家族树节点关联`);

      setEnterpriseCustomerRowData(prevData => {
        return prevData.map(item => {
          if (item.custId === custId) {
            return {
              ...item,
              isManualMapped: false,
              isMapped: true,
              mappingPath: 'enterprise',
              method: 'manual'
            };
          }
          return item;
        });
      });
      setTimeout(() => {
        enterpriseCustomerGridRef.current?.api?.refreshCells({ force: true });
        enterpriseCustomerGridRef.current?.api?.redrawRows();
      }, 50);
    } catch (err) {
      console.error('保存企业客户关联失败:', err);
      message.error('保存企业客户关联失败，请稍后重试');
    } finally {
      setSavingEnterpriseCustomerIdMap(prev => ({ ...prev, [custId]: false }));
    }
  }, [gid]);

  // --- 企业客户治理工具：手选分支节点联动修改 handler ---
  const handleSelectEnterpriseCustomerMappedNode = useCallback((rowRecord: any, selectedGid: string) => {
    const targetNode = nodeMapRef.current.get(String(selectedGid)) || originalData.find(d => String(d.GID || d.id) === String(selectedGid));
    if (!targetNode) return;

    const cnName = targetNode.companyNameCn || targetNode.name || selectedGid;
    const enName = targetNode.companyNameEn || '';
    const regCountry = targetNode.registeredCountry || targetNode.position || '';
    const regCity = targetNode.registeredCity || targetNode.city || '';

    setEnterpriseCustomerRowData(prevData => {
      return prevData.map(item => {
        if (item.custId === rowRecord.custId) {
          return {
            ...item,
            mappedGid: selectedGid,
            mappedCnName: cnName,
            mappedEnName: enName,
            mappedCountry: regCountry,
            mappedCity: regCity,
            isMapped: true,
            isManualMapped: true,
          };
        }
        return item;
      });
    });

    message.success(`已为企业客户【${rowRecord.enterpriseName || rowRecord.custId}】选中节点: ${cnName} (#${selectedGid})，请点击最右侧“关联”按钮提交落库`);
  }, [originalData]);

  // --- 参与方治理：提交手动映射关联，成功后自动连带刷新终端客户治理与企业客户治理数据 ---
  const handleSaveManualMapping = useCallback(async (rowRecord: any) => {
    if (isReadOnly) {
      message.warning('当前账号为只读权限，无法提交关联数据');
      return;
    }
    if (!rowRecord || !rowRecord.companyId || !rowRecord.mappedGid) {
      message.warning('无法提交：缺少参与方标识或映射节点 GID');
      return;
    }

    const companyId = String(rowRecord.companyId);
    const selectedGid = String(rowRecord.mappedGid);
    const ultimateGid = String(gid || rowRecord.ultimateGID || selectedGid);

    setSavingCompanyIdMap(prev => ({ ...prev, [companyId]: true }));

    try {
      // 1. 查询 excelParticipantCustMapping，找到该 companyId 关联的 extCustId 列表
      const partRes = await request('/api/v1/wildcards/excelParticipantCustMapping', {
        method: 'GET',
        params: {
          query: JSON.stringify({ companyId }),
          options: JSON.stringify({ limit: 1000 })
        }
      });

      const partList = partRes.results || partRes.data?.results || [];
      let extCustIds: string[] = partList
        .map((r: any) => String(r.extCustId || ''))
        .filter(Boolean);

      extCustIds = Array.from(new Set(extCustIds));

      // 若未关联出 extCustId，兜底使用 companyId 自身
      if (extCustIds.length === 0) {
        extCustIds = [companyId];
      }

      // 2. 遍历 extCustIds，生成并插入多条记录到 keyFamilyTreeCustMapping
      let successCount = 0;
      for (const extCustId of extCustIds) {
        const payload = {
          ultimateGID: ultimateGid,
          GID: selectedGid,
          extCustId: extCustId,
          mappingPath: 'participant',
          method: 'manual',
          companyId: companyId,
          createdAt: new Date().toISOString()
        };

        await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
          method: 'POST',
          data: payload
        });
        successCount++;
      }

      message.success(`关联成功！已成功向 keyFamilyTreeCustMapping 保存 ${successCount} 条手动关联数据`);

      // 3. 更新前端当前参与方行数据状态
      setGovernanceRowData(prevData => {
        return prevData.map(item => {
          if (item.companyId === companyId) {
            return {
              ...item,
              isManualMapped: false,
              isMapped: true,
              mappingPath: 'participant',
              method: 'manual'
            };
          }
          return item;
        });
      });
      setTimeout(() => {
        governanceGridRef.current?.api?.refreshCells({ force: true });
        governanceGridRef.current?.api?.redrawRows();
      }, 50);

      // 4. 自动重新拉取并刷洗「终端客户」治理与「企业客户」治理页面数据
      fetchEndCustomerGovernanceData();
      fetchEnterpriseCustomerGovernanceData();
    } catch (err) {
      console.error('保存手动关联失败:', err);
      message.error('保存手动关联失败，请稍后重试');
    } finally {
      setSavingCompanyIdMap(prev => ({ ...prev, [companyId]: false }));
    }
  }, [gid, fetchEndCustomerGovernanceData, fetchEnterpriseCustomerGovernanceData]);






  // --- 治理比对工具：自定义单元格下拉选择器（兼得方案：全Cell无缝铺满 + 空格分割多词求交集层层过滤 + 点击100%响应选择联动） ---
  const BranchSelectEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const initialVal = String(props.data?.mappedGid || props.value || '');
      const valueRef = useRef<string>(initialVal);
      const [value, setValue] = useState<string>(initialVal);
      const selectRef = useRef<any>(null);

      useImperativeHandle(ref, () => ({
        getValue() {
          return valueRef.current;
        },
        isPopup() {
          return false;
        }
      }));

      useEffect(() => {
        const timer = setTimeout(() => {
          selectRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }, []);

      const options = useMemo(() => {
        return (allBranchGids || []).map((val: string) => {
          const node = nodeMapRef.current.get(String(val));
          const searchStr = getFormatSearchText(node, val);
          return {
            value: val,
            label: searchStr,
            node,
            searchValue: searchStr
          };
        });
      }, []);

      const handleSelect = (val: string) => {
        if (!val) return;
        valueRef.current = String(val);
        setValue(String(val));

        // 同步将选中的节点全量属性写入 props.data，解决 AG Grid 重新渲染单元格与 React 异步 State 之间的竞态导致的空值问题
        const targetNode = nodeMapRef.current.get(String(val)) || originalData.find(d => String(d.GID || d.id) === String(val));
        if (targetNode && props.data) {
          const cnName = targetNode.companyNameCn || targetNode.name || val;
          const enName = targetNode.companyNameEn || '';
          const regCountry = targetNode.registeredCountry || targetNode.position || '';
          const regCity = targetNode.registeredCity || targetNode.city || '';

          props.data.mappedGid = String(val);
          props.data.mappedCnName = cnName;
          props.data.mappedEnName = enName;
          props.data.mappedCountry = regCountry;
          props.data.mappedCity = regCity;
          props.data.isMapped = true;
          props.data.isManualMapped = true;
        }

        // 调用手选 handler 触发成功提示与 React State 同步
        if (props.data) {
          handleSelectMappedNode(props.data, String(val));
        }

        // 通知 AG Grid 提交修改并强制刷新当前行渲染
        if (props.api) {
          if (props.node) {
            props.api.refreshCells({ rowNodes: [props.node], force: true });
          }
          if (typeof props.api.stopEditing === 'function') {
            props.api.stopEditing(false);
          }
        } else if (typeof props.stopEditing === 'function') {
          props.stopEditing();
        }
      };

      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', margin: 0, padding: 0 }}>
          <Select
            ref={selectRef}
            showSearch
            defaultOpen
            variant="borderless"
            style={{ width: '100%', height: '100%', backgroundColor: '#fff' }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            dropdownStyle={{ minWidth: 360, zIndex: 999999 }}
            value={value || undefined}
            placeholder="输入空格分隔关键字层层过滤..."
            filterOption={(input: string, option: any) => {
              if (!input || !input.trim()) return true;
              const keywords = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
              const targetText = String(option?.searchValue || '').toLowerCase();
              return keywords.every(kw => targetText.includes(kw));
            }}
            onChange={(val: any) => {
              if (val) handleSelect(String(val));
            }}
            options={options}
            optionRender={(option: any) => {
              const node = option.data.node;
              const val = option.data.value;
              if (!node) return <span style={{ color: '#999' }}>请选择关联节点...</span>;
              const cn = node.companyNameCn || node.name || val;
              const en = node.companyNameEn;
              const country = node.registeredCountry || node.position || '';
              const city = node.registeredCity || node.city || '';
              const showEn = Boolean(en && en.trim() !== '' && en.trim().toLowerCase() !== cn?.trim().toLowerCase());
              const hasCity = Boolean(city && city !== '-' && city.trim().toLowerCase() !== country?.trim().toLowerCase());

              return (
                <div
                  style={{ padding: '2px 0', lineHeight: 1.35 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cn}
                  </div>
                  {showEn ? (
                    <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {en}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '1px' }}>-</div>
                  )}
                  <div style={{ marginTop: '2px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {country && (
                      <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {country}
                      </Tag>
                    )}
                    {hasCity && (
                      <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {city}
                      </Tag>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      );
    });
  }, [allBranchGids]);

  // --- 治理比对工具：列定义 ---
  const governanceColDefs = useMemo<any[]>(() => [
    {
      headerName: '命中关键字',
      field: 'matchedKeywords',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const list: string[] = params.value || [];
        if (!list || list.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
            {list.map((kw, idx) => (
              <Tag color="red" key={idx} style={{ fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                {kw}
              </Tag>
            ))}
          </div>
        );
      }
    },
    {
      headerName: '参与方 ID',
      field: 'companyId',
      minWidth: 160,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const compId = params.value;
        const rowData = params.data || {};
        const count = rowData.relatedCustCount || 0;

        if (!compId) return <span style={{ color: '#999' }}>-</span>;

        if (count > 0) {
          return (
            <span
              style={{ color: '#1677ff', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
              onClick={() => handleOpenParticipantDetail(String(compId))}
              title={`点击查看参与方关联的 ${count} 个客户详情`}
            >
              {compId}({count})
            </span>
          );
        }

        return (
          <span style={{ color: '#111827', fontWeight: 500 }}>
            {compId}(0)
          </span>
        );
      }
    },
    {
      headerName: '参与方企业名称',
      field: 'companyName',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
      onCellDoubleClicked: (params: any) => {
        if (params.data) {
          handleOpenAddNodeModal(params.data);
        }
      },
      cellRenderer: (params: any) => {
        const { companyName, companyEnglishName, companyId } = params.data || {};
        const showEn = Boolean(companyEnglishName && companyEnglishName.trim() !== '' && companyEnglishName.trim().toLowerCase() !== companyName?.trim().toLowerCase());
        const log = companyId ? governanceLogsMapRef.current[`companyId_${companyId}`] : null;
        const notes = log?.notes;

        const content = (
          <div style={{ padding: '4px 0', lineHeight: 1.4 }} title="💡 双击此单元格可按此参与方自动生成并新增基因树节点">
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {companyName || '-'}
            </div>
            {showEn && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', wordBreak: 'break-all' }}>
                {companyEnglishName}
              </div>
            )}
          </div>
        );

        if (notes && notes.trim()) {
          return (
            <Tooltip
              title={
                <div
                  style={{ maxHeight: 260, overflowY: 'auto', padding: '4px' }}
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(notes) }}
                />
              }
              overlayStyle={{ maxWidth: 400 }}
            >
              {content}
            </Tooltip>
          );
        }

        return content;
      }
    },
    {
      headerName: '注册国家',
      field: 'registeredCountryName',
      minWidth: 120,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '映射节点 GID',
      field: 'mappedGid',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return <span style={{ color: '#111827', fontWeight: 500 }}>{val}</span>;
      }
    },
    {
      headerName: '映射节点名称',
      field: 'mappedCnName',
      minWidth: 280,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      editable: (params: any) => !params.data?.isMapped || params.data?.isManualMapped,
      cellEditor: BranchSelectEditor,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const { mappedCnName, mappedEnName, mappedCountry, mappedCity, isMapped } = params.data || {};

        if (!isMapped) {
          return (
            <div style={{ width: '100%', cursor: 'pointer', color: '#1677ff', fontStyle: 'italic', fontSize: '12px' }} title="点击或双击激活AG Grid原生富选择框">
              未关联 (点击/双击打字选择分支节点...)
            </div>
          );
        }

        const showEn = Boolean(mappedEnName && mappedEnName.trim() !== '' && mappedEnName.trim().toLowerCase() !== mappedCnName?.trim().toLowerCase());
        const hasCity = Boolean(mappedCity && mappedCity !== '-' && mappedCity.trim().toLowerCase() !== mappedCountry?.trim().toLowerCase());

        return (
          <div style={{ padding: '4px 0', lineHeight: 1.4, width: '100%' }}>
            {/* 第一行：中文名 */}
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {mappedCnName || '-'}
            </div>
            {/* 第二行：英文名 */}
            {showEn && (
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', wordBreak: 'break-all' }}>
                {mappedEnName}
              </div>
            )}
            {/* 第三行（Badge 样式）：国家与城市 */}
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {/* 需求1：国家背景蓝色，字体颜色：深蓝色 */}
              {mappedCountry && (
                <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCountry}
                </Tag>
              )}
              {/* 需求1：城市背景绿色，字体：深绿色 */}
              {hasCity && (
                <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCity}
                </Tag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      headerName: '详细地址',
      field: 'addressDetail',
      minWidth: 260,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '操作',
      field: 'actions',
      minWidth: 180,
      pinned: 'right', // 最后一列固定列
      filter: false,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: (params: any) => {
        const rowData = params.data || {};
        const isManual = Boolean(rowData.isManualMapped);
        const compId = String(rowData.companyId || '');
        const isSaving = Boolean(savingCompanyIdMapRef.current[compId]);
        const relatedCustCount = Number(rowData.relatedCustCount || 0);

        // 需求4：「参与方」治理 TAB 页面，如果参与方没有对应的 cust（即参与方ID列中对应的客户数目为 0），则不允许关联，关联按钮强制为 disable 状态
        const isBtnDisabled = !isManual || relatedCustCount === 0;

        const log = compId ? governanceLogsMapRef.current[`companyId_${compId}`] : null;
        const hasNotes = Boolean(log && log.notes && log.notes.trim());

        return (
          <>
            <Tooltip title={relatedCustCount === 0 ? "参与方关联客户数为 0，不允许提交关联" : undefined}>
              <Button
                type={isManual && relatedCustCount > 0 ? 'primary' : 'default'}
                size="small"
                disabled={isBtnDisabled}
                loading={isSaving}
                icon={<LinkOutlined />}
                onClick={() => handleSaveManualMapping(rowData)}
              >
                关联
              </Button>
            </Tooltip>
            <Button
              type={hasNotes ? 'primary' : 'default'}
              ghost={hasNotes}
              size="small"
              icon={<FormOutlined />}
              onClick={() => {
                setCurrentAnnotateRow(rowData);
                const existingLog = compId ? governanceLogsMapRef.current[`companyId_${compId}`] : null;
                setNotesContent(unescapeHtml(existingLog?.notes || ''));
                setAnnotateModalVisible(true);
              }}
            >
              标注
            </Button>
          </>
        );
      }
    }
  ], [allBranchGids, originalData, handleSaveManualMapping]);

  // --- 终端客户治理工具：自定义单元格下拉选择器 ---
  const EndCustomerBranchSelectEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const initialVal = String(props.data?.mappedGid || props.value || '');
      const valueRef = useRef<string>(initialVal);
      const [value, setValue] = useState<string>(initialVal);
      const selectRef = useRef<any>(null);

      useImperativeHandle(ref, () => ({
        getValue() {
          return valueRef.current;
        },
        isPopup() {
          return false;
        }
      }));

      useEffect(() => {
        const timer = setTimeout(() => {
          selectRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }, []);

      const options = useMemo(() => {
        return (allBranchGids || []).map((val: string) => {
          const node = nodeMapRef.current.get(String(val));
          const searchStr = getFormatSearchText(node, val);
          return {
            value: val,
            label: searchStr,
            node,
            searchValue: searchStr
          };
        });
      }, []);

      const handleSelect = (val: string) => {
        if (!val) return;
        valueRef.current = String(val);
        setValue(String(val));

        const targetNode = nodeMapRef.current.get(String(val)) || originalData.find(d => String(d.GID || d.id) === String(val));
        if (targetNode && props.data) {
          const cnName = targetNode.companyNameCn || targetNode.name || val;
          const enName = targetNode.companyNameEn || '';
          const regCountry = targetNode.registeredCountry || targetNode.position || '';
          const regCity = targetNode.registeredCity || targetNode.city || '';

          props.data.mappedGid = String(val);
          props.data.mappedCnName = cnName;
          props.data.mappedEnName = enName;
          props.data.mappedCountry = regCountry;
          props.data.mappedCity = regCity;
          props.data.isMapped = true;
          props.data.isManualMapped = true;
        }

        if (props.data) {
          handleSelectEndCustomerMappedNode(props.data, String(val));
        }

        if (props.api) {
          if (props.node) {
            props.api.refreshCells({ rowNodes: [props.node], force: true });
          }
          if (typeof props.api.stopEditing === 'function') {
            props.api.stopEditing(false);
          }
        } else if (typeof props.stopEditing === 'function') {
          props.stopEditing();
        }
      };

      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', margin: 0, padding: 0 }}>
          <Select
            ref={selectRef}
            showSearch
            defaultOpen
            variant="borderless"
            style={{ width: '100%', height: '100%', backgroundColor: '#fff' }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            dropdownStyle={{ minWidth: 360, zIndex: 999999 }}
            value={value || undefined}
            placeholder="输入空格分隔关键字层层过滤..."
            filterOption={(input: string, option: any) => {
              if (!input || !input.trim()) return true;
              const keywords = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
              const targetText = String(option?.searchValue || '').toLowerCase();
              return keywords.every(kw => targetText.includes(kw));
            }}
            onChange={(val: any) => {
              if (val) handleSelect(String(val));
            }}
            options={options}
            optionRender={(option: any) => {
              const node = option.data.node;
              const val = option.data.value;
              if (!node) return <span style={{ color: '#999' }}>请选择关联节点...</span>;
              const cn = node.companyNameCn || node.name || val;
              const en = node.companyNameEn;
              const country = node.registeredCountry || node.position || '';
              const city = node.registeredCity || node.city || '';
              const showEn = Boolean(en && en.trim() !== '' && en.trim().toLowerCase() !== cn?.trim().toLowerCase());
              const hasCity = Boolean(city && city !== '-' && city.trim().toLowerCase() !== country?.trim().toLowerCase());

              return (
                <div
                  style={{ padding: '2px 0', lineHeight: 1.35 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cn}
                  </div>
                  {showEn ? (
                    <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {en}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '1px' }}>-</div>
                  )}
                  <div style={{ marginTop: '2px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {country && (
                      <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {country}
                      </Tag>
                    )}
                    {hasCity && (
                      <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {city}
                      </Tag>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      );
    });
  }, [allBranchGids, handleSelectEndCustomerMappedNode, originalData]);

  // --- 终端客户治理工具：列定义 ---
  const endCustomerColDefs = useMemo<any[]>(() => [
    {
      headerName: '命中关键字',
      field: 'matchedKeywords',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const list: string[] = params.value || [];
        if (!list || list.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
            {list.map((kw, idx) => (
              <Tag color="red" key={idx} style={{ fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                {kw}
              </Tag>
            ))}
          </div>
        );
      }
    },
    {
      headerName: '客户 ID',
      field: 'custId',
      minWidth: 160,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const custId = params.value;
        const rowData = params.data || {};
        const hasTcv = Boolean(rowData.hasTcv && rowData.tcvList && rowData.tcvList.length > 0);

        if (!custId) return <span style={{ color: '#999' }}>-</span>;

        if (hasTcv) {
          const tcvCount = rowData.tcvList.length;
          return (
            <Tooltip title={`点击查看关联的 ${tcvCount} 笔 TCV 项目`}>
              <span
                style={{
                  color: '#389e0d', // 绿色字体标识
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEnterpriseInfo({
                    custId: rowData.custId,
                    enterpriseName: rowData.enterpriseName
                  });
                  setSelectedEnterpriseTcvList(rowData.tcvList || []);
                  setEnterpriseTcvModalVisible(true);
                }}
              >
                {custId}({tcvCount})
              </span>
            </Tooltip>
          );
        }

        return <span style={{ color: '#1677ff', fontWeight: 600 }}>{custId}</span>;
      }
    },
    {
      headerName: '终端客户企业名称',
      field: 'enterpriseName',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const name = params.value;
        const rowData = params.data || {};
        const custId = rowData.custId;
        const log = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
        const notes = log?.notes;

        const content = (
          <div style={{ padding: '4px 0', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {name || '-'}
            </div>
          </div>
        );

        if (notes && notes.trim()) {
          return (
            <Tooltip
              title={
                <div
                  style={{ maxHeight: 260, overflowY: 'auto', padding: '4px' }}
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(notes) }}
                />
              }
              overlayStyle={{ maxWidth: 400 }}
            >
              {content}
            </Tooltip>
          );
        }

        return content;
      }
    },
    {
      headerName: '注册国家/地区',
      field: 'country',
      minWidth: 120,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '映射节点 GID',
      field: 'mappedGid',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return <span style={{ color: '#111827', fontWeight: 500 }}>{val}</span>;
      }
    },
    {
      headerName: '映射节点名称',
      field: 'mappedCnName',
      minWidth: 280,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      editable: (params: any) => !params.data?.isMapped || params.data?.isManualMapped,
      cellEditor: EndCustomerBranchSelectEditor,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const { mappedCnName, mappedEnName, mappedCountry, mappedCity, isMapped } = params.data || {};

        if (!isMapped) {
          return (
            <div style={{ width: '100%', cursor: 'pointer', color: '#1677ff', fontStyle: 'italic', fontSize: '12px' }} title="点击或双击激活AG Grid原生富选择框">
              未关联 (点击/双击打字选择分支节点...)
            </div>
          );
        }

        const showEn = Boolean(mappedEnName && mappedEnName.trim() !== '' && mappedEnName.trim().toLowerCase() !== mappedCnName?.trim().toLowerCase());
        const hasCity = Boolean(mappedCity && mappedCity !== '-' && mappedCity.trim().toLowerCase() !== mappedCountry?.trim().toLowerCase());

        return (
          <div style={{ padding: '4px 0', lineHeight: 1.4, width: '100%' }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {mappedCnName || '-'}
            </div>
            {showEn && (
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', wordBreak: 'break-all' }}>
                {mappedEnName}
              </div>
            )}
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {mappedCountry && (
                <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCountry}
                </Tag>
              )}
              {hasCity && (
                <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCity}
                </Tag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      headerName: '详细地址',
      field: 'commAddr',
      minWidth: 260,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '操作',
      field: 'actions',
      minWidth: 160,
      pinned: 'right',
      filter: false,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: (params: any) => {
        const rowData = params.data || {};
        const isManual = Boolean(rowData.isManualMapped);
        const custId = String(rowData.custId || '');
        const isSaving = Boolean(savingEndCustomerIdMapRef.current[custId]);

        const log = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
        const hasNotes = Boolean(log && log.notes && log.notes.trim());

        return (
          <>
            <Button
              type={isManual ? 'primary' : 'default'}
              size="small"
              disabled={!isManual}
              loading={isSaving}
              icon={<LinkOutlined />}
              onClick={() => handleSaveEndCustomerManualMapping(rowData)}
            >
              关联
            </Button>
            <Button
              type={hasNotes ? 'primary' : 'default'}
              ghost={hasNotes}
              size="small"
              icon={<FormOutlined />}
              onClick={() => {
                setCurrentAnnotateRow(rowData);
                const existingLog = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
                setNotesContent(unescapeHtml(existingLog?.notes || ''));
                setAnnotateModalVisible(true);
              }}
            >
              标注
            </Button>
          </>
        );
      }
    }
  ], [EndCustomerBranchSelectEditor, handleSaveEndCustomerManualMapping]);

  // --- 企业客户治理工具：自定义单元格下拉选择器 ---
  const EnterpriseCustomerBranchSelectEditor = useMemo(() => {
    return forwardRef((props: any, ref) => {
      const initialVal = String(props.data?.mappedGid || props.value || '');
      const valueRef = useRef<string>(initialVal);
      const [value, setValue] = useState<string>(initialVal);
      const selectRef = useRef<any>(null);

      useImperativeHandle(ref, () => ({
        getValue() {
          return valueRef.current;
        },
        isPopup() {
          return false;
        }
      }));

      useEffect(() => {
        const timer = setTimeout(() => {
          selectRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }, []);

      const options = useMemo(() => {
        return (allBranchGids || []).map((val: string) => {
          const node = nodeMapRef.current.get(String(val));
          const searchStr = getFormatSearchText(node, val);
          return {
            value: val,
            label: searchStr,
            node,
            searchValue: searchStr
          };
        });
      }, []);

      const handleSelect = (val: string) => {
        if (!val) return;
        valueRef.current = String(val);
        setValue(String(val));

        const targetNode = nodeMapRef.current.get(String(val)) || originalData.find(d => String(d.GID || d.id) === String(val));
        if (targetNode && props.data) {
          const cnName = targetNode.companyNameCn || targetNode.name || val;
          const enName = targetNode.companyNameEn || '';
          const regCountry = targetNode.registeredCountry || targetNode.position || '';
          const regCity = targetNode.registeredCity || targetNode.city || '';

          props.data.mappedGid = String(val);
          props.data.mappedCnName = cnName;
          props.data.mappedEnName = enName;
          props.data.mappedCountry = regCountry;
          props.data.mappedCity = regCity;
          props.data.isMapped = true;
          props.data.isManualMapped = true;

          handleSelectEnterpriseCustomerMappedNode(props.data, String(val));
        }

        if (props.api) {
          if (props.node) {
            props.api.refreshCells({ rowNodes: [props.node], force: true });
          }
          if (typeof props.api.stopEditing === 'function') {
            props.api.stopEditing(false);
          }
        } else if (typeof props.stopEditing === 'function') {
          props.stopEditing();
        }
      };

      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', margin: 0, padding: 0 }}>
          <Select
            ref={selectRef}
            showSearch
            defaultOpen
            variant="borderless"
            style={{ width: '100%', height: '100%', backgroundColor: '#fff' }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            dropdownStyle={{ minWidth: 360, zIndex: 999999 }}
            value={value || undefined}
            placeholder="输入空格分隔关键字层层过滤..."
            filterOption={(input: string, option: any) => {
              if (!input || !input.trim()) return true;
              const keywords = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
              const targetText = String(option?.searchValue || '').toLowerCase();
              return keywords.every(kw => targetText.includes(kw));
            }}
            onChange={(val: any) => {
              if (val) handleSelect(String(val));
            }}
            options={options}
            optionRender={(option: any) => {
              const node = option.data.node;
              const val = option.data.value;
              if (!node) return <span style={{ color: '#999' }}>请选择关联节点...</span>;
              const cn = node.companyNameCn || node.name || val;
              const en = node.companyNameEn;
              const country = node.registeredCountry || node.position || '';
              const city = node.registeredCity || node.city || '';
              const showEn = Boolean(en && en.trim() !== '' && en.trim().toLowerCase() !== cn?.trim().toLowerCase());
              const hasCity = Boolean(city && city !== '-' && city.trim().toLowerCase() !== country?.trim().toLowerCase());

              return (
                <div
                  style={{ padding: '2px 0', lineHeight: 1.35 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cn}
                  </div>
                  {showEn ? (
                    <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {en}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '1px' }}>-</div>
                  )}
                  <div style={{ marginTop: '2px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {country && (
                      <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {country}
                      </Tag>
                    )}
                    {hasCity && (
                      <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '10.5px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                        {city}
                      </Tag>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      );
    });
  }, [allBranchGids, originalData, handleSelectEnterpriseCustomerMappedNode]);

  // --- 企业客户治理工具：列定义 ---
  const enterpriseCustomerColDefs = useMemo<any[]>(() => [
    {
      headerName: '命中关键字',
      field: 'matchedKeywords',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const list: string[] = params.value || [];
        if (!list || list.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
            {list.map((kw, idx) => (
              <Tag color="red" key={idx} style={{ fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                {kw}
              </Tag>
            ))}
          </div>
        );
      }
    },
    {
      headerName: '客户 ID',
      field: 'custId',
      minWidth: 160,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const custId = params.value;
        const rowData = params.data || {};
        const hasTcv = Boolean(rowData.hasTcv && rowData.tcvList && rowData.tcvList.length > 0);

        if (!custId) return <span style={{ color: '#999' }}>-</span>;

        if (hasTcv) {
          const tcvCount = rowData.tcvList.length;
          return (
            <Tooltip title={`点击查看关联的 ${tcvCount} 笔 TCV 项目`}>
              <span
                style={{
                  color: '#389e0d', // 绿色字体标识
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEnterpriseInfo({
                    custId: rowData.custId,
                    enterpriseName: rowData.enterpriseName
                  });
                  setSelectedEnterpriseTcvList(rowData.tcvList || []);
                  setEnterpriseTcvModalVisible(true);
                }}
              >
                {custId}({tcvCount})
              </span>
            </Tooltip>
          );
        }

        return <span style={{ color: '#1677ff', fontWeight: 600 }}>{custId}</span>;
      }
    },
    {
      headerName: '企业客户企业名称',
      field: 'enterpriseName',
      minWidth: 220,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const name = params.value;
        const rowData = params.data || {};
        const custId = rowData.custId;
        const log = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
        const notes = log?.notes;

        const content = (
          <div style={{ padding: '4px 0', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {name || '-'}
            </div>
          </div>
        );

        if (notes && notes.trim()) {
          return (
            <Tooltip
              title={
                <div
                  style={{ maxHeight: 260, overflowY: 'auto', padding: '4px' }}
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(notes) }}
                />
              }
              overlayStyle={{ maxWidth: 400 }}
            >
              {content}
            </Tooltip>
          );
        }

        return content;
      }
    },
    {
      headerName: '注册国家/地区',
      field: 'country',
      minWidth: 120,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '映射节点 GID',
      field: 'mappedGid',
      minWidth: 140,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return <span style={{ color: '#999' }}>-</span>;
        return <span style={{ color: '#111827', fontWeight: 500 }}>{val}</span>;
      }
    },
    {
      headerName: '映射节点名称',
      field: 'mappedCnName',
      minWidth: 280,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      editable: (params: any) => !params.data?.isMapped || params.data?.isManualMapped,
      cellEditor: EnterpriseCustomerBranchSelectEditor,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: any) => {
        const { mappedCnName, mappedEnName, mappedCountry, mappedCity, isMapped } = params.data || {};

        if (!isMapped) {
          return (
            <div style={{ width: '100%', cursor: 'pointer', color: '#1677ff', fontStyle: 'italic', fontSize: '12px' }} title="点击或双击激活AG Grid原生富选择框">
              未关联 (点击/双击打字选择分支节点...)
            </div>
          );
        }

        const showEn = Boolean(mappedEnName && mappedEnName.trim() !== '' && mappedEnName.trim().toLowerCase() !== mappedCnName?.trim().toLowerCase());
        const hasCity = Boolean(mappedCity && mappedCity !== '-' && mappedCity.trim().toLowerCase() !== mappedCountry?.trim().toLowerCase());

        return (
          <div style={{ padding: '4px 0', lineHeight: 1.4, width: '100%' }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px' }}>
              {mappedCnName || '-'}
            </div>
            {showEn && (
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', wordBreak: 'break-all' }}>
                {mappedEnName}
              </div>
            )}
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {mappedCountry && (
                <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCountry}
                </Tag>
              )}
              {hasCity && (
                <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '11px', margin: 0, padding: '0 6px', borderRadius: '4px' }}>
                  {mappedCity}
                </Tag>
              )}
            </div>
          </div>
        );
      }
    },
    {
      headerName: '详细地址',
      field: 'commAddr',
      minWidth: 260,
      filter: true,
      sortable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      headerName: '操作',
      field: 'actions',
      minWidth: 180,
      pinned: 'right',
      filter: false,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
      cellRenderer: (params: any) => {
        const rowData = params.data || {};
        const isManual = Boolean(rowData.isManualMapped);
        const custId = String(rowData.custId || '');
        const isSaving = Boolean(savingEnterpriseCustomerIdMapRef.current[custId]);

        const log = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
        const hasNotes = Boolean(log && log.notes && log.notes.trim());

        return (
          <>
            <Button
              type={isManual ? 'primary' : 'default'}
              size="small"
              disabled={!isManual}
              loading={isSaving}
              icon={<LinkOutlined />}
              onClick={() => handleSaveEnterpriseCustomerManualMapping(rowData)}
            >
              关联
            </Button>
            <Button
              type={hasNotes ? 'primary' : 'default'}
              ghost={hasNotes}
              size="small"
              icon={<FormOutlined />}
              onClick={() => {
                setCurrentAnnotateRow(rowData);
                const existingLog = custId ? governanceLogsMapRef.current[`custId_${custId}`] : null;
                setNotesContent(unescapeHtml(existingLog?.notes || ''));
                setAnnotateModalVisible(true);
              }}
            >
              标注
            </Button>
          </>
        );
      }
    }
  ], [EnterpriseCustomerBranchSelectEditor, handleSaveEnterpriseCustomerManualMapping]);

  const fetchDashboardData = useCallback(async () => {
    if (!gid) return;
    setDashboardLoading(true);
    try {
      const res = await request(`/api/v1/key-customer-overview/family-tree-dashboard-stats`, {
        method: 'GET',
        params: { gid, _t: Date.now() },
      });
      console.log('[fetchDashboardData] raw res from api:', res);
      console.log('[fetchDashboardData] res.penetratedGids stringify:', res?.penetratedGids ? JSON.stringify(res.penetratedGids) : 'undefined');
      console.log('[fetchDashboardData] res.data.penetratedGids stringify:', res?.data?.penetratedGids ? JSON.stringify(res.data.penetratedGids) : 'undefined');
      const rawData = res && typeof res === 'object' && ('data' in res) && res.data && typeof res.data === 'object' && ('penetratedGids' in res.data || 'tcvRecords' in res.data)
        ? res.data
        : res;
      console.log('[fetchDashboardData] chosen rawData:', rawData);
      console.log('[fetchDashboardData] chosen rawData penetratedGids stringify:', rawData?.penetratedGids ? JSON.stringify(rawData.penetratedGids) : 'undefined');
      setDashboardData(rawData || null);
      const targetGids = rawData?.penetratedGids || rawData?.data?.penetratedGids || [];
      if (gid && Array.isArray(targetGids)) {
        globalPenetratedGidsMap.set(String(gid), targetGids.map(String));
      }
      setPenetratedGids(targetGids);
      setGidToTcvMap(rawData?.gidToTcvMap || {});
    } catch (err) {
      console.error('获取海外家族树 Dashboard 统计数据失败:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    if (gid) {
      fetchData();
      fetchMappingData();
      fetchDashboardData();
      loadGovernanceKeywords();
    }
  }, [gid]);

  // 当家族树全量节点数据 originalData 加载完成时，自动重新匹配比对节点映射信息
  useEffect(() => {
    if (originalData.length > 0 && selectedKeywords.length > 0) {
      fetchGovernanceData(selectedKeywords);
      fetchEndCustomerGovernanceData(selectedKeywords);
      fetchEnterpriseCustomerGovernanceData(selectedKeywords);
    }
  }, [originalData]);

  // 初始化/完整重建图表（含 fit 居中定位）
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
        .linkUpdate(function (this: any, d: any) {
          d3.select(this)
            .attr('stroke', '#1677ff') // 醒目的蓝色
            .attr('stroke-width', d.data._highlighted || d.data._upToTheRootHighlighted ? 3 : 1.5);
        })
        .render()
        .fit();
    },
    [originalData, openDrawer],
  );

  // 仅更新图表数据并重新渲染，不执行 fit（保持当前的视口位置和展开/折叠状态不变）
  const updateChartData = useCallback(
    (chartData: any[]) => {
      if (!chartRef.current || chartData.length === 0) return;
      // 保存当前每个节点的展开状态，以便数据刷新后恢复
      const currentData: any[] = chartRef.current.data() || [];
      const expandedSet = new Set<string>();
      currentData.forEach((d: any) => {
        if (d._expanded) expandedSet.add(String(d.id));
      });
      const mergedData = chartData.map((d: any) => {
        if (expandedSet.has(String(d.id))) {
          return { ...d, _expanded: true };
        }
        if (d._nodeType === 'region' || d._nodeType === 'country' || d._nodeType === 'city') {
          return { ...d, _expanded: true };
        }
        return d;
      });
      chartRef.current.data(mergedData).render();
    },
    [],
  );

  // isChartInitialized 标记：记录图表是否已完成首次初始化
  const isChartInitialized = useRef(false);
  const prevIsRegionView = useRef(isRegionView);

  // 树图初始化渲染（仅在数据首次到达或视图模式切换时执行完整重建）
  useEffect(() => {
    if (originalData.length === 0 || activeTab !== 'tree') return;
    const regionViewChanged = prevIsRegionView.current !== isRegionView;
    prevIsRegionView.current = isRegionView;

    // 已初始化且视图模式未变 → Tab 切换回来，跳过重建，保持树的状态
    if (isChartInitialized.current && !regionViewChanged) return;

    const filtered = filterTreeData(originalData, showSites);
    const rawChartData = isRegionView ? buildRegionData(filtered) : filtered;

    const penetratedGidsSet = new Set((penetratedGids || []).map(String));
    const chartData = rawChartData.map((d: any) => {
      const nodeGid = String(d.id || d.GID || '').trim();
      const hasTcv = penetratedGidsSet.has(nodeGid) || (gidToTcvMap[nodeGid] && gidToTcvMap[nodeGid].length > 0);
      return {
        ...d,
        _hasTcv: hasTcv
      };
    });

    const timer = setTimeout(() => {
      renderChart(chartData);
      isChartInitialized.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, [originalData, isRegionView, renderChart, activeTab, filterTreeData, penetratedGids, gidToTcvMap]);

  // 仅在 showSites 变化时动态更新树数据，不 fit 不折叠，保持视口和展开状态
  const isFirstSiteEffect = useRef(true);
  useEffect(() => {
    if (isFirstSiteEffect.current) {
      isFirstSiteEffect.current = false;
      return;
    }
    if (originalData.length === 0 || activeTab !== 'tree' || !chartRef.current) return;
    const filtered = filterTreeData(originalData, showSites);
    const rawChartData = isRegionView ? buildRegionData(filtered) : filtered;
    const penetratedGidsSet = new Set((penetratedGids || []).map(String));
    const chartData = rawChartData.map((d: any) => {
      const nodeGid = String(d.id || d.GID || '').trim();
      const hasTcv = penetratedGidsSet.has(nodeGid) || (gidToTcvMap[nodeGid] && gidToTcvMap[nodeGid].length > 0);
      return {
        ...d,
        _hasTcv: hasTcv
      };
    });
    updateChartData(chartData);
  }, [showSites, penetratedGids, gidToTcvMap]);

  const toggleRegionView = () => setIsRegionView((prev) => !prev);

  // 树内搜索：支持根据企业中文名、英文名、注册地址及城市国家等信息搜索过滤定位
  const handleSearchTree = (value: string) => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    chart.clearHighlighting();
    const chartData = chart.data();
    chartData.forEach((d: any) => (d._expanded = false));
    const keyword = value.trim().toLowerCase();
    chartData.forEach((d: any) => {
      if (keyword !== '') {
        const nameCn = String(d.companyNameCn || d.name || '').toLowerCase();
        const nameEn = String(d.companyNameEn || d.registeredName || '').toLowerCase();
        const address = String(
          d.registeredAddress || d.addressDetail || d.position || d.city || d.registeredCountry || d.registeredCity || ''
        ).toLowerCase();
        const gid = String(d.id || d.GID || '').toLowerCase();

        if (
          nameCn.includes(keyword) ||
          nameEn.includes(keyword) ||
          address.includes(keyword) ||
          gid.includes(keyword)
        ) {
          d._highlighted = true;
          d._expanded = true;
        }
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

    const cols: any[] = fieldsArray.map((key) => {
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

    // 需求1：最后添加固定列，删除按钮，点击删除该行数据（通过 _id 字段或 GID 字段关联数据库）
    cols.push({
      headerName: '操作',
      field: 'actions',
      pinned: 'right' as const,
      width: 90,
      filter: false,
      sortable: false,
      resizable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: any) => {
        if (!p.data) return null;
        return (
          <Popconfirm
            title="确定要删除该分支节点记录吗？"
            onConfirm={() => handleDeleteFamilyTreeNode(p.data)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        );
      }
    });

    return cols;
  }, [originalData, openDrawer, handleDeleteFamilyTreeNode]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' }
  }), []);

  // 导出分支数据 EXCEL
  const handleExportBranchExcel = useCallback(() => {
    if (originalData.length === 0) return;
    const companyPrefix = nameCn || (originalData && originalData[0] ? originalData[0].companyNameCn || originalData[0].companyNameEn : '') || '海外家族树';
    const fileName = `${companyPrefix}_分支数据`;
    const cleanExport = originalData.map(({ id: rid, parentId: rpid, iconHtml, name: rname, ...rest }) => rest);
    if (cleanExport.length === 0) return;

    const sampleKeys = Object.keys(cleanExport[0]);
    const headers = sampleKeys.map(k => {
      if (k === 'companyNameCn') return '公司中文名';
      if (k === 'companyNameEn') return '公司英文名';
      if (k === 'registeredCountry') return '注册国家/地区';
      if (k === 'registeredCity') return '注册城市';
      if (k === 'operatingStatus') return '经营状态';
      if (k === 'registeredAddress') return '注册地址';
      if (k === 'cmiRegion') return 'CMI大区';
      return k;
    });

    const keys = sampleKeys.map(k => (r: any) => r[k]);
    exportToCsvExcel(fileName, headers, keys, cleanExport);
  }, [originalData, nameCn, exportToCsvExcel]);

  // 保存高清图片 (PNG) - 导出当前视口与当前展开状态
  const handleSaveTreeImage = useCallback(() => {
    if (!chartRef.current) {
      message.warning('家族树图表尚未初始化');
      return;
    }
    try {
      const companyName = nameCn || (originalData && originalData[0] ? originalData[0].companyNameCn || originalData[0].companyNameEn : '') || '海外家族树';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${companyName}_海外家族树_${dateStr}`;

      chartRef.current
        .imageName(filename)
        .exportImg({
          full: false, // 保证导出当前视口/当前折叠展开状态
          scale: 3,    // 3倍分辨率的高清 PNG 图
          save: true,
          backgroundColor: '#ffffff'
        });
      message.success('已启动高清 PNG 图片保存导出');
    } catch (err) {
      console.error('保存家族树图片失败:', err);
      message.error('保存图片失败，请重试');
    }
  }, [nameCn, originalData]);

  const pageTitle = nameCn || '';

  const isDashboard = activeTab === 'dashboard';

  return (
    <div style={{
      height: isDashboard ? 'auto' : 'calc(100vh - 70px)',
      minHeight: isDashboard ? 'calc(100vh - 70px)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '16px',
      overflow: isDashboard ? 'visible' : 'hidden',
    }}>
      {/* 覆盖 Tabs 高度样式防止 AG Grid 容器塌陷 */}
      <style>{`
        .ant-tabs-content-holder {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          ${isDashboard ? 'height: auto !important; overflow: visible !important;' : ''}
        }
        .ant-tabs-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          ${isDashboard ? 'height: auto !important; overflow: visible !important;' : ''}
        }
        .ant-tabs-tabpane-active {
          display: flex !important;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          ${isDashboard ? 'height: auto !important; overflow: visible !important;' : ''}
        }
        .row-diff-only-api,
        .row-diff-only-api .ag-cell {
          background-color: #fff7e6 !important;
        }
        .row-diff-only-api:hover,
        .row-diff-only-api:hover .ag-cell {
          background-color: #ffd8bf !important;
        }
        .row-governance-annotated,
        .row-governance-annotated .ag-cell {
          background-color: #f3f4f6 !important; /* 有标注的行：浅灰色背景 */
        }
        .row-governance-annotated:hover,
        .row-governance-annotated:hover .ag-cell {
          background-color: #e5e7eb !important; /* 有标注的行悬浮：稍加深浅灰色 */
        }
        .row-governance-status-no,
        .row-governance-status-no .ag-cell {
          background-color: #d1d5db !important; /* 灰色背景 */
        }
        .row-governance-status-no:hover,
        .row-governance-status-no:hover .ag-cell {
          background-color: #9ca3af !important; /* 悬浮加深灰色 */
        }
        .row-governance-manual-editing,
        .row-governance-manual-editing .ag-cell {
          background-color: #fff1f0 !important;
        }
        .row-governance-manual-editing:hover,
        .row-governance-manual-editing:hover .ag-cell {
          background-color: #ffccc7 !important;
        }
        .row-governance-mapped,
        .row-governance-mapped .ag-cell {
          background-color: #f6ffed !important;
        }
        .row-governance-mapped:hover,
        .row-governance-mapped:hover .ag-cell {
          background-color: #d9f7be !important;
        }
        .row-governance-mapped-manual,
        .row-governance-mapped-manual .ag-cell {
          background-color: #fff1f0 !important;
        }
        .row-governance-mapped-manual:hover,
        .row-governance-mapped-manual:hover .ag-cell {
          background-color: #ffccc7 !important;
        }
        /* 卡片 Tabs 样式优化：选中的标签整体背景颜色稍深，消除嵌入内嵌按钮感 */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
          border-radius: 6px 6px 0 0 !important;
          border: 1px solid #e5e7eb !important;
          background: #f3f4f6 !important;
          transition: all 0.2s ease !important;
          padding: 8px 16px !important;
          margin-right: 4px !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab .ant-tabs-tab-btn {
          color: #4b5563 !important;
          font-weight: 500 !important;
          font-size: 13.5px !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
          background: #0958d9 !important; /* 选中的标签整体深宝蓝色背景 */
          border-color: #0958d9 !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        /* 未选中的 Tab 内数字徽章：蓝底白字，与灰白 TAB 背景对比极其鲜明 */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab .tab-number-badge {
          background-color: #1677ff !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab .tab-number-text {
          color: #ffffff !important;
        }

        /* 选中的 Tab 内数字徽章：白底蓝字（选中TAB的数字用蓝色），与深蓝 TAB 背景对比极其鲜明 */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .tab-number-badge {
          background-color: #ffffff !important;
        }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .tab-number-text {
          color: #0958d9 !important;
        }
      `}</style>
      {/* 顶部标题区域 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center">
          <Tooltip title="返回要客清单">
            <Button icon={<SwapOutlined style={{ transform: 'rotate(180deg)' }} />} onClick={() => history.back()} />
          </Tooltip>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            {pageTitle}
          </h2>
          {gid && (
            <Tag color="blue" style={{ fontSize: 13 }}>
              Root GID: {gid}
            </Tag>
          )}
          {!loading && originalData.length > 0 && (
            <Tag color="green">节点总数: {originalData.length} | 节点渗透率: {penetratedNodesCount} / {originalData.length} ({penetrationRate})</Tag>
          )}

        </Space>
      </div>

      {/* 主体 Tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Tabs
          destroyInactiveTabPane={true}
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'endCustomerGovernance') {
              setTimeout(() => {
                endCustomerGridRef.current?.api?.autoSizeAllColumns();
              }, 150);
            } else if (key === 'enterpriseCustomerGovernance') {
              setTimeout(() => {
                enterpriseCustomerGridRef.current?.api?.autoSizeAllColumns();
              }, 150);
            } else if (key === 'governance') {
              setTimeout(() => {
                governanceGridRef.current?.api?.autoSizeAllColumns();
              }, 150);
            }
          }}
          type="card"
          tabBarStyle={{ marginBottom: 12 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          items={[
            {
              key: 'dashboard',
              label: renderTabLabel(<DashboardOutlined />, 'Dashboard'),
              children: (
                <DashboardTab
                  gid={gid}
                  originalData={originalData}
                  loading={loading}
                  dashboardData={dashboardData}
                  dashboardLoading={dashboardLoading}
                />
              )
            },
            {
              key: 'tree',
              label: renderTabLabel(<PartitionOutlined />, '家族树'),
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
                    <Checkbox
                      checked={showSites}
                      onChange={(e) => setShowSites(e.target.checked)}
                      style={{ marginRight: 8, fontSize: '13px' }}
                    >
                      显示网点
                    </Checkbox>
                    <Input
                      placeholder="搜索中文名、英文名、地址或GID..."
                      allowClear
                      prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                      onChange={(e) => handleSearchTree(e.target.value)}
                      style={{ width: 260, height: 32 }}
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
                    <Tooltip title="保存图片 (高清PNG)">
                      <div
                        onClick={handleSaveTreeImage}
                        style={iconBtnStyle}
                      >
                        <CameraOutlined style={{ fontSize: 16 }} />
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
                <span><TableOutlined style={{ marginRight: 6 }} />分支数据</span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 全文搜索与操作栏（靠右排列） */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                      <Input
                        placeholder="在数据表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={tableSearchText}
                        onChange={(e) => setTableSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                      <Button icon={<DownloadOutlined />} onClick={handleExportBranchExcel} disabled={originalData.length === 0}>
                        导出 EXCEL
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
                      getRowClass={(params: any) => {
                        if (!params.data) return undefined;
                        const ds = String(params.data.dataSource || params.data.data_source || params.data.source || '').trim().toUpperCase();
                        if (ds === 'CMI') {
                          return 'row-governance-manual-editing';
                        }
                        return undefined;
                      }}
                      onFirstDataRendered={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
                      onRowDataUpdated={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
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
            {
              key: 'mapping',
              label: renderTabLabel(<TableOutlined />, '已治理'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 全文搜索与操作栏（靠右排列） */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                      <Input
                        placeholder="在映射表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={mappingSearchText}
                        onChange={(e) => setMappingSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchMappingData}
                        loading={mappingLoading}
                      >

                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 映射表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      ref={mappingGridRef}
                      rowData={mappingRowData}
                      columnDefs={mappingColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={mappingSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      animateRows={true}
                      loading={mappingLoading}
                      getRowClass={(params: any) => {
                        const d = params.data || {};
                        if (
                          d.method === 'manual' ||
                          d.mappingPath === 'manual' ||
                          String(d.mappingPath || '').includes('manual') ||
                          d.isManualMapped
                        ) {
                          return 'row-governance-manual-editing';
                        }
                        return undefined;
                      }}
                      onFirstDataRendered={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
                      sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
                      statusBar={{
                        statusPanels: [
                          { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
                          { statusPanel: 'agSelectedRowCountComponent' },
                        ],
                      }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'governance',
              label: renderTabLabel(<NumberOneIcon />, '「参与方」治理'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 操作与关键字过滤栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 500px', minWidth: 360 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1677ff', lineHeight: '32px', whiteSpace: 'nowrap' }}>
                        记录数: {governanceRowData ? governanceRowData.length : 0} 条
                      </span>
                      <Select
                        mode="tags"
                        allowClear
                        style={{ flex: 1, minWidth: 300, maxWidth: '100%' }}
                        placeholder="输入或选择关键字过滤参与方..."
                        value={selectedKeywords}
                        maxTagCount={undefined}
                        onChange={(vals: string[]) => {
                          setSelectedKeywords(vals);
                          setGovernanceKeywordsOptions(prev => {
                            const existing = new Set(prev.map(p => p.value));
                            const added = vals.filter(v => !existing.has(v)).map(v => ({ label: v, value: v }));
                            return [...prev, ...added];
                          });
                          fetchGovernanceData(vals);
                        }}
                        options={governanceKeywordsOptions}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadGovernanceKeywords}
                        loading={governanceLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmitKeywords}
                        loading={submittingKeywords}
                        disabled={!isKeywordsChanged}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        提交Keys
                      </Button>
                    </div>

                    <Space style={{ paddingTop: 0 }}>
                      <Input
                        placeholder="在治理表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={governanceSearchText}
                        onChange={(e) => setGovernanceSearchText(e.target.value)}
                        style={{ width: 260 }}
                      />
                    </Space>
                  </div>

                  {/* AG Grid 表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      ref={governanceGridRef}
                      rowData={governanceRowData}
                      columnDefs={governanceColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={governanceSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      singleClickEdit={true}
                      animateRows={true}
                      loading={governanceLoading}
                      onCellValueChanged={() => { }}
                      getRowClass={(params: any) => {
                        const d = params.data || {};
                        const log = (d.companyId && governanceLogsMapRef.current[`companyId_${d.companyId}`]) ||
                                    (d.custId && governanceLogsMapRef.current[`custId_${d.custId}`]);
                        if (log && log.notes && log.notes.trim() !== '') {
                          return 'row-governance-annotated';
                        }
                        if (log && log.status === 'no') {
                          return 'row-governance-status-no';
                        }
                        if (
                          d.method === 'manual' ||
                          d.mappingPath === 'manual' ||
                          String(d.mappingPath || '').includes('manual') ||
                          d.isManualMapped
                        ) {
                          return 'row-governance-manual-editing';
                        }
                        if (d.isMapped) {
                          return 'row-governance-mapped';
                        }
                        return undefined;
                      }}
                      onFirstDataRendered={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
                      sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
                      statusBar={{
                        statusPanels: [
                          { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
                          { statusPanel: 'agSelectedRowCountComponent' },
                        ],
                      }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'endCustomerGovernance',
              label: renderTabLabel(<NumberTwoIcon />, '「终端客户」治理'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 操作与关键字过滤栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 500px', minWidth: 360 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1677ff', lineHeight: '32px', whiteSpace: 'nowrap' }}>
                        记录数: {endCustomerRowData ? endCustomerRowData.length : 0} 条
                      </span>
                      <Select
                        mode="tags"
                        allowClear
                        style={{ flex: 1, minWidth: 300, maxWidth: '100%' }}
                        placeholder="输入或选择关键字过滤终端客户..."
                        value={selectedKeywords}
                        maxTagCount={undefined}
                        onChange={(vals: string[]) => {
                          setSelectedKeywords(vals);
                          setGovernanceKeywordsOptions(prev => {
                            const existing = new Set(prev.map(p => p.value));
                            const added = vals.filter(v => !existing.has(v)).map(v => ({ label: v, value: v }));
                            return [...prev, ...added];
                          });
                          fetchGovernanceData(vals);
                          fetchEndCustomerGovernanceData(vals);
                        }}
                        options={governanceKeywordsOptions}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadGovernanceKeywords}
                        loading={endCustomerLoading || governanceLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmitKeywords}
                        loading={submittingKeywords}
                        disabled={!isKeywordsChanged}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        提交Keys
                      </Button>
                    </div>

                    <Space style={{ paddingTop: 0 }}>
                      <Input
                        placeholder="在终端客户表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={endCustomerSearchText}
                        onChange={(e) => setEndCustomerSearchText(e.target.value)}
                        style={{ width: 260 }}
                      />
                    </Space>
                  </div>

                  {/* AG Grid 表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      ref={endCustomerGridRef}
                      rowData={endCustomerRowData}
                      columnDefs={endCustomerColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={endCustomerSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      singleClickEdit={true}
                      animateRows={true}
                      loading={endCustomerLoading}
                      onCellValueChanged={() => { }}
                      getRowClass={(params: any) => {
                        const d = params.data || {};
                        const log = (d.companyId && governanceLogsMapRef.current[`companyId_${d.companyId}`]) ||
                                    (d.custId && governanceLogsMapRef.current[`custId_${d.custId}`]);
                        if (log && log.notes && log.notes.trim() !== '') {
                          return 'row-governance-annotated';
                        }
                        if (log && log.status === 'no') {
                          return 'row-governance-status-no';
                        }
                        if (
                          d.method === 'manual' ||
                          d.mappingPath === 'manual' ||
                          String(d.mappingPath || '').includes('manual') ||
                          d.isManualMapped
                        ) {
                          return 'row-governance-manual-editing';
                        }
                        if (d.isMapped) {
                          return 'row-governance-mapped';
                        }
                        return undefined;
                      }}
                      autoSizeStrategy={{ type: 'fitCellContents' }}
                      onFirstDataRendered={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
                      sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
                      statusBar={{
                        statusPanels: [
                          { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
                          { statusPanel: 'agSelectedRowCountComponent' },
                        ],
                      }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'enterpriseCustomerGovernance',
              label: renderTabLabel(<NumberThreeIcon />, '「企业客户」治理'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 操作与关键字过滤栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: '1 1 500px', minWidth: 360 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1677ff', lineHeight: '32px', whiteSpace: 'nowrap' }}>
                        记录数: {enterpriseCustomerRowData ? enterpriseCustomerRowData.length : 0} 条
                      </span>
                      <Select
                        mode="tags"
                        allowClear
                        style={{ flex: 1, minWidth: 300, maxWidth: '100%' }}
                        placeholder="输入或选择关键字过滤企业客户..."
                        value={selectedKeywords}
                        maxTagCount={undefined}
                        onChange={(vals: string[]) => {
                          setSelectedKeywords(vals);
                          setGovernanceKeywordsOptions(prev => {
                            const existing = new Set(prev.map(p => p.value));
                            const added = vals.filter(v => !existing.has(v)).map(v => ({ label: v, value: v }));
                            return [...prev, ...added];
                          });
                          fetchGovernanceData(vals);
                          fetchEndCustomerGovernanceData(vals);
                          fetchEnterpriseCustomerGovernanceData(vals);
                        }}
                        options={governanceKeywordsOptions}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={loadGovernanceKeywords}
                        loading={enterpriseCustomerLoading || endCustomerLoading || governanceLoading}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSubmitKeywords}
                        loading={submittingKeywords}
                        disabled={!isKeywordsChanged}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        提交Keys
                      </Button>
                    </div>

                    <Space style={{ paddingTop: 0 }}>
                      <Input
                        placeholder="在企业客户表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={enterpriseCustomerSearchText}
                        onChange={(e) => setEnterpriseCustomerSearchText(e.target.value)}
                        style={{ width: 260 }}
                      />
                    </Space>
                  </div>

                  {/* AG Grid 表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      ref={enterpriseCustomerGridRef}
                      rowData={enterpriseCustomerRowData}
                      columnDefs={enterpriseCustomerColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={enterpriseCustomerSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      singleClickEdit={true}
                      animateRows={true}
                      loading={enterpriseCustomerLoading}
                      onCellValueChanged={() => { }}
                      getRowClass={(params: any) => {
                        const d = params.data || {};
                        const log = (d.companyId && governanceLogsMapRef.current[`companyId_${d.companyId}`]) ||
                                    (d.custId && governanceLogsMapRef.current[`custId_${d.custId}`]);
                        if (log && log.notes && log.notes.trim() !== '') {
                          return 'row-governance-annotated';
                        }
                        if (log && log.status === 'no') {
                          return 'row-governance-status-no';
                        }
                        if (
                          d.method === 'manual' ||
                          d.mappingPath === 'manual' ||
                          String(d.mappingPath || '').includes('manual') ||
                          d.isManualMapped
                        ) {
                          return 'row-governance-manual-editing';
                        }
                        if (d.isMapped) {
                          return 'row-governance-mapped';
                        }
                        return undefined;
                      }}
                      autoSizeStrategy={{ type: 'fitCellContents' }}
                      onFirstDataRendered={(params) => {
                        params.api.autoSizeAllColumns();
                      }}
                      sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
                      statusBar={{
                        statusPanels: [
                          { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
                          { statusPanel: 'agSelectedRowCountComponent' },
                        ],
                      }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'diff',
              label: renderTabLabel(<ApartmentOutlined />, 'DNB比对'),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 全文搜索与操作栏（靠右排列） */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                      <Input
                        placeholder="在比对表中全文搜索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={diffSearchText}
                        onChange={(e) => setDiffSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchDiffData(originalData)}
                        loading={diffLoading}
                      >
                        重新比对
                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 比对表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={diffRowData}
                      columnDefs={diffColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={diffSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      animateRows={true}
                      getRowClass={(params) => {
                        if (params.data?.status === 'only_api') return 'row-diff-only-api';
                        return undefined;
                      }}
                      loading={diffLoading}
                      statusBar={{
                        statusPanels: [
                          { statusPanel: 'agFilteredRowCountComponent', align: 'left' },
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
      <DetailDrawer
        record={drawerRecord}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tcvList={drawerRecord ? (gidToTcvMap[String(drawerRecord.id || drawerRecord.GID || '').trim()] || []) : []}
      />

      {/* CMI 联系人弹窗 */}
      <Modal
        title="CMI 联系人"
        open={cmiContactModalOpen}
        onCancel={() => setCmiContactModalOpen(false)}
        footer={null}
        width={900}
      >
        <Table
          dataSource={currentCmiContacts}
          columns={cmiContactColumns}
          rowKey="_id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Modal>

      {/* 需求2：参与方关联客户详情弹窗 */}
      <Modal
        title={`参与方关联客户详情 (参与方 ID: ${selectedParticipantCompId})`}
        open={participantDetailModalVisible}
        onCancel={() => setParticipantDetailModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setParticipantDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={950}
        destroyOnClose
      >
        <Table
          dataSource={participantCustomerList}
          loading={participantDetailLoading}
          rowKey={(record, idx) => record.custId || record._id || String(idx)}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: '客户 ID (custId)',
              dataIndex: 'custId',
              key: 'custId',
              minWidth: 140,
              render: (text) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{text || '-'}</span>
            },
            {
              title: '客户类型名称',
              dataIndex: 'customerTypeName',
              key: 'customerTypeName',
              minWidth: 130,
              render: (text) => text || '-'
            },
            {
              title: '企业名称 (enterpriseName)',
              dataIndex: 'enterpriseName',
              key: 'enterpriseName',
              minWidth: 200,
              render: (text) => <span style={{ fontWeight: 600, color: '#111827' }}>{text || '-'}</span>
            },
            {
              title: '国家',
              dataIndex: 'country',
              key: 'country',
              minWidth: 100,
              render: (text) => text ? <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600 }}>{text}</Tag> : '-'
            },
            {
              title: '城市',
              dataIndex: 'city',
              key: 'city',
              minWidth: 100,
              render: (text) => text ? <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600 }}>{text}</Tag> : '-'
            },
            {
              title: '详细/通讯地址 (commAddr)',
              dataIndex: 'commAddr',
              key: 'commAddr',
              minWidth: 220,
              render: (text) => text || '-'
            }
          ]}
        />
      </Modal>

      {/* 企业客户关联 TCV 项目明细 Modal */}
      <Modal
        title={
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>
            <DollarOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            关联 TCV 项目明细 — 【{selectedEnterpriseInfo?.enterpriseName || selectedEnterpriseInfo?.custId || '-'}】 (共 {selectedEnterpriseTcvList.length} 笔)
          </span>
        }
        open={enterpriseTcvModalVisible}
        onCancel={() => setEnterpriseTcvModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setEnterpriseTcvModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1100}
        destroyOnClose
      >
        <Table
          dataSource={selectedEnterpriseTcvList}
          rowKey={(record, idx) => record._id || String(idx)}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条 TCV 记录` }}
          size="small"
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: '签约客户名称',
              dataIndex: '签约客户名称',
              key: '签约客户名称',
              minWidth: 160,
              render: (text) => <span style={{ fontWeight: 600, color: '#111827' }}>{text || '—'}</span>
            },
            {
              title: '终端客户名称',
              dataIndex: '终端客户名称',
              key: '终端客户名称',
              minWidth: 160,
              render: (text) => <span style={{ fontWeight: 600, color: '#111827' }}>{text || '—'}</span>
            },
            {
              title: '大区',
              dataIndex: '大区',
              key: '大区',
              width: 100,
              render: (text) => text && text !== '—' ? <Tag color="blue">{text}</Tag> : '—'
            },
            {
              title: '销售单元',
              dataIndex: '销售单元',
              key: '销售单元',
              width: 130,
              render: (text) => text || '—'
            },
            {
              title: '电路编号',
              dataIndex: '电路编号',
              key: '电路编号',
              width: 140,
              render: (text) => <span style={{ color: '#1677ff', fontFamily: 'monospace' }}>{text || '—'}</span>
            },
            {
              title: '合同签署日期',
              dataIndex: '合同签署日期',
              key: '合同签署日期',
              width: 120,
              render: (text) => text || '—'
            },
            {
              title: '产品分类',
              dataIndex: '产品分类',
              key: '产品分类',
              width: 120,
              render: (text) => text && text !== '—' ? <Tag color="purple">{text}</Tag> : '—'
            },
            {
              title: '签单金额 (港币)',
              dataIndex: '签单金额 (港币)',
              key: '签单金额 (港币)',
              width: 150,
              align: 'right',
              render: (val) => {
                const num = parseFloat(val || 0);
                return (
                  <span style={{ fontWeight: 700, color: '#389e0d' }}>
                    {num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HKD
                  </span>
                );
              }
            }
          ]}
        />
      </Modal>

      {/* 参与方双击快捷新增基因树节点 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1677ff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ApartmentOutlined />
              新增基因树节点 — 【{targetParticipantRow?.companyName || addNodeFormData?.companyNameCn || '-'}】
            </span>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={submittingAddNode}
              onClick={handleSubmitAddNode}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              提交
            </Button>
          </div>
        }
        open={addNodeModalVisible}
        onCancel={() => setAddNodeModalVisible(false)}
        footer={null}
        width={980}
        destroyOnClose
        maskClosable={false}
      >
        <div style={{ maxHeight: '74vh', overflowY: 'auto', paddingRight: 8, paddingTop: 8 }}>
          {/* Card 1: 基础识别信息 */}
          <Card size="small" title="基础识别信息" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
            <Row gutter={[16, 12]}>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>数据来源 (dataSource)</div>
                <Input value={addNodeFormData.dataSource || 'CMI'} disabled style={{ backgroundColor: '#f5f5f5' }} />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>终极控制人 (ultimateName)</div>
                <Input value={addNodeFormData.ultimateName || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, ultimateName: e.target.value })} />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>终极控制人 GID (ultimateGID)</div>
                <Input value={addNodeFormData.ultimateGID || ''} disabled style={{ backgroundColor: '#f5f5f5' }} />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  自动分配节点 GID <span style={{ color: 'red' }}>*</span>
                </div>
                <Input value={addNodeFormData.GID || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, GID: e.target.value })} style={{ fontWeight: 'bold', color: '#0958d9' }} />
              </Col>

              {/* 需求2：中英文名称支持谷歌自动翻译 */}
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>公司中文名称 (companyNameCn) <span style={{ color: 'red' }}>*</span></span>
                  <Tooltip title="输入中文后点击，自动调用Google API翻译为英文">
                    <Button
                      type="link"
                      size="small"
                      icon={<TranslationOutlined />}
                      loading={translatingEn}
                      onClick={() => handleGoogleTranslate('cn2en')}
                      style={{ padding: 0, height: 'auto', fontSize: 11 }}
                    >
                      译英文
                    </Button>
                  </Tooltip>
                </div>
                <Input
                  value={addNodeFormData.companyNameCn || ''}
                  onChange={(e) => updateAddNodeFormData({ companyNameCn: e.target.value })}
                  style={{ fontWeight: 600 }}
                  placeholder="请输入中文名称..."
                />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>公司英文名称 (companyNameEn)</span>
                  <Tooltip title="输入英文后点击，自动调用Google API翻译为中文">
                    <Button
                      type="link"
                      size="small"
                      icon={<TranslationOutlined />}
                      loading={translatingCn}
                      onClick={() => handleGoogleTranslate('en2cn')}
                      style={{ padding: 0, height: 'auto', fontSize: 11 }}
                    >
                      译中文
                    </Button>
                  </Tooltip>
                </div>
                <Input
                  value={addNodeFormData.companyNameEn || ''}
                  onChange={(e) => updateAddNodeFormData({ companyNameEn: e.target.value, registeredName: e.target.value })}
                  placeholder="请输入英文名称..."
                />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>注册名称 (registeredName)</div>
                <Input value={addNodeFormData.registeredName || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, registeredName: e.target.value })} />
              </Col>
            </Row>
          </Card>

          {/* Card 2: 层级与挂载父节点 */}
          <Card size="small" title="层级与挂载父节点" style={{ marginBottom: 12, backgroundColor: '#f0f5ff', border: '1px solid #adc6ff' }}>
            <Row gutter={[16, 12]}>
              {/* 需求3：挂载父节点下拉框层层过滤 */}
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#1677ff', fontWeight: 600, marginBottom: 4 }}>挂载父节点 (parentCompanyName) <span style={{ color: 'red' }}>*</span></div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.parentGID}
                  onChange={handleParentNodeChangeInForm}
                  placeholder="输入空格分隔关键字层层过滤..."
                  filterOption={(input: string, option: any) => {
                    if (!input || !input.trim()) return true;
                    const keywords = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
                    const targetText = String(option?.searchValue || '').toLowerCase();
                    return keywords.every(kw => targetText.includes(kw));
                  }}
                  options={(originalData || []).map((d: any) => {
                    const val = String(d.GID || d.id);
                    const searchStr = getFormatSearchText(d, val);
                    return {
                      value: val,
                      label: searchStr,
                      node: d,
                      searchValue: searchStr
                    };
                  })}
                  optionRender={(option: any) => {
                    const node = option.data.node;
                    const val = option.data.value;
                    if (!node) return <span style={{ color: '#999' }}>请选择父节点...</span>;
                    const cn = node.companyNameCn || node.name || val;
                    const en = node.companyNameEn;
                    const country = node.registeredCountry || node.position || '';
                    const city = node.registeredCity || node.city || '';
                    const showEn = Boolean(en && en.trim() !== '' && en.trim().toLowerCase() !== cn?.trim().toLowerCase());
                    const hasCity = Boolean(city && city !== '-' && city.trim().toLowerCase() !== country?.trim().toLowerCase());

                    return (
                      <div style={{ padding: '2px 0', lineHeight: 1.35 }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cn} <span style={{ color: '#0958d9', fontSize: '11px', fontWeight: 400 }}>#{val}</span>
                        </div>
                        {showEn ? (
                          <div style={{ fontSize: '11px', color: '#5f6368', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {en}
                          </div>
                        ) : null}
                        <div style={{ marginTop: '2px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {country && (
                            <Tag style={{ backgroundColor: '#e6f4ff', color: '#0958d9', border: '1px solid #91caef', fontWeight: 600, fontSize: '10px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                              {country}
                            </Tag>
                          )}
                          {hasCity && (
                            <Tag style={{ backgroundColor: '#f6ffed', color: '#389e0d', border: '1px solid #b7eb8f', fontWeight: 600, fontSize: '10px', margin: 0, padding: '0 4px', borderRadius: '3px' }}>
                              {city}
                            </Tag>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>父节点 GID (parentGID)</div>
                <Input value={addNodeFormData.parentGID || ''} disabled style={{ backgroundColor: '#fff' }} />
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>计算层级 (treeLevel)</div>
                <Input value={addNodeFormData.treeLevel || ''} disabled style={{ backgroundColor: '#fff', fontWeight: 'bold' }} />
              </Col>

              {/* 需求4：选中父节点之后，在下方显示“父节点的父节点”信息（人工检验） */}
              <Col span={24}>
                <div style={{ backgroundColor: '#f9f0ff', border: '1px dashed #d3ade6', borderRadius: 6, padding: '8px 12px', marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#722ed1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <InfoCircleOutlined />
                    <span>“父节点”的父节点信息 (人工检验参考)</span>
                  </div>
                  {grandparentNodeInfo ? (
                    <Row gutter={[12, 6]} style={{ fontSize: 12, color: '#333' }}>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>企业中文名: </span>
                        <span style={{ fontWeight: 600 }}>{grandparentNodeInfo.companyNameCn}</span>
                      </Col>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>企业英文名: </span>
                        <span>{grandparentNodeInfo.companyNameEn}</span>
                      </Col>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>父父GID: </span>
                        <Tag color="purple" style={{ fontWeight: 600 }}>#{grandparentNodeInfo.GID}</Tag>
                      </Col>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>注册国家: </span>
                        <Tag color="blue">{grandparentNodeInfo.registeredCountry}</Tag>
                      </Col>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>注册城市: </span>
                        <Tag color="green">{grandparentNodeInfo.registeredCity}</Tag>
                      </Col>
                      <Col span={8}>
                        <span style={{ color: '#666' }}>treeLevel: </span>
                        <span style={{ fontWeight: 700, color: '#722ed1' }}>Level {grandparentNodeInfo.treeLevel}</span>
                      </Col>
                    </Row>
                  ) : (
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      当前选中的父节点为【根节点 Root】，无上一级父节点信息。
                    </div>
                  )}
                </div>
              </Col>

              {/* 需求5：entityTypeName 下拉列表 */}
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>实体类型 (entityTypeName)</div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.entityTypeName || undefined}
                  onChange={(val) => setAddNodeFormData({ ...addNodeFormData, entityTypeName: val })}
                  options={familyTreeOptions.entityTypeOptions}
                  placeholder="请选择实体类型..."
                />
              </Col>
              {/* 需求6：企业性质 enterpriseNature 下拉列表 */}
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>企业性质 (enterpriseNature)</div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.enterpriseNature || 'CoreMember'}
                  onChange={(val) => setAddNodeFormData({ ...addNodeFormData, enterpriseNature: val })}
                  options={familyTreeOptions.enterpriseNatureOptions}
                  placeholder="请选择企业性质..."
                />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>经营状态 (operatingStatus)</div>
                <Input value={addNodeFormData.operatingStatus || 'Active'} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, operatingStatus: e.target.value })} />
              </Col>
            </Row>
          </Card>

          {/* Card 3: 注册与地理位置信息 */}
          <Card size="small" title="注册与地理位置信息" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
            <Row gutter={[16, 12]}>
              {/* 需求7：registeredCountry 下拉列表 (带原值参考与红框校验) */}
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>注册国家/地区 (registeredCountry) <span style={{ color: 'red' }}>*</span></div>
                <Select
                  status={formValidationStatus.countryValid ? undefined : 'error'}
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.registeredCountry || undefined}
                  onChange={(val) => {
                    const inferredReg = globalDistinctOptions.countryToRegionMap[val];
                    const reg = inferredReg || getRegion(val);
                    updateAddNodeFormData((prev: any) => ({ ...prev, registeredCountry: val, cmiRegion: reg }));
                  }}
                  options={familyTreeOptions.registeredCountryOptions}
                  placeholder="请选择注册国家..."
                />
                {!formValidationStatus.countryValid && (
                  <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 2, fontWeight: 500 }}>
                    * 不能为空且需匹配下拉选项
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#0958d9', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span>原记录值:</span>
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                    {rawParticipantOriginals.country || '无'}
                  </Tag>
                </div>
              </Col>
              {/* 需求8：cmiRegion 下拉列表 (带原值参考与红框校验) */}
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>CMI 区域 (cmiRegion) <span style={{ color: 'red' }}>*</span></div>
                <Select
                  status={formValidationStatus.regionValid ? undefined : 'error'}
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.cmiRegion || undefined}
                  onChange={(val) => updateAddNodeFormData((prev: any) => ({ ...prev, cmiRegion: val }))}
                  options={familyTreeOptions.cmiRegionOptions}
                  placeholder="请选择 CMI 区域..."
                />
                {!formValidationStatus.regionValid && (
                  <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 2, fontWeight: 500 }}>
                    * 不能为空且需匹配下拉选项
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#0958d9', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span>原记录值:</span>
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                    {rawParticipantOriginals.region || '无'}
                  </Tag>
                </div>
              </Col>
              {/* 需求9：registeredCity 下拉列表 (带原值参考与红框校验，支持手填) */}
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>注册城市 (registeredCity) <span style={{ color: 'red' }}>*</span></div>
                <Select
                  status={formValidationStatus.cityValid ? undefined : 'error'}
                  showSearch
                  allowClear
                  searchValue={citySearchInput}
                  onSearch={(val) => setCitySearchInput(val)}
                  style={{ width: '100%' }}
                  value={addNodeFormData.registeredCity || undefined}
                  onChange={(val) => {
                    updateAddNodeFormData((prev: any) => ({ ...prev, registeredCity: val }));
                    setCitySearchInput('');
                  }}
                  onBlur={() => {
                    if (citySearchInput && citySearchInput.trim()) {
                      const val = citySearchInput.trim();
                      updateAddNodeFormData((prev: any) => ({ ...prev, registeredCity: val }));
                    }
                  }}
                  options={dynamicCityOptions}
                  placeholder="请选择或输入新城市..."
                />
                {!formValidationStatus.cityValid && (
                  <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 2, fontWeight: 500 }}>
                    * 注册城市不能为空
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#0958d9', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span>原记录值:</span>
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '16px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rawParticipantOriginals.city || '无'}
                  </Tag>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>商业登记号 (registrationNumber)</div>
                <Input value={addNodeFormData.registrationNumber || ''} onChange={(e) => updateAddNodeFormData({ registrationNumber: e.target.value })} />
              </Col>

              <Col span={24}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>注册详细地址 (registeredAddress)</div>
                <Input value={addNodeFormData.registeredAddress || ''} onChange={(e) => updateAddNodeFormData({ registeredAddress: e.target.value })} />
              </Col>
            </Row>
          </Card>

          <Card size="small" title="联系方式与高管信息" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
            <Row gutter={[16, 12]}>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>企业邮箱 (email)</div>
                <Input value={addNodeFormData.email || ''} onChange={(e) => updateAddNodeFormData({ email: e.target.value })} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>联系电话 (contactPhone)</div>
                <Input value={addNodeFormData.contactPhone || ''} onChange={(e) => updateAddNodeFormData({ contactPhone: e.target.value })} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>官方网站 (website)</div>
                <Input value={addNodeFormData.website || ''} onChange={(e) => updateAddNodeFormData({ website: e.target.value })} />
              </Col>

              <Col span={12}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>CEO / 首席执行官</div>
                <Input value={addNodeFormData.ceo || ''} onChange={(e) => updateAddNodeFormData({ ceo: e.target.value })} />
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>其他高管信息 (otherExecutives)</div>
                <Input value={addNodeFormData.otherExecutives || ''} onChange={(e) => updateAddNodeFormData({ otherExecutives: e.target.value })} />
              </Col>
            </Row>
          </Card>

          <Card size="small" title="行业与描述" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
            <Row gutter={[16, 12]}>
              {/* 需求3：CMI 行业 (cmiIndustry) 改为 Select 下拉框形式 */}
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>CMI 行业 (cmiIndustry)</div>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={addNodeFormData.cmiIndustry || undefined}
                  onChange={(val) => updateAddNodeFormData({ cmiIndustry: val })}
                  options={familyTreeOptions.cmiIndustryOptions}
                  placeholder="请选择 CMI 行业..."
                />
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>CMCC 行业 (cmccIndustry)</div>
                <Input value={addNodeFormData.cmccIndustry || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, cmccIndustry: e.target.value })} />
              </Col>

              <Col span={24}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>主营业务 (mainBusiness)</div>
                <Input.TextArea rows={2} value={addNodeFormData.mainBusiness || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, mainBusiness: e.target.value })} />
              </Col>

              <Col span={24}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>公司简介 (summary)</div>
                <Input.TextArea rows={2} value={addNodeFormData.summary || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, summary: e.target.value })} />
              </Col>

              <Col span={24}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>企业标签 (tags)</div>
                <Input value={addNodeFormData.tags || ''} onChange={(e) => setAddNodeFormData({ ...addNodeFormData, tags: e.target.value })} placeholder="例如：软件，科技，子公司" />
              </Col>
            </Row>
          </Card>
        </div>
      </Modal>

      {/* 终端客户治理：标注日志 Modal (支持富文本) */}
      <Modal
        title="标注数据治理日志"
        open={annotateModalVisible}
        onOk={handleSubmitAnnotateLog}
        confirmLoading={submittingAnnotate}
        onCancel={() => setAnnotateModalVisible(false)}
        width={560}
        destroyOnClose
        autoFocusButton={null}
        footer={[
          <div key="footer-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              {hasExistingNotes && (
                <Popconfirm
                  title="确定要删除该标注信息吗？"
                  description="删除后标注数据将清空并恢复默认未标注状态。"
                  okText="确定删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleDeleteAnnotateLog}
                >
                  <Button danger icon={<DeleteOutlined />} loading={submittingAnnotate}>
                    删除标注
                  </Button>
                </Popconfirm>
              )}
            </div>
            <Space>
              <Button onClick={() => setAnnotateModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" loading={submittingAnnotate} onClick={handleSubmitAnnotateLog}>
                标注提交
              </Button>
            </Space>
          </div>
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          {currentAnnotateRow?.companyId ? (
            <span style={{ color: '#666', fontSize: '13px' }}>
              参与方标识 (companyId): <strong style={{ color: '#1677ff' }}>{currentAnnotateRow?.companyId}</strong>
            </span>
          ) : (
            <span style={{ color: '#666', fontSize: '13px' }}>
              客户标识 (custId): <strong style={{ color: '#1677ff' }}>{currentAnnotateRow?.custId}</strong>
            </span>
          )}
          {(currentAnnotateRow?.enterpriseName || currentAnnotateRow?.companyName) && (
            <span style={{ marginLeft: 16, color: '#666', fontSize: '13px' }}>
              企业名称: <strong>{currentAnnotateRow?.enterpriseName || currentAnnotateRow?.companyName}</strong>
            </span>
          )}
        </div>
        <RichTextEditor
          autoFocus={annotateModalVisible}
          value={notesContent}
          onChange={(val) => setNotesContent(val)}
        />
      </Modal>
    </div>
  );
};

export default KeyGlobalFamilyTree;
