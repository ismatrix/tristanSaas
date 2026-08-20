import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import { Card, Button, Radio, Space, Tooltip, Empty, Tag, Segmented } from 'antd';
import {
  GlobalOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import worldGeoJson from '../../../assets/maps/world.json';
import { getCityCoordinates, GLOBAL_COUNTRY_COORDINATES } from './cityCoordinates';

// 注册 ECharts 世界地图 GeoJSON
if (!echarts.getMap('world')) {
  echarts.registerMap('world', worldGeoJson as any);
}

// 模块加载时预先计算所有国家的视口边界（仅执行一次，避免运行时遍历几十万坐标点）
const PRECOMPUTED_COUNTRY_VIEWS = new Map<string, { center: [number, number]; zoom: number }>();
(() => {
  const features = (worldGeoJson as any).features || [];
  features.forEach((feat: any) => {
    const rawName = feat.properties?.name || '';
    if (!rawName) return;
    const norm = rawName.toLowerCase();

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const processCoords = (coords: any) => {
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        const [lng, lat] = coords;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      } else if (Array.isArray(coords)) {
        coords.forEach(processCoords);
      }
    };

    processCoords(feat.geometry.coordinates);

    // 美国排除偏远离岛跨度
    if (feat.properties?.name === 'United States of America' || norm.includes('united states') || norm.includes('usa')) {
      minLng = -125;
      maxLng = -66;
      minLat = 24;
      maxLat = 49;
    }

    if (minLng !== Infinity && maxLng !== -Infinity) {
      const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      const spanLng = Math.max(1, maxLng - minLng);
      const spanLat = Math.max(1, maxLat - minLat);
      const zoom = Math.min(6.5, Math.max(2.6, Math.min(360 / spanLng, 180 / spanLat) * 0.58));
      PRECOMPUTED_COUNTRY_VIEWS.set(norm, { center, zoom: Number(zoom.toFixed(2)) });
    }
  });
})();

/**
 * 快速 $O(1)$ 获取国家自适应视口
 */
function getCountryOptimalView(countryName: string): { center: [number, number]; zoom: number } {
  const norm = countryName.trim().toLowerCase();
  if (PRECOMPUTED_COUNTRY_VIEWS.has(norm)) {
    return PRECOMPUTED_COUNTRY_VIEWS.get(norm)!;
  }

  for (const [key, view] of PRECOMPUTED_COUNTRY_VIEWS.entries()) {
    if (key.includes(norm) || norm.includes(key)) {
      return view;
    }
  }

  const fallbackCoords = GLOBAL_COUNTRY_COORDINATES[norm] || [10, 20];
  return { center: fallbackCoords, zoom: 4.8 };
}

interface OverseasBranchWorldMapProps {
  branchNodes: any[];
  siteNodes: any[];
  onSelectCountry?: (country: string, type?: 'branch' | 'site') => void;
}

interface CityCluster {
  name: string;
  country: string;
  city: string;
  coords: [number, number];
  branchCount: number;
  siteCount: number;
  totalCount: number;
  companies: string[];
}

interface CountryCluster {
  name: string;
  country: string;
  coords: [number, number];
  branchCount: number;
  siteCount: number;
  totalCount: number;
  cityCount: number;
  cities: string[];
  companies: string[];
}

// 大区默认视角参数（默认全球为 2 级缩放）
const REGION_VIEW_PARAMS: Record<string, { center: [number, number]; zoom: number }> = {
  world: { center: [10, 20], zoom: 2.0 },
  europe: { center: [15, 52], zoom: 3.6 },
  apac: { center: [115, 12], zoom: 2.8 },
  americas: { center: [-85, 15], zoom: 2.2 },
  mena: { center: [35, 15], zoom: 2.8 },
};

// 自动切换城市视图的缩放分界阈值（>= 3.0 视为放大 3 级及以上）
const ZOOM_LEVEL_THRESHOLD = 3.0;

