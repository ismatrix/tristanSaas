import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Row, Col, Statistic, Tag, Button, Space, Input, DatePicker, Tabs, Tooltip, message } from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  FileTextOutlined,
  FireOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { request, Link } from '@umijs/max';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import dayjs from 'dayjs';

// 注册 AG Grid 模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// 通用带 UTF-8 BOM 的 Excel (CSV) 导出工具函数
const exportToCsvExcel = (filename: string, headers: string[], keys: ((row: any, idx?: number) => any)[], data: any[]) => {
  if (!data || data.length === 0) {
    message.warning('暂无可导出数据');
    return;
  }
  let csvContent = '\uFEFF';
  csvContent += headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

  data.forEach((row, idx) => {
    const rowValues = keys.map((k) => {
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
  link.setAttribute('download', `${filename}_${dayjs().format('YYYY-MM-DD_HHmmss')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  message.success(`已成功导出 ${data.length} 条记录至 Excel (CSV)`);
};

const PageViewsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [overview, setOverview] = useState<any>({
    totalPv: 0,
    totalUv: 0,
    todayPv: 0,
    todayUv: 0,
    totalPages: 0,
  });

  // 日志流水数据
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearchText, setLogSearchText] = useState<string>('');

  // 页面热度排行数据
  const [stats, setStats] = useState<any[]>([]);
  const [statSearchText, setStatSearchText] = useState<string>('');

  // 加载概览统计
  const fetchOverview = useCallback(async () => {
    try {
      const res = await request('/api/v1/page-views/overview', { method: 'GET', skipErrorHandler: true });
      if (res) {
        setOverview(res);
      }
    } catch (e) {
      console.error('Failed to fetch overview stats', e);
    }
  }, []);

  // 加载明细流水日志
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request('/api/v1/page-views/logs', {
        method: 'GET',
        params: { limit: 2000 },
        skipErrorHandler: true,
      });
      if (res && res.results) {
        setLogs(res.results);
      }
    } catch (e) {
      console.error('Failed to fetch page view logs', e);
      message.error('获取访问流水日志失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载热度排行统计
  const fetchStats = useCallback(async () => {
    try {
      const res = await request('/api/v1/page-views/stats', {
        method: 'GET',
        params: { limit: 1000 },
        skipErrorHandler: true,
      });
      if (Array.isArray(res)) {
        setStats(res);
      }
    } catch (e) {
      console.error('Failed to fetch page view stats', e);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchOverview();
    fetchLogs();
    fetchStats();
  }, [fetchOverview, fetchLogs, fetchStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 1. 明细流水 AG Grid 列定义
  const logColumnDefs = useMemo(() => {
    return [
      {
        headerName: '序号',
        valueGetter: (params: any) => (params.node ? params.node.rowIndex + 1 : 1),
        width: 75,
        pinned: 'left' as const,
        cellStyle: { textAlign: 'center', color: '#888' },
      },
      {
        headerName: '访问时间',
        field: 'visitedAt',
        width: 170,
        pinned: 'left' as const,
        sortable: true,
        filter: 'agDateColumnFilter',
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return dayjs(params.value).format('YYYY-MM-DD HH:mm:ss');
        },
        cellStyle: { fontWeight: 500, color: '#333' },
      },
      {
        headerName: '目标要客 / 页面名称',
        field: 'nameCn',
        minWidth: 200,
        flex: 1.2,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data || {};
          const displayName = row.nameCn || row.title || '系统页面';
          const isFamilyTree = row.path?.startsWith('/keyGlobalFamilyTree/');
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isFamilyTree ? <Tag color="blue">要客家族树</Tag> : <Tag color="default">通用页面</Tag>}
              <span style={{ fontWeight: 600, color: '#1890ff' }}>{displayName}</span>
              {row.abbr && <Tag color="cyan">{row.abbr}</Tag>}
            </div>
          );
        },
      },
      {
        headerName: '页面路径 (Path)',
        field: 'path',
        minWidth: 220,
        flex: 1.5,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          const full = params.data?.fullUrl || params.value;
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#555',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={full}
              >
                {params.value}
              </span>
              {params.value && (
                <Link to={full} target="_blank" style={{ marginLeft: 8, fontSize: 12 }}>
                  <Tooltip title="在新标签页中访问该页面">
                    <ArrowRightOutlined />
                  </Tooltip>
                </Link>
              )}
            </div>
          );
        },
      },
      {
        headerName: '访问账号 (邮箱)',
        field: 'userEmail',
        width: 190,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.value) return <span style={{ color: '#aaa', fontStyle: 'italic' }}>访客 / 未登录</span>;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontWeight: 500, color: '#237804' }}>{params.value}</span>
            </div>
          );
        },
      },
      {
        headerName: '访问者姓名',
        field: 'userName',
        width: 120,
        filter: true,
        sortable: true,
        valueGetter: (params: any) => params.data?.userName || '—',
      },
      {
        headerName: '客户端 IP',
        field: 'ip',
        width: 140,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          const ip = params.value;
          if (!ip) return '—';
          return <Tag color="purple">{ip}</Tag>;
        },
      },
      {
        headerName: '来源 Referrer',
        field: 'referrer',
        width: 160,
        filter: true,
        sortable: true,
        valueGetter: (params: any) => params.data?.referrer || '—',
      },
      {
        headerName: '浏览器 User-Agent',
        field: 'userAgent',
        minWidth: 200,
        flex: 1,
        filter: true,
        sortable: true,
        valueGetter: (params: any) => params.data?.userAgent || '—',
      },
    ];
  }, []);

  // 2. 页面热度排行 AG Grid 列定义
  const statColumnDefs = useMemo(() => {
    return [
      {
        headerName: '热度排名',
        valueGetter: (params: any) => {
          const idx = params.node ? params.node.rowIndex + 1 : 1;
          return idx;
        },
        width: 95,
        pinned: 'left' as const,
        cellRenderer: (params: any) => {
          const rank = params.value;
          if (rank === 1) return <Tag color="#f5222d" style={{ fontWeight: 'bold' }}>TOP 1 🔥</Tag>;
          if (rank === 2) return <Tag color="#fa8c16" style={{ fontWeight: 'bold' }}>TOP 2</Tag>;
          if (rank === 3) return <Tag color="#faad14" style={{ fontWeight: 'bold' }}>TOP 3</Tag>;
          return <span style={{ color: '#666', fontWeight: 500, paddingLeft: 8 }}>#{rank}</span>;
        },
      },
      {
        headerName: '要客名称 / 页面标题',
        field: 'nameCn',
        minWidth: 220,
        flex: 1.5,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data || {};
          const displayName = row.nameCn || row.title || '系统页面';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 13 }}>{displayName}</span>
              {row.abbr && <Tag color="cyan">{row.abbr}</Tag>}
            </div>
          );
        },
      },
      {
        headerName: '页面路径 (Path)',
        field: 'path',
        minWidth: 250,
        flex: 2,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#555' }}>{params.value}</span>
              <Link to={params.value} target="_blank">
                <Button size="small" type="link" icon={<ArrowRightOutlined />}>
                  打开
                </Button>
              </Link>
            </div>
          );
        },
      },
      {
        headerName: '累计访问量 (PV)',
        field: 'pv',
        width: 150,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: any) => {
          const val = params.value || 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold', color: '#f5222d' }}>
              <FireOutlined />
              <span>{val.toLocaleString()} 次</span>
            </div>
          );
        },
      },
      {
        headerName: '独立访客数 (UV)',
        field: 'uv',
        width: 140,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: any) => {
          const val = params.value || 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, color: '#1890ff' }}>
              <UserOutlined />
              <span>{val.toLocaleString()} 人</span>
            </div>
          );
        },
      },
      {
        headerName: '最近访问人',
        field: 'lastUserEmail',
        width: 180,
        filter: true,
        sortable: true,
        cellRenderer: (params: any) => {
          if (!params.value) return <span style={{ color: '#aaa' }}>—</span>;
          return <span style={{ color: '#52c41a', fontWeight: 500 }}>{params.value}</span>;
        },
      },
      {
        headerName: '最近访问时间',
        field: 'lastVisitedAt',
        width: 180,
        sortable: true,
        filter: 'agDateColumnFilter',
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return dayjs(params.value).format('YYYY-MM-DD HH:mm:ss');
        },
      },
    ];
  }, []);

  const defaultColDef = useMemo(() => {
    return {
      resizable: true,
      sortable: true,
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    };
  }, []);

  // 导出明细日志 Excel
  const handleExportLogsExcel = useCallback(() => {
    const headers = ['序号', '访问时间', '目标要客/页面', '页面路径', '完整URL', '访问用户邮箱', '访问者姓名', '客户端IP', '来源Referrer', 'User-Agent'];
    const keys = [
      (_: any, idx?: number) => (idx !== undefined ? idx + 1 : 1),
      (r: any) => (r.visitedAt ? dayjs(r.visitedAt).format('YYYY-MM-DD HH:mm:ss') : '—'),
      (r: any) => r.nameCn || r.title || '系统页面',
      (r: any) => r.path || '—',
      (r: any) => r.fullUrl || r.path || '—',
      (r: any) => r.userEmail || '访客',
      (r: any) => r.userName || '—',
      (r: any) => r.ip || '—',
      (r: any) => r.referrer || '—',
      (r: any) => r.userAgent || '—',
    ];
    exportToCsvExcel('页面访问明细流水日志', headers, keys, logs);
  }, [logs]);

  // 导出热度排行 Excel
  const handleExportStatsExcel = useCallback(() => {
    const headers = ['排名', '要客名称/页面', '页面路径', '累计浏览量(PV)', '独立访客(UV)', '最近访问人', '最近访问时间'];
    const keys = [
      (_: any, idx?: number) => (idx !== undefined ? idx + 1 : 1),
      (r: any) => r.nameCn || r.title || '系统页面',
      (r: any) => r.path || '—',
      (r: any) => r.pv || 0,
      (r: any) => r.uv || 0,
      (r: any) => r.lastUserEmail || '—',
      (r: any) => (r.lastVisitedAt ? dayjs(r.lastVisitedAt).format('YYYY-MM-DD HH:mm:ss') : '—'),
    ];
    exportToCsvExcel('页面访问热度汇总排行', headers, keys, stats);
  }, [stats]);

  return (
    <PageContainer
      header={{
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 'bold', color: '#111' }}>📊 系统页面访问统计与审计日志</span>
            <Tag color="processing">实时埋点</Tag>
          </div>
        ),
        extra: [
          <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshAll} loading={loading}>
            刷新数据
          </Button>,
        ],
      }}
    >
      {/* 顶部概览指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #e6f7ff 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>全站总浏览量 (PV)</span>}
              value={overview.totalPv}
              prefix={<EyeOutlined style={{ color: '#1890ff', marginRight: 6 }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>次</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>全站独立访客数 (UV)</span>}
              value={overview.totalUv}
              prefix={<UserOutlined style={{ color: '#52c41a', marginRight: 6 }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>人</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #fff7e6 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>今日浏览量 (Today PV)</span>}
              value={overview.todayPv}
              prefix={<ThunderboltOutlined style={{ color: '#fa8c16', marginRight: 6 }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>次</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: 'linear-gradient(135deg, #f9f0ff 0%, #ffffff 100%)' }}>
            <Statistic
              title={<span style={{ color: '#595959', fontWeight: 600 }}>已覆盖访问页面数</span>}
              value={overview.totalPages}
              prefix={<GlobalOutlined style={{ color: '#722ed1', marginRight: 6 }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>个页面</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* 主体内容区：Tabs */}
      <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Tabs
          defaultActiveKey="logs"
          items={[
            {
              key: 'logs',
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: 6 }} />
                  访问明细流水日志 ({logs.length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 360px)', minHeight: 480 }}>
                  {/* 操作栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#666', fontSize: 13 }}>
                      共获取到 <strong style={{ color: '#1890ff' }}>{logs.length}</strong> 条实时访问流水明细
                    </div>
                    <Space>
                      <Input
                        placeholder="在访问流水表中全文检索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={logSearchText}
                        onChange={(e) => setLogSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                      <Button icon={<DownloadOutlined />} onClick={handleExportLogsExcel} disabled={logs.length === 0}>
                        导出 Excel
                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 容器 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={logs}
                      columnDefs={logColumnDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={logSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      animateRows={true}
                      pagination={true}
                      paginationPageSize={100}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'stats',
              label: (
                <span>
                  <FireOutlined style={{ marginRight: 6, color: '#f5222d' }} />
                  页面访问热度排行榜 ({stats.length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 360px)', minHeight: 480 }}>
                  {/* 操作栏 */}
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#666', fontSize: 13 }}>
                      共统计到 <strong style={{ color: '#f5222d' }}>{stats.length}</strong> 个独立页面的热度数据 (按总访问量 PV 降序排列)
                    </div>
                    <Space>
                      <Input
                        placeholder="在热度排行榜中全文检索..."
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        value={statSearchText}
                        onChange={(e) => setStatSearchText(e.target.value)}
                        style={{ width: 280 }}
                      />
                      <Button icon={<DownloadOutlined />} onClick={handleExportStatsExcel} disabled={stats.length === 0}>
                        导出 Excel
                      </Button>
                    </Space>
                  </div>

                  {/* AG Grid React 容器 */}
                  <div className="ag-theme-quartz" style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={stats}
                      columnDefs={statColumnDefs}
                      defaultColDef={defaultColDef}
                      quickFilterText={statSearchText}
                      enableRangeSelection={true}
                      rowSelection="multiple"
                      suppressRowClickSelection={true}
                      animateRows={true}
                      pagination={true}
                      paginationPageSize={100}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default PageViewsPage;
