import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Pagination, Tag, message } from 'antd';
import { DownloadOutlined, PartitionOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 AG Grid 模块防止 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

const KeyCustomerBranchTab: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [rowData, setRowData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(100);
  const [total, setTotal] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);

  // 拉取全量分支渗透情况数据（带 100 条分页和全局搜索）
  const fetchBranchData = async (currentPage = 1, searchVal = '') => {
    setLoading(true);
    try {
      const res = await request('/api/v1/key-customer-overview/branches', {
        method: 'GET',
        params: {
          page: currentPage,
          limit,
          search: searchVal || undefined,
        },
      });
      const dataObj = res?.data || res || {};
      setRowData(dataObj.results || []);
      setTotal(dataObj.totalResults || 0);
      setPage(currentPage);
    } catch (err) {
      console.error('获取要客分支数据失败', err);
      message.error('获取要客分支数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchData(1, searchText);
  }, []);

  // 导出全部筛选后记录为 Excel (.csv) 文件
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await request('/api/v1/key-customer-overview/branches', {
        method: 'GET',
        params: {
          exportAll: 1,
          search: searchText || undefined,
        },
      });
      const exportList = res?.data?.results || [];
      if (exportList.length === 0) {
        message.warning('暂无待导出的要客分支记录');
        return;
      }

      const headers = ['#', 'GID', '集团/母公司', '分支中文名', '分支英文名', '机构类型', '注册国家', '历史TCV的数量'];
      const csvRows = [headers.join(',')];

      exportList.forEach((item: any, idx: number) => {
        const row = [
          idx + 1,
          `"${(item.GID || '').replace(/"/g, '""')}"`,
          `"${(item.ultimateName || '').replace(/"/g, '""')}"`,
          `"${(item.companyNameCn || '').replace(/"/g, '""')}"`,
          `"${(item.companyNameEn || '').replace(/"/g, '""')}"`,
          `"${(item.entityTypeName || '').replace(/"/g, '""')}"`,
          `"${(item.registeredCountry || '').replace(/"/g, '""')}"`,
          item.tcvCount || 0
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const fileName = `要客分支渗透情况表_${new Date().toISOString().slice(0, 10)}.csv`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success(`成功导出 ${exportList.length} 条分支记录为 Excel 文件`);
    } catch (err) {
      console.error('导出 Excel 失败', err);
      message.error('导出 Excel 失败');
    } finally {
      setExporting(false);
    }
  };

  // AG Grid 列定义
  const columnDefs = [
    {
      headerName: '#',
      valueGetter: (params: any) => (page - 1) * limit + params.node.rowIndex + 1,
      width: 70,
      suppressMenu: true,
      sortable: false,
      pinned: 'left' as const
    },
    {
      headerName: 'GID',
      field: 'GID',
      width: 180,
      filter: true,
      sortable: true,
      cellRenderer: (params: any) => (
        <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{params.value || '-'}</span>
      )
    },
    {
      headerName: '集团/母公司',
      field: 'ultimateName',
      minWidth: 220,
      flex: 1,
      filter: true,
      sortable: true
    },
    {
      headerName: '分支中文名',
      field: 'companyNameCn',
      minWidth: 240,
      flex: 1,
      filter: true,
      sortable: true
    },
    {
      headerName: '分支英文名',
      field: 'companyNameEn',
      minWidth: 240,
      flex: 1,
      filter: true,
      sortable: true
    },
    {
      headerName: '机构类型',
      field: 'entityTypeName',
      width: 140,
      filter: true,
      sortable: true,
      cellRenderer: (params: any) => {
        const val = params.value;
        if (!val) return '-';
        let color = 'default';
        if (val === 'Parent') color = 'processing';
        else if (val === 'Subsidiary') color = 'success';
        else if (val === 'Branch') color = 'warning';
        else if (val === 'Site') color = 'error';
        return <Tag color={color}>{val}</Tag>;
      }
    },
    {
      headerName: '注册国家',
      field: 'registeredCountry',
      width: 160,
      filter: true,
      sortable: true
    },
    {
      headerName: '历史TCV的数量',
      field: 'tcvCount',
      width: 160,
      filter: true,
      sortable: true,
      type: 'numericColumn',
      cellStyle: { textAlign: 'right' },
      cellRenderer: (params: any) => {
        const count = params.value || 0;
        if (count > 0) {
          return <span style={{ color: '#389e0d', fontWeight: 'bold' }}>{count} 笔</span>;
        }
        return <span style={{ color: '#ccc' }}>0</span>;
      }
    }
  ];

  return (
    <div style={{
      background: '#fff',
      padding: '16px',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      height: '750px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 顶部操作工具栏 */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <PartitionOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            要客分支机构明细
          </h2>
          <Tag color="blue" style={{ fontSize: '12px', padding: '2px 8px' }}>共 {total} 个分支节点</Tag>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Input.Search
            placeholder="全局搜索集团/分支名称/国家/类型..."
            allowClear
            onSearch={(val) => {
              setSearchText(val);
              fetchBranchData(1, val);
            }}
            onChange={(e) => {
              if (!e.target.value) {
                setSearchText('');
                fetchBranchData(1, '');
              }
            }}
            style={{ width: 280 }}
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExportExcel}
            style={{ background: '#389e0d', borderColor: '#389e0d' }}
          >
            导出 Excel
          </Button>
        </div>
      </div>

      {/* AG Grid 表格主体（具备显式高度支撑，防止被压缩） */}
      <div className="ag-theme-quartz" style={{ flex: 1, width: '100%', minHeight: 0 }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
          }}
          loading={loading}
          enableRangeSelection={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          animateRows={true}
          theme={themeQuartz}
        />
      </div>

      {/* 底部 100 条分页器 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <Pagination
          current={page}
          pageSize={limit}
          total={total}
          onChange={(p) => fetchBranchData(p, searchText)}
          showTotal={(tot) => `共 ${tot} 条分支记录（每页 100 条）`}
          showSizeChanger={false}
        />
      </div>
    </div>
  );
};

export default KeyCustomerBranchTab;
