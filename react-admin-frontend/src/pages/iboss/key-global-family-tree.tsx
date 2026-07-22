import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useLocation, request, history } from '@umijs/max';
import { Checkbox, Spin, message, Button, Input, Space, Tag, Tabs, Drawer, Descriptions, Tooltip, Modal, Table, Row, Col, Card, Progress, Select } from 'antd';
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
  DashboardOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  ProfileOutlined,
  GlobalOutlined,
  CameraOutlined,
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
    id: rootId, parentId: '', name: rootNode.name,
    position: rootNode.position, city: rootNode.city,
    iconHtml: rootNode.iconHtml, _nodeType: 'root',
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
            id: company.id, parentId: cityId, name: company.name,
            position: company.registeredAddress || company.position || '',
            city: '', iconHtml: '', _nodeType: 'company',
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
  if (nodeType === 'root') {
    return `
      <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
        <div style="font-family:'Inter',sans-serif;background-color:#fff1f0;margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;position:relative;">
          <div style="display:flex;justify-content:flex-end;margin-top:5px;margin-right:8px;font-size:11px;color:#888;">#${d.data.id}</div>
          <div style="background-color:#fff1f0;margin-top:${-imageDiffVert - 10}px;margin-left:15px;border-radius:100px;width:50px;height:50px;"></div>
          <div style="margin-top:${-imageDiffVert - 20}px;">   ${d.data.iconHtml}</div>
          <div style="font-size:14px;font-weight:600;color:#a8071a;margin-left:20px;margin-right:20px;margin-top:5px;line-height:1.3;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:38px;" title="${d.data.name}">
            ${d.data.name}
          </div>
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

  // 营业网点 Site 节点的背景采用浅灰色渲染
  const color = d.data.entityTypeName === 'Site' ? '#f0f0f0' : '#FFFFFF';
  const showIcon = !nodeType;

  return `
    <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
      <div style="font-family:'Inter',sans-serif;background-color:${color};margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border:${borderStyle};cursor:pointer;position:relative;">
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
        ${d.data.cmiContacts && d.data.cmiContacts.length > 0 ? `<div onclick="window.handleShowCmiContact(event, '${d.data.id}')" style="position:absolute; bottom:6px; right:8px; background-color:#e6f4ff; color:#1677ff; border:1px solid #91caff; font-size:11px; padding:2px 6px; border-radius:4px; cursor:pointer; z-index:10;">cmi contact</div>` : ''}
        ${cmiIndicator}
        ${custIndicator}
      </div>
    </div>`;
};

// ============ 详情 Drawer 组件 ============
const DetailDrawer: React.FC<{ record: any; open: boolean; onClose: () => void }> = ({ record, open, onClose }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

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
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
        </div>
      }
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
    >
      {/* CMI 联系人信息段落，显示在最上方，浅蓝色背景区域 */}
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
  const tcvRecords = dashboardData?.tcvRecords || [];

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

  // 计算这 5 个国家在 2024、2025、2026 三年的年度签单数据 (金额与笔数)
  const yearlyChartData = useMemo(() => {
    const years = ['2024', '2025', '2026'];
    return years.map(yr => {
      const countryData: Record<string, { amount: number; count: number }> = {};
      topCountries.forEach(cName => {
        const recs = tcvRecords.filter((r: any) => {
          const uName = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
          const signDate = String(r['合同签署日期'] || r['设置起租日期'] || '');
          return uName === cName && signDate.startsWith(yr);
        });
        const amount = recs.reduce((sum: number, r: any) => sum + parseFloat(r['签单金额(港币)'] || 0), 0);
        countryData[cName] = { amount, count: recs.length };
      });
      return { year: yr, data: countryData };
    });
  }, [tcvRecords, topCountries]);

  // 获取各国家各年份单柱最高金额，以确定 Y 轴的最大值刻度
  const yearlyMaxVal = useMemo(() => {
    let max = 1;
    yearlyChartData.forEach(yrData => {
      Object.values(yrData.data).forEach((val: any) => {
        if (val.amount > max) max = val.amount;
      });
    });
    return max;
  }, [yearlyChartData]);

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
    let list = tcvRecords;
    if (selectedTcvRegion !== 'All') {
      list = list.filter((r: any) => (r['大区中文名称'] || r['大区'] || '其他大区') === selectedTcvRegion);
    }
    if (selectedTcvUnit) {
      list = list.filter((r: any) => {
        const unitName = r['销售单元中文名称'] || r['销售单元编码'] || '其他单元';
        return unitName === selectedTcvUnit;
      });
    }
    return list;
  }, [tcvRecords, selectedTcvRegion, selectedTcvUnit]);

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
        <Row gutter={16}>
          {/* 第一列：销售单元 (国家公司) 签单排行 (4/10比例 -> span={10}) */}
          <Col span={10}>
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: '#666' }}>
                  📊 销售单元{selectedTcvYears.length > 0 ? [...selectedTcvYears].sort().join(',') : '无'}年签单金额及数量趋势
                </span>
              </div>

              {sortedTcvStats.length > 0 ? (
                <div>
                  {/* 国家/单元色彩映射图例 (点击可快速联动筛选该国家) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginBottom: 12 }}>
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
                            padding: '2px 8px',
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

                  {/* SVG 手工多柱图面板 */}
                  <div style={{ width: '100%', height: '300px', position: 'relative' }}>
                    <svg viewBox="0 0 400 280" width="100%" height="100%" style={{ display: 'block' }}>
                      <defs>
                        {topCountries.map((cName, idx) => {
                          const COUNTRY_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96'];
                          const col = COUNTRY_COLORS[idx % COUNTRY_COLORS.length];
                          return (
                            <linearGradient key={cName} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={col} />
                              <stop offset="100%" stopColor={col + '99'} />
                            </linearGradient>
                          );
                        })}
                      </defs>

                      {/* 背景虚线网格与 Y 轴刻度 (以百万 HKD 为单位) */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const y = 20 + (200 * (1 - ratio));
                        const val = (yearlyMaxVal / 1000000) * ratio;
                        return (
                          <g key={idx}>
                            <line x1="40" y1={y} x2="390" y2={y} stroke="#f0f0f0" strokeDasharray="3,3" />
                            <text x="35" y={y + 3.5} textAnchor="end" fontSize="8" fill="#aaa">{val.toFixed(2)}M</text>
                          </g>
                        );
                      })}

                      {/* 按多选年份分组渲染多立柱 */}
                      {yearlyChartData.map((yrData, yIdx) => {
                        const xStart = 50;
                        const xEnd = 380;
                        const interval = yearlyChartData.length > 0 ? (xEnd - xStart) / yearlyChartData.length : 330;
                        const groupCenterX = xStart + interval * yIdx + interval / 2;
                        const barWidth = 8;
                        const barGap = 1.5;
                        const groupWidth = topCountries.length * (barWidth + barGap) - barGap;

                        return (
                          <g key={yrData.year}>
                            {/* 年份大类别标题 */}
                            <text x={groupCenterX} y="245" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#666">
                              {yrData.year}年
                            </text>

                            {topCountries.map((cName, cIdx) => {
                              const val = yrData.data[cName] || { amount: 0, count: 0 };
                              const barX = groupCenterX - groupWidth / 2 + cIdx * (barWidth + barGap);
                              const barH = val.amount > 0 ? (val.amount / yearlyMaxVal) * 200 : 0;
                              const barY = 220 - barH;

                              const isSelected = selectedTcvUnit === cName;
                              const isAnySelected = selectedTcvUnit !== null;

                              return (
                                <g key={cName}>
                                  <Tooltip title={`${yrData.year}年 [${cName}]: ${val.count} 笔 / ${(val.amount / 1000000).toFixed(2)} M HKD`}>
                                    <rect
                                      x={barX}
                                      y={barY}
                                      width={barWidth}
                                      height={barH}
                                      fill={`url(#grad-${cIdx})`}
                                      rx="1"
                                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                      opacity={isAnySelected ? (isSelected ? 1 : 0.25) : 1}
                                      onClick={() => setSelectedTcvUnit(isSelected ? null : cName)}
                                    />
                                  </Tooltip>
                                  {/* 柱体上方绘制该国当年的签单笔数 */}
                                  {val.count > 0 && (
                                    <text
                                      x={barX + barWidth / 2}
                                      y={Math.max(barY - 2.5, 9)}
                                      textAnchor="middle"
                                      fontSize="7.5"
                                      fill="#333"
                                      fontWeight="bold"
                                      opacity={isAnySelected ? (isSelected ? 1 : 0.25) : 1}
                                    >
                                      {val.count}
                                    </text>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}

                      {/* X 轴横基线 */}
                      <line x1="40" y1="220" x2="390" y2="220" stroke="#ccc" strokeWidth="1" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', marginTop: 4 }}>
                    💡 提示：点击上方的国家图例或直接点击图表中的立柱，可秒级联动过滤右侧大类与小类数据
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#999', fontStyle: 'italic' }}>
                  当前筛选条件下暂无历史签单趋势数据
                </div>
              )}
            </div>
          </Col>

          {/* 第二列：CMI 产品大类分解 (3/10比例 -> span={7}) */}
          <Col span={7}>
            <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
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

          {/* 第三列：子分类小类分解排行 (3/10比例 -> span={7}) */}
          <Col span={7}>
            <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '6px', padding: '12px', height: '100%', minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold', marginBottom: 12, borderBottom: '1px solid #e8e8e8', paddingBottom: 6 }}>
                📝 【{selectedLargeProductCat}】小类排行
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '300px', overflowY: 'auto', flex: 1 }}>
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
                          flexDirection: 'column',
                          borderBottom: '1px dashed #f0f0f0',
                          paddingBottom: 4
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e6f7ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ color: '#555', fontWeight: 500 }}>{subCat}</span>
                        <span style={{ fontWeight: 600, color: '#1890ff', textAlign: 'right', marginTop: 2 }}>
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
  const [penetratedGids, setPenetratedGids] = useState<string[]>([]);
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
          const gTreeRes = await request('/api/v1/wildcards/keyGlobalFamilyTree', {
            method: 'GET',
            params: {
              query: JSON.stringify({ GID: { $in: gids } }),
              options: JSON.stringify({ limit: 10000 })
            }
          });
          const gTreeRecords = gTreeRes.results || gTreeRes.data?.results || [];
          gTreeRecords.forEach((r: any) => gTreeInfoMap.set(String(r.GID), r));
        } catch (e) {
          console.error('Failed to fetch keyGlobalFamilyTree details', e);
        }
      }

      const custToCompanyIdMap = new Map();
      if (extIds.length > 0) {
        try {
          const partMapRes = await request('/api/v1/wildcards/excelParticipantCustMapping', {
            method: 'GET',
            params: {
              query: JSON.stringify({ extCustId: { $in: extIds } }),
              options: JSON.stringify({ limit: 10000 })
            }
          });
          const partMapRecords = partMapRes.results || partMapRes.data?.results || [];
          partMapRecords.forEach((r: any) => custToCompanyIdMap.set(String(r.extCustId), r));
        } catch (e) {
          console.error('Failed to fetch excelParticipantCustMapping', e);
        }
      }

      const customerMap = new Map();
      if (extIds.length > 0) {
        try {
          const custRes = await request('/api/v1/wildcards/ibosscustomers', {
            method: 'GET',
            params: {
              query: JSON.stringify({ custId: { $in: extIds } }),
              options: JSON.stringify({ limit: 10000 })
            }
          });
          const custRecords = custRes.results || custRes.data?.results || [];
          custRecords.forEach((r: any) => customerMap.set(String(r.custId), r));
        } catch (e) {
          console.error('Failed to fetch ibosscustomers', e);
        }
      }

      const companyIds = Array.from(new Set(Array.from(custToCompanyIdMap.values()).map((r: any) => r.companyId).filter(Boolean)));
      const participantMap = new Map();
      if (companyIds.length > 0) {
        try {
          const partRes = await request('/api/v1/wildcards/ibossParticipantDetail', {
            method: 'GET',
            params: {
              query: JSON.stringify({ companyId: { $in: companyIds.map(String) } }),
              options: JSON.stringify({ limit: 10000 })
            }
          });
          const partRecords = partRes.results || partRes.data?.results || [];
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
          ibossEnterpriseName: custMatch.enterpriseName || '',
          ibossCountry: custMatch.country || '',
          ibossCity: custMatch.city || '',
          companyId,
          companyNum,
          enterpriseId: custMatch.enterpriseId || '',
          ebsCustCode: custMatch.ebsCustCode || custMatch.ebsCustomerCode || '',
          mappingPath: r.mappingPath || ''
        };
      });

      setMappingRowData(assembledList);
    } catch (err) {
      console.error('获取映射数据失败', err);
      message.error('获取映射数据失败');
    } finally {
      setMappingLoading(false);
    }
  }, [gid]);

  const mappingColDefs = useMemo(() => [
    {
      headerName: 'GID',
      field: 'GID',
      width: 180,
      filter: true,
      sortable: true
    },
    {
      headerName: '参与方 ID',
      field: 'companyId',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: '企业编号',
      field: 'companyNum',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: 'iBOSS企业 ID',
      field: 'enterpriseId',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: 'EBS客户编码',
      field: 'ebsCustCode',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: '映射路径',
      field: 'mappingPath',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: '客户树中文名',
      field: 'companyNameCn',
      width: 200,
      filter: true,
      sortable: true
    },
    {
      headerName: '客户树英文名',
      field: 'companyNameEn',
      width: 200,
      filter: true,
      sortable: true
    },
    {
      headerName: '客户树国家',
      field: 'registeredCountry',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: '客户树城市',
      field: 'registeredCity',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: '参与方企业名',
      field: 'detailCompanyName',
      width: 200,
      filter: true,
      sortable: true
    },
    {
      headerName: '参与方国家',
      field: 'detailCountry',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: 'iBOSS企业名',
      field: 'ibossEnterpriseName',
      width: 200,
      filter: true,
      sortable: true
    },
    {
      headerName: 'iBOSS客户国家',
      field: 'ibossCountry',
      width: 150,
      filter: true,
      sortable: true
    },
    {
      headerName: 'iBOSS客户城市',
      field: 'ibossCity',
      width: 150,
      filter: true,
      sortable: true
    }
  ], []);

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
    } catch (err) {
      console.error('获取海外家族树 Dashboard 统计数据失败:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    fetchData();
    fetchMappingData();
    fetchDashboardData();
  }, [fetchData, fetchMappingData, fetchDashboardData]);

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
      // 将展开状态合并到新数据中：
      // - 已存在的节点：保留旧展开状态
      // - 新出现的区域/国家/城市分组节点：自动展开，确保其下的网点可见
      // - 新出现的公司/网点节点：保持默认折叠
      const mergedData = chartData.map((d: any) => {
        if (expandedSet.has(String(d.id))) {
          return { ...d, _expanded: true };
        }
        // 新增的分组节点（region/country/city）自动展开，保证层级结构完整可见
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
  // 作用：Tab 切换回"家族树"时不重新调用 renderChart，保持展开/折叠和视口不变
  const isChartInitialized = useRef(false);
  // 记录上一次的 isRegionView 值，用于判断视图模式是否发生了真正切换
  const prevIsRegionView = useRef(isRegionView);

  // 树图初始化渲染（仅在数据首次到达或视图模式切换时执行完整重建）
  useEffect(() => {
    if (originalData.length === 0 || activeTab !== 'tree') return;
    const regionViewChanged = prevIsRegionView.current !== isRegionView;
    prevIsRegionView.current = isRegionView;

    // 已初始化且视图模式未变 → Tab 切换回来，跳过重建，保持树的状态
    if (isChartInitialized.current && !regionViewChanged) return;

    const filtered = filterTreeData(originalData, showSites);
    const chartData = isRegionView ? buildRegionData(filtered) : filtered;
    const timer = setTimeout(() => {
      renderChart(chartData);
      isChartInitialized.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, [originalData, isRegionView, renderChart, activeTab, filterTreeData]);

  // 仅在 showSites 变化时动态更新树数据，不 fit 不折叠，保持视口和展开状态
  const isFirstSiteEffect = useRef(true);
  useEffect(() => {
    // 首次渲染时跳过（由上方 useEffect 负责），仅响应后续 showSites 切换
    if (isFirstSiteEffect.current) {
      isFirstSiteEffect.current = false;
      return;
    }
    if (originalData.length === 0 || activeTab !== 'tree' || !chartRef.current) return;
    const filtered = filterTreeData(originalData, showSites);
    const chartData = isRegionView ? buildRegionData(filtered) : filtered;
    updateChartData(chartData);
  }, [showSites]);

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
    message.success(`已导出 ${cleanExport.length} 条数据`);
  }, [originalData, gid, abbr]);

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
        .row-diff-only-api {
          background-color: #fff7e6 !important;
        }
        .row-diff-only-api:hover {
          background-color: #ffd8bf !important;
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
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          tabBarStyle={{ marginBottom: 12 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          items={[
            {
              key: 'dashboard',
              label: (
                <span><DashboardOutlined style={{ marginRight: 6 }} />Dashboard</span>
              ),
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
              label: (
                <span><PartitionOutlined style={{ marginRight: 6 }} />家族树</span>
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
                    <Checkbox
                      checked={showSites}
                      onChange={(e) => setShowSites(e.target.checked)}
                      style={{ marginRight: 8, fontSize: '13px' }}
                    >
                      显示网点
                    </Checkbox>
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
                <span><TableOutlined style={{ marginRight: 6 }} />数据表</span>
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
            {
              key: 'diff',
              label: (
                <span><ApartmentOutlined style={{ marginRight: 6 }} />比对</span>
              ),
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
            {
              key: 'mapping',
              label: (
                <span><TableOutlined style={{ marginRight: 6 }} />映射iBOSS客户</span>
              ),
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
                        重新加载映射
                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 映射表格 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={mappingRowData}
                      columnDefs={mappingColDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={mappingSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      animateRows={true}
                      loading={mappingLoading}
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
      <DetailDrawer record={drawerRecord} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
    </div>
  );
};

export default KeyGlobalFamilyTree;