export const OverseasBranchWorldMapComponent: React.FC<OverseasBranchWorldMapProps> = ({
  branchNodes = [],
  siteNodes = [],
  onSelectCountry,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // 记录是否已完成初始 2 级缩放设置
  const isMapInitializedRef = useRef<boolean>(false);

  // 保存点击国家前的上一个视图状态，用于再次点击时返回
  const prevViewStateRef = useRef<{ center: [number, number]; zoom: number; viewLevel: 'country' | 'city' } | null>(null);

  // 显示维度：'country'（国家层级）| 'city'（城市层级）
  const [viewLevel, setViewLevel] = useState<'country' | 'city'>('country');
  const viewLevelRef = useRef<'country' | 'city'>('country');
  viewLevelRef.current = viewLevel;

  // 当前聚焦下钻的国家（null 表示未单独选中某国家）
  const [selectedDrillCountry, setSelectedDrillCountry] = useState<string | null>(null);
  const selectedDrillCountryRef = useRef<string | null>(null);
  selectedDrillCountryRef.current = selectedDrillCountry;

  // 筛选类型：全部 / 仅分支 / 仅网点
  const [displayFilter, setDisplayFilter] = useState<'all' | 'branch' | 'site'>('all');
  // 当前聚焦的大区视图
  const [currentRegion, setCurrentRegion] = useState<string>('world');
  // 当前地图缩放级别（默认 2 级）
  const [currentZoom, setCurrentZoom] = useState<number>(2.0);
  const currentZoomRef = useRef<number>(2.0);
  currentZoomRef.current = currentZoom;

  // 1. 聚合并计算各城市的分布数据
  const cityClusters = useMemo<CityCluster[]>(() => {
    const clusterMap = new Map<string, CityCluster>();

    const processNode = (node: any, isSite: boolean) => {
      const country = node.registeredCountry || node.position || 'Unknown';
      const city = node.registeredCity || node.city || country;
      const key = `${country.trim().toLowerCase()}__${city.trim().toLowerCase()}`;

      let cluster = clusterMap.get(key);
      if (!cluster) {
        const coords = getCityCoordinates(country, city, node.latitude, node.longitude);
        if (!coords) return;

        cluster = {
          name: city === country ? city : `${city}, ${country}`,
          country,
          city,
          coords,
          branchCount: 0,
          siteCount: 0,
          totalCount: 0,
          companies: [],
        };
        clusterMap.set(key, cluster);
      }

      if (isSite) {
        cluster.siteCount += 1;
      } else {
        cluster.branchCount += 1;
      }
      cluster.totalCount = cluster.branchCount + cluster.siteCount;

      const compName = node.companyNameCn || node.companyNameEn || node.name || '';
      if (compName && !cluster.companies.includes(compName)) {
        cluster.companies.push(compName);
      }
    };

    if (displayFilter === 'all' || displayFilter === 'branch') {
      branchNodes.forEach((node) => processNode(node, false));
    }
    if (displayFilter === 'all' || displayFilter === 'site') {
      siteNodes.forEach((node) => processNode(node, true));
    }

    return Array.from(clusterMap.values()).filter((c) => {
      if (displayFilter === 'branch') return c.branchCount > 0;
      if (displayFilter === 'site') return c.siteCount > 0;
      return c.totalCount > 0;
    });
  }, [branchNodes, siteNodes, displayFilter]);

  // 2. 聚合并计算国家维度的分布数据
  const countryClusters = useMemo<CountryCluster[]>(() => {
    const countryMap = new Map<string, CountryCluster>();

    const processNode = (node: any, isSite: boolean) => {
      const country = node.registeredCountry || node.position || 'Unknown';
      const city = node.registeredCity || node.city || '';
      const cKey = country.trim().toLowerCase();

      let cluster = countryMap.get(cKey);
      if (!cluster) {
        let coords = GLOBAL_COUNTRY_COORDINATES[cKey];
        if (!coords) {
          const cityCoord = getCityCoordinates(country, city, node.latitude, node.longitude);
          if (cityCoord) coords = cityCoord;
        }
        if (!coords) coords = [0, 20];

        cluster = {
          name: country,
          country,
          coords,
          branchCount: 0,
          siteCount: 0,
          totalCount: 0,
          cityCount: 0,
          cities: [],
          companies: [],
        };
        countryMap.set(cKey, cluster);
      }

      if (isSite) {
        cluster.siteCount += 1;
      } else {
        cluster.branchCount += 1;
      }
      cluster.totalCount = cluster.branchCount + cluster.siteCount;

      if (city && !cluster.cities.includes(city)) {
        cluster.cities.push(city);
        cluster.cityCount = cluster.cities.length;
      }

      const compName = node.companyNameCn || node.companyNameEn || node.name || '';
      if (compName && !cluster.companies.includes(compName)) {
        cluster.companies.push(compName);
      }
    };

    if (displayFilter === 'all' || displayFilter === 'branch') {
      branchNodes.forEach((node) => processNode(node, false));
    }
    if (displayFilter === 'all' || displayFilter === 'site') {
      siteNodes.forEach((node) => processNode(node, true));
    }

    return Array.from(countryMap.values()).filter((c) => {
      if (displayFilter === 'branch') return c.branchCount > 0;
      if (displayFilter === 'site') return c.siteCount > 0;
      return c.totalCount > 0;
    });
  }, [branchNodes, siteNodes, displayFilter]);

  // 统计有海外分支覆盖的国家列表
  const coveredCountries = useMemo(() => {
    return countryClusters.map((c) => c.country);
  }, [countryClusters]);

  // 过滤后的城市列表（如果当前已下钻某国，则优先展示该国各城市）
  const activeCityClusters = useMemo(() => {
    if (selectedDrillCountry) {
      return cityClusters.filter(
        (c) => c.country.trim().toLowerCase() === selectedDrillCountry.trim().toLowerCase(),
      );
    }
    return cityClusters;
  }, [cityClusters, selectedDrillCountry]);

  // 点击国家区域/点位：聚焦放大至该国，再次点击则取消选中并返回上一视图
  const handleToggleCountryDrill = useCallback(
    (countryName: string) => {
      if (!chartInstanceRef.current) return;
      const chart = chartInstanceRef.current;
      const currentDrill = selectedDrillCountryRef.current;

      // 1. 如果当前已经选中该国家，再次点击则取消选择并精准恢复上一视角
      const isSameCountry =
        currentDrill &&
        (currentDrill.trim().toLowerCase() === countryName.trim().toLowerCase() ||
          countryName.trim().toLowerCase().includes(currentDrill.trim().toLowerCase()) ||
          currentDrill.trim().toLowerCase().includes(countryName.trim().toLowerCase()));

      if (isSameCountry) {
        setSelectedDrillCountry(null);
        selectedDrillCountryRef.current = null;

        if (prevViewStateRef.current) {
          chart.setOption({
            geo: {
              center: prevViewStateRef.current.center,
              zoom: prevViewStateRef.current.zoom,
            },
          });
          setCurrentZoom(prevViewStateRef.current.zoom);
          setViewLevel(prevViewStateRef.current.viewLevel);
          prevViewStateRef.current = null;
        } else {
          const view = REGION_VIEW_PARAMS.world;
          chart.setOption({
            geo: {
              center: view.center,
              zoom: view.zoom,
            },
          });
          setCurrentZoom(view.zoom);
          setViewLevel('country');
        }
        return;
      }

      // 2. 首次点击该国家：记录当前视口
      const opt: any = chart.getOption();
      const curGeo = opt && opt.geo && opt.geo[0];
      prevViewStateRef.current = {
        center: curGeo && curGeo.center ? [...curGeo.center] : [10, 20],
        zoom: curGeo && curGeo.zoom ? curGeo.zoom : currentZoomRef.current,
        viewLevel: viewLevelRef.current,
      };

      // 计算该国家的最佳自适应视口
      const targetView = getCountryOptimalView(countryName);
      setSelectedDrillCountry(countryName);
      selectedDrillCountryRef.current = countryName;
      setViewLevel('city');

      chart.setOption({
        geo: {
          center: targetView.center,
          zoom: targetView.zoom,
        },
      });
      setCurrentZoom(targetView.zoom);
    },
    [],
  );

  // 重置全球视角
  const handleResetToWorld = useCallback(() => {
    setSelectedDrillCountry(null);
    selectedDrillCountryRef.current = null;
    prevViewStateRef.current = null;
    setViewLevel('country');
    setCurrentRegion('world');
    if (chartInstanceRef.current) {
      const view = REGION_VIEW_PARAMS.world;
      chartInstanceRef.current.setOption({
        geo: {
          center: view.center,
          zoom: view.zoom,
        },
      });
      setCurrentZoom(view.zoom);
    }
  }, []);

  // 3. 初始化与更新 ECharts 实例（严格做实例回收以防内存泄露）
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
      });
    }

    const chart = chartInstanceRef.current;

    // 地图平移与缩放事件（georoam）监听
    chart.off('georoam');
    chart.on('georoam', () => {
      if (!chartInstanceRef.current) return;
      const opt: any = chartInstanceRef.current.getOption();
      if (opt && opt.geo && opt.geo[0]) {
        const newZoom = opt.geo[0].zoom;
        setCurrentZoom(newZoom);

        if (newZoom >= ZOOM_LEVEL_THRESHOLD) {
          setViewLevel('city');
        } else {
          setViewLevel('country');
          setSelectedDrillCountry((prev) => (prev ? null : prev));
        }
      }
    });

    // 点击事件绑定
    chart.off('click');
    chart.on('click', (params: any) => {
      if (params.seriesType === 'scatter') {
        const data = params.data;
        if (!data) return;

        if (data.isCountryLevel) {
          handleToggleCountryDrill(data.country);
        } else {
          if (data.country && onSelectCountry) {
            onSelectCountry(data.country, displayFilter === 'site' ? 'site' : 'branch');
          }
        }
      } else if (params.componentType === 'geo') {
        const countryName = params.name;
        if (countryName) {
          const matched = countryClusters.find(
            (c) =>
              c.country.trim().toLowerCase() === countryName.trim().toLowerCase() ||
              countryName.trim().toLowerCase().includes(c.country.trim().toLowerCase()) ||
              c.country.trim().toLowerCase().includes(countryName.trim().toLowerCase()),
          );
          if (matched) {
            handleToggleCountryDrill(matched.country);
          }
        }
      }
    });

    // 格式化当前展示的散点数据
    let scatterData: any[] = [];

    if (viewLevel === 'country') {
      scatterData = countryClusters.map((cluster) => {
        const displayVal = displayFilter === 'site'
          ? cluster.siteCount
          : displayFilter === 'branch'
            ? cluster.branchCount
            : cluster.totalCount;

        return {
          name: cluster.name,
          value: [...cluster.coords, displayVal],
          country: cluster.country,
          cityCount: cluster.cityCount,
          cities: cluster.cities,
          branchCount: cluster.branchCount,
          siteCount: cluster.siteCount,
          totalCount: cluster.totalCount,
          companies: cluster.companies,
          isCountryLevel: true,
        };
      });
    } else {
      scatterData = activeCityClusters.map((cluster) => {
        const displayVal = displayFilter === 'site'
          ? cluster.siteCount
          : displayFilter === 'branch'
            ? cluster.branchCount
            : cluster.totalCount;

        return {
          name: cluster.name,
          value: [...cluster.coords, displayVal],
          country: cluster.country,
          city: cluster.city,
          branchCount: cluster.branchCount,
          siteCount: cluster.siteCount,
          totalCount: cluster.totalCount,
          companies: cluster.companies,
          isCountryLevel: false,
        };
      });
    }

    // 高亮有海外分支的国家板块
    const countryRegions = coveredCountries.map((cName) => {
      const isSelected = selectedDrillCountry && cName.trim().toLowerCase() === selectedDrillCountry.trim().toLowerCase();
      return {
        name: cName,
        itemStyle: {
          areaColor: isSelected ? '#bae6fd' : '#e0f2fe',
          borderColor: isSelected ? '#0284c7' : '#93c5fd',
          borderWidth: isSelected ? 1.8 : 1,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#93c5fd',
            borderColor: '#0284c7',
            borderWidth: 2,
          },
        },
      };
    });

    const isCountryMode = viewLevel === 'country';

    const geoOption: any = {
      map: 'world',
      roam: true,
      aspectScale: 0.75,
      scaleLimit: {
        min: 1,
        max: 15,
      },
      label: {
        show: false,
        color: '#475569',
        fontSize: 10,
      },
      itemStyle: {
        areaColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        borderWidth: 0.8,
      },
      emphasis: {
        itemStyle: {
          areaColor: '#bae6fd',
          borderColor: '#0284c7',
          borderWidth: 1.5,
        },
        label: {
          show: true,
          color: '#0f172a',
          fontSize: 11,
          fontWeight: 'bold',
        },
      },
      regions: countryRegions,
    };

    // 首次初始化时设置默认 2 级缩放与中心坐标
    if (!isMapInitializedRef.current) {
      geoOption.center = [10, 20];
      geoOption.zoom = 2.0;
      isMapInitializedRef.current = true;
    }

    const option: echarts.EChartsOption = {
      backgroundColor: '#f8fafc',
      animation: false, // 禁用全局多余过渡动画，大幅提升页面滚动和渲染帧率
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: '#1e293b',
          fontSize: 12,
        },
        extraCssText: 'box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12); border-radius: 8px; max-width: 320px;',
        formatter: (params: any) => {
          if (params.seriesType === 'scatter') {
            const d = params.data;
            if (!d) return '';

            if (d.isCountryLevel) {
              const cityListStr = (d.cities || []).slice(0, 5).join('、');
              const companyListHtml = (d.companies || [])
                .slice(0, 3)
                .map(
                  (comp: string) =>
                    `<div style="color: #64748b; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">• ${comp}</div>`,
                )
                .join('');

              return `
                <div style="font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <span>🌍 ${d.country}</span>
                  <span style="font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 1px 6px; border-radius: 4px;">国家视图</span>
                </div>
                <div style="display: flex; gap: 14px; margin-bottom: 6px; padding: 6px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                  <div>🏢 分支机构: <b style="color: #0284c7; font-size: 13px;">${d.branchCount}</b></div>
                  ${d.siteCount > 0 ? `<div>🏪 网点: <b style="color: #f59e0b; font-size: 13px;">${d.siteCount}</b></div>` : ''}
                  <div>🏙️ 城市: <b style="color: #10b981;">${d.cityCount}</b></div>
                </div>
                ${d.cities && d.cities.length > 0 ? `
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                    <b>分布城市:</b> ${cityListStr}${d.cities.length > 5 ? ` 等共 ${d.cities.length} 个` : ''}
                  </div>
                ` : ''}
                ${d.companies && d.companies.length > 0 ? `
                  <div style="margin-top: 4px;">
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">代表企业:</div>
                    ${companyListHtml}
                  </div>
                ` : ''}
                <div style="font-size: 11px; color: #2563eb; margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 5px; font-weight: 500;">
                  🔍 点击国家区域：聚焦放大展示城市明细（再次点击取消）
                </div>
              `;
            } else {
              const companyListHtml = (d.companies || [])
                .slice(0, 4)
                .map(
                  (comp: string) =>
                    `<div style="color: #64748b; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">• ${comp}</div>`,
                )
                .join('');

              return `
                <div style="font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <span>📍 ${d.city}</span>
                  <span style="font-size: 11px; font-weight: normal; color: #64748b;">${d.country}</span>
                </div>
                <div style="display: flex; gap: 14px; margin-bottom: 6px; padding: 4px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
                  <div>🏢 分支机构: <b style="color: #0284c7;">${d.branchCount}</b></div>
                  ${d.siteCount > 0 ? `<div>🏪 网点: <b style="color: #f59e0b;">${d.siteCount}</b></div>` : ''}
                </div>
                ${d.companies && d.companies.length > 0 ? `
                  <div style="margin-top: 4px;">
                    <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">代表企业:</div>
                    ${companyListHtml}
                    ${d.companies.length > 4 ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">...等共 ${d.companies.length} 家</div>` : ''}
                  </div>
                ` : ''}
                <div style="font-size: 10px; color: #3b82f6; margin-top: 6px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">
                  👆 点击可在右侧抽屉打开【${d.country}】分支列表
                </div>
              `;
            }
          }
          if (params.componentType === 'geo') {
            return `<div style="font-weight: 600;">🌍 ${params.name}</div><div style="font-size: 11px; color: #64748b;">点击聚焦该国家区域（再次点击返回）</div>`;
          }
          return params.name;
        },
      },
      geo: geoOption,
      series: [
        // 1. 核心圆点散点层：数量居中置于圆点正中心，纯白粗体清晰高对比度（零 continuous RAF 负载）
        {
          name: isCountryMode ? '国家分支数量' : '城市分支数量',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: (val: any) => {
            const count = val[2] || 1;
            if (isCountryMode) {
              return Math.min(38, Math.max(22, 18 + Math.sqrt(count) * 4.5));
            }
            return Math.min(32, Math.max(20, 16 + Math.sqrt(count) * 4.0));
          },
          itemStyle: {
            color: isCountryMode
              ? '#1d4ed8'
              : displayFilter === 'site'
                ? '#d97706'
                : '#0284c7',
            borderColor: '#ffffff',
            borderWidth: 1.8,
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.25)',
            opacity: 0.95,
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (p: any) => `${p.value[2]}`,
            color: '#ffffff',
            fontWeight: 700,
            fontSize: (p: any) => {
              const val = (p && p.value && p.value[2]) || 0;
              return val >= 100 ? 10 : 11;
            },
            textShadowColor: 'rgba(0, 0, 0, 0.45)',
            textShadowBlur: 2,
          },
          zlevel: 3,
        },
        // 2. 名称文字标注层：放置于圆点右侧（留白距离 16px，杜绝与气泡重合）
        {
          name: isCountryMode ? '国家名称' : '城市名称',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: scatterData,
          symbolSize: 0,
          label: {
            show: true,
            position: 'right',
            distance: 16,
            formatter: (p: any) => {
              return isCountryMode ? p.data.country : p.data.city;
            },
            fontSize: 11,
            fontWeight: 500,
            color: '#1e293b',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            padding: [2, 6],
            borderRadius: 4,
            borderColor: '#cbd5e1',
            borderWidth: 0.8,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
            shadowBlur: 4,
          },
          zlevel: 2,
          silent: true,
        },
      ],
    };

    chart.setOption(option, { notMerge: false, lazyUpdate: true });
  }, [
    viewLevel,
    countryClusters,
    activeCityClusters,
    coveredCountries,
    selectedDrillCountry,
    displayFilter,
    handleToggleCountryDrill,
    onSelectCountry,
  ]);

  // 使用 ResizeObserver 监听容器尺寸变化，并在组件卸载时完全销毁 ECharts 实例彻底防止内存泄露
  useEffect(() => {
    if (!chartRef.current) return;
    const dom = chartRef.current;

    let resizeTimer: any = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
          chartInstanceRef.current.resize();
        }
      }, 100);
    });

    ro.observe(dom);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      // 彻底销毁 ECharts 实例，释放 Canvas 内存及定时器
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
      isMapInitializedRef.current = false;
    };
  }, []);

  // 手动切换视角大区
  const handleSelectRegion = (regionKey: string) => {
    setCurrentRegion(regionKey);
    setSelectedDrillCountry(null);
    selectedDrillCountryRef.current = null;
    prevViewStateRef.current = null;
    if (chartInstanceRef.current) {
      const view = REGION_VIEW_PARAMS[regionKey] || REGION_VIEW_PARAMS.world;
      chartInstanceRef.current.setOption({
        geo: {
          center: view.center,
          zoom: view.zoom,
        },
      });
      setCurrentZoom(view.zoom);
      if (view.zoom >= ZOOM_LEVEL_THRESHOLD) {
        setViewLevel('city');
      } else {
        setViewLevel('country');
      }
    }
  };

  // 手动缩放按键 (+ / -)
  const handleZoom = (direction: 'in' | 'out') => {
    if (!chartInstanceRef.current) return;
    const opt: any = chartInstanceRef.current.getOption();
    const currentZ = (opt && opt.geo && opt.geo[0] && opt.geo[0].zoom) || currentZoom;
    const nextZoom = direction === 'in' ? Math.min(15, currentZ * 1.5) : Math.max(1, currentZ / 1.5);

    chartInstanceRef.current.setOption({
      geo: {
        zoom: nextZoom,
      },
    });
    setCurrentZoom(nextZoom);

    if (nextZoom >= ZOOM_LEVEL_THRESHOLD) {
      setViewLevel('city');
    } else {
      setViewLevel('country');
      setSelectedDrillCountry(null);
      selectedDrillCountryRef.current = null;
    }
  };

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: 16,
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* 地图顶部操作控制栏 */}
      <div
        style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* 左侧：指标徽章统计与当前视图状态 */}
        <Space size="middle" wrap>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
            <GlobalOutlined style={{ marginRight: 6, color: '#0284c7' }} />
            全球分支地理分布
          </span>

          {/* 层级状态指示器 */}
          <Tag color={viewLevel === 'country' ? 'blue' : 'orange'} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: 4 }}>
            {viewLevel === 'country' ? '🌐 国家聚合视图' : '🏙️ 城市明细视图'}
          </Tag>

          <Space size="small">
            <span style={{ background: '#eff6ff', color: '#0284c7', padding: '2px 8px', borderRadius: 12, fontSize: '12px', fontWeight: 500 }}>
              🌐 覆盖国家: <b>{coveredCountries.length}</b> 个
            </span>
            <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: '12px', fontWeight: 500 }}>
              🏙️ 覆盖城市: <b>{cityClusters.length}</b> 个
            </span>
            <span style={{ background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: '12px', border: '1px solid #e2e8f0' }}>
              🏢 分支: <b>{branchNodes.length}</b> ｜ 🏪 网点: <b>{siteNodes.length}</b>
            </span>
          </Space>
        </Space>

        {/* 右侧：维度切换、筛选类型与区域快捷聚焦 */}
        <Space size="small" wrap>
          {/* 手动切换视图维度（即时切换，不改变地图缩放） */}
          <Segmented
            size="small"
            value={viewLevel}
            onChange={(val) => {
              setViewLevel(val as 'country' | 'city');
            }}
            options={[
              { label: '按国家', value: 'country' },
              { label: '按城市', value: 'city' },
            ]}
          />

          {/* 分支/网点类型切换 */}
          <Radio.Group
            size="small"
            value={displayFilter}
            onChange={(e) => setDisplayFilter(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button value="branch">分支 ({branchNodes.length})</Radio.Button>
            {siteNodes.length > 0 && <Radio.Button value="site">网点 ({siteNodes.length})</Radio.Button>}
          </Radio.Group>

          {/* 快捷聚焦大区按钮 */}
          <Space.Compact size="small">
            <Button
              type={currentRegion === 'world' && !selectedDrillCountry ? 'primary' : 'default'}
              onClick={handleResetToWorld}
            >
              全球
            </Button>
            <Button
              type={currentRegion === 'apac' ? 'primary' : 'default'}
              onClick={() => handleSelectRegion('apac')}
            >
              亚太
            </Button>
            <Button
              type={currentRegion === 'europe' ? 'primary' : 'default'}
              onClick={() => handleSelectRegion('europe')}
            >
              欧洲
            </Button>
            <Button
              type={currentRegion === 'americas' ? 'primary' : 'default'}
              onClick={() => handleSelectRegion('americas')}
            >
              美洲
            </Button>
            <Button
              type={currentRegion === 'mena' ? 'primary' : 'default'}
              onClick={() => handleSelectRegion('mena')}
            >
              中东/非洲
            </Button>
          </Space.Compact>

          {/* 缩放按钮 */}
          <Space.Compact size="small">
            <Tooltip title="放大 (+)">
              <Button icon={<ZoomInOutlined />} onClick={() => handleZoom('in')} />
            </Tooltip>
            <Tooltip title="缩小 (-)">
              <Button icon={<ZoomOutOutlined />} onClick={() => handleZoom('out')} />
            </Tooltip>
            <Tooltip title="重置视角 (默认2级国家视图)">
              <Button icon={<ReloadOutlined />} onClick={handleResetToWorld} />
            </Tooltip>
          </Space.Compact>
        </Space>
      </div>

      {/* 地图 Canvas 渲染容器（高度 600px） */}
      <div style={{ position: 'relative', width: '100%', height: '600px' }}>
        {countryClusters.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fafafa' }}>
            <Empty description="暂无海外分支机构地理分布数据" />
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        )}
      </div>
    </Card>
  );
};

export const OverseasBranchWorldMap = React.memo(OverseasBranchWorldMapComponent);
export default OverseasBranchWorldMap;
