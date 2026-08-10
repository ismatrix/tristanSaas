import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { request } from '@umijs/max';
import { Pagination, Spin, message, Button, Input } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 Module 防止 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

const { Search } = Input;

const IBossCustomers: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);

  // --- 1. 数据状态 ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [exporting, setExporting] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // 生成全表及全字段模糊过滤条件 (支持多词空格 AND 检索，兼容数值与字符串类型ID)
  const getQueryFilter = (keyword: string) => {
    if (!keyword || !keyword.trim()) return {};
    const words = keyword.trim().split(/\s+/).filter(Boolean);

    const makeSingleWordOrFilter = (word: string) => {
      const rx = { $regex: word, $options: 'i' };
      const num = Number(word);
      const isNum = !isNaN(num);

      const orList: any[] = [
        { custId: rx },
        { custCode: rx },
        { enterpriseName: rx },
        { registerAreaName: rx },
        { country: rx },
        { city: rx },
        { commAddr: rx },
        { custIndustryName: rx },
        { customerTypeName: rx },
        { createOperName: rx },
        { createTime: rx },
        { certificateNum: rx },
        { linkman: rx },
        { linkmanPhone: rx },
        { email: rx },
        { remarks: rx },
        { statusName: rx }
      ];

      if (isNum) {
        orList.push({ custId: num });
        orList.push({ custCode: num });
      }

      return { $or: orList };
    };

    if (words.length === 1) {
      return makeSingleWordOrFilter(words[0]);
    }

    return {
      $and: words.map(w => makeSingleWordOrFilter(w))
    };
  };

  // 导出全量数据
  const handleExportJson = async () => {
    setExporting(true);
    try {
      const result = await request('/api/v1/iboss-customers', {
        method: 'GET',
        params: {
          query: JSON.stringify(getQueryFilter(globalSearch)),
          page: 1,
          limit: 1000000,
          sortBy: 'createdAt:desc'
        },
      });
      const records = result.results || [];
      if (records.length === 0) {
        message.warning('暂无数据可导出');
        return;
      }
      
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `ibosscustomers${timestamp}.json`;

      // 剔除前端拼接或内部字段
      const exportData = records.map(({ id, ...rest }: any) => rest);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`已导出 ${records.length} 条记录`);
    } catch (error) {
      console.error('Export failed', error);
      message.error('导出 JSON 失败');
    } finally {
      setExporting(false);
    }
  };

  // Fetch logic
  const fetchCustomers = useCallback(async (page: number, limit: number, searchWord: string) => {
    setLoading(true);
    try {
      const queryParams = {
        query: JSON.stringify(getQueryFilter(searchWord)),
        page,
        limit,
        sortBy: 'createdAt:desc'
      };
      const result = await request('/api/v1/iboss-customers', {
        method: 'GET',
        params: queryParams,
      });
      setRowData(result.results || []);
      setTotal(result.totalResults || 0);
    } catch (error) {
      console.error('Fetch customers failed', error);
      message.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(currentPage, pageSize, globalSearch);
  }, [fetchCustomers, currentPage, pageSize, globalSearch]);

  const onPaginationChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const onSearch = (value: string) => {
    setCurrentPage(1); // 重新搜索时返回第一页
    setGlobalSearch(value);
  };

  // 列定义
  const colDefs = useMemo<any[]>(() => [
    { 
      headerName: '#', 
      valueGetter: "node.rowIndex + 1", 
      width: 60, minWidth: 40, 
      pinned: 'left', filter: false, sortable: false, 
      suppressHeaderMenuButton: true, suppressHeaderFilterButton: true 
    },
    { headerName: "客户ID\ncustId", field: "custId", width: 140 },
    { headerName: "客户编码\ncustCode", field: "custCode", width: 140 },
    { headerName: "企业名称\nenterpriseName", field: "enterpriseName", width: 250 },
    { headerName: "注册地区\nregisterAreaName", field: "registerAreaName" },
    { headerName: "客户行业\ncustIndustryName", field: "custIndustryName" },
    { headerName: "客户类型\ncustomerTypeName", field: "customerTypeName" },
    { headerName: "创建人\ncreateOperName", field: "createOperName" },
    { 
        headerName: "创建时间\ncreateTime", 
        field: "createTime",
        valueFormatter: (p: any) => p.value ? String(p.value).substring(0, 19) : ''
    },
    { 
        headerName: "同步时间\nupdatedAt", 
        field: "updatedAt",
        valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString('zh-CN') : ''
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 150,
    filter: true,
    sortable: true,
    resizable: true,
    enableValue: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    headerClass: 'tristan-center-header'
  }), []);

  return (
    <div style={{ 
      height: 'calc(100vh - 70px)', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#fff', 
      borderRadius: 8, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '16px',
      overflow: 'hidden'
    }}>
      <style>{`
        .tristan-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
        }
      `}</style>
      
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>iBOSS 客户管理</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Search 
            placeholder="全字段关键字过滤搜索..." 
            onSearch={onSearch} 
            enterButton 
            allowClear
            style={{ width: 350 }}
          />
          <Button 
            type="primary" 
            icon={<ExportOutlined />} 
            loading={exporting}
            onClick={handleExportJson}
          >
            导出JSON
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip="加载客户数据中..." size="large" />
          </div>
        )}
        <AgGridReact
          theme={themeQuartz}
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={globalSearch}
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
            ]
          }}
        />
      </div>

      {total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0', borderTop: '1px solid #e8e8e8', marginTop: 12 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            showQuickJumper
            onChange={onPaginationChange}
            showTotal={(total) => `共 ${total} 条客户记录`}
          />
        </div>
      )}
    </div>
  );
};

export default IBossCustomers;
