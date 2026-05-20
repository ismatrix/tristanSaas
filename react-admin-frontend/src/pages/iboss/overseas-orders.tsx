import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { request } from '@umijs/max';
import { Pagination, Spin, message } from 'antd';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 Module 防止 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// 帮助抽取器：安全获得目标网段信息 mksPlanPopDescGeneralInfoList (supplierTypeName="OnNet")
const getOnNetInfo = (data: any) => {
  const list = data?.orderDetail?.mksPlanPopDescGeneralInfoList;
  if (Array.isArray(list)) {
    return list.find((item: any) => item.supplierTypeName === 'OnNet') || {};
  }
  return {};
};

const OverseasOrders: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);

  // --- 订单数据状态 ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(500);

  // Fetch logic for Orders
  const fetchOrders = useCallback(async (page: number, limit: number) => {
    setLoading(true);
    try {
      const result = await request('/api/v1/orders', {
        method: 'GET',
        params: { page, limit, hasServNbr: true, sortBy: 'createdAt:desc' },
      });
      setRowData(result.results || []);
      setTotal(result.totalResults || 0);
    } catch (error) {
      console.error('Fetch orders failed', error);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(currentPage, pageSize);
  }, [fetchOrders, currentPage, pageSize]);

  const onPaginationChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  // 订单表列定义
  const colDefs = useMemo<any[]>(() => [
    { 
      headerName: '#', 
      valueGetter: "node.rowIndex + 1", 
      width: 60, minWidth: 40, 
      pinned: 'left', filter: false, sortable: false, 
      suppressHeaderMenuButton: true, suppressHeaderFilterButton: true 
    },
    {
      headerName: "创建时间\ncreateTime",
      colId: 'createTime',
      valueGetter: (p: any) => {
        const list = p.data?.orderDetail?.mksPlanPopDescGeneralInfoList;
        if (Array.isArray(list) && list.length > 0) {
          return list[0]?.mksPlanPopTax?.createTime || '';
        }
        return '';
      },
      valueFormatter: (p: any) => {
        if (!p.value) return '';
        const str = String(p.value);
        // 截取前10位 YYYY-MM-DD
        if (str.length >= 10) return str.substring(0, 10);
        return str;
      },
      filter: 'agTextColumnFilter',
      width: 130,
    },
    { headerName: "ID\nhandleId", field: "handleId", width: 140, hide: true },
    { headerName: "产品类型\nproductName", field: "productName" },
    { headerName: "需求编号\nrequireCode", field: "requireCode", hide: true },
    { headerName: "客户名称\ncustomerName", field: "customerName" },
    { headerName: "项目名称\nhandleName", field: "handleName" },
    { headerName: "电路编码\nservNbr", field: "servNbr" },
    { headerName: "所属区域\nRegionCode", valueGetter: (p: any) => p.data?.branchInfo?.RegionCode },
    { headerName: "机构编码\nUnitCode", valueGetter: (p: any) => p.data?.branchInfo?.UnitCode },
    { headerName: "归属单元\ncontractBelong", field: "contractBelong" },
    { headerName: "客户经理\ncustManagerName", field: "custManagerName" },
    { headerName: "创建人\ncreateStaffName", field: "createStaffName", hide: true },
    { headerName: "合同号\norderApprovalNo", field: "orderApprovalNo", hide: true },
    {
      headerName: "签约时间\nsignDate",
      valueGetter: (p: any) => p.data?.contractList?.[0]?.signDate,
      valueFormatter: (p: any) => {
        if (!p.value) return '';
        const str = String(p.value);
        if (str.length >= 10) return str.substring(0, 10);
        return str;
      },
      filter: 'agDateColumnFilter',
    },
    { headerName: "合作伙伴名称\npartnerName", valueGetter: (p: any) => getOnNetInfo(p.data).partnerName },
    { headerName: "类型\nsupplierTypeName", valueGetter: (p: any) => getOnNetInfo(p.data).supplierTypeName },
    { headerName: "自有类型\ncmiOrCmccDesc", valueGetter: (p: any) => getOnNetInfo(p.data).cmiOrCmccDesc },
    { headerName: "服务描述\nsectionTypeDesc", valueGetter: (p: any) => getOnNetInfo(p.data).sectionTypeDesc },
    { 
      headerName: "成本\nnrcCost", 
      type: 'numericColumn',
      valueGetter: (p: any) => getOnNetInfo(p.data).mksPlanPopPriceDescList?.[0]?.nrcCost,
      valueFormatter: (p: any) => p.value != null ? Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      cellStyle: { textAlign: 'right' }
    },
    { headerName: "成本币种\ncostCurrencyDesc", valueGetter: (p: any) => getOnNetInfo(p.data).mksPlanPopPriceDescList?.[0]?.costCurrencyDesc },
    { 
      headerName: "收入\nnrc", 
      type: 'numericColumn',
      valueGetter: (p: any) => getOnNetInfo(p.data).mksPlanPopPriceDescList?.[0]?.nrc,
      valueFormatter: (p: any) => p.value != null ? Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      cellStyle: { textAlign: 'right' }
    },
    { headerName: "收入币种\ncurrencyName", valueGetter: (p: any) => p.data?.orderDetail?.currencyName },

    {
      headerName: "总收入HKD\nincomeTotal",
      type: 'numericColumn',
      valueGetter: (p: any) => p.data?.contractProfit?.incomeTotal,
      valueFormatter: (p: any) => p.value != null ? Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      cellStyle: { textAlign: 'right' }
    },
    {
      headerName: "总成本HKD\ncostTotal",
      type: 'numericColumn',
      valueGetter: (p: any) => p.data?.contractProfit?.costTotal,
      valueFormatter: (p: any) => p.value != null ? Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      cellStyle: { textAlign: 'right' }
    },
    {
      headerName: "合同毛利率\ntotalGrossMarginRate",
      type: 'numericColumn',
      valueGetter: (p: any) => p.data?.contractProfit?.totalGrossMarginRateProject,
      valueFormatter: (p: any) => {
        if (p.value == null || p.value === '') return '';
        return `${Number(p.value).toFixed(2)}%`;
      },
      cellStyle: { textAlign: 'right' }
    },
    { headerName: "项目描述\nbackgroundInfo", valueGetter: (p: any) => p.data?.contractProfit?.backgroundInfo },
  ], []);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 150,
    filter: true,
    sortable: true,
    resizable: true,
    enableValue: true,
    enableRowGroup: true,
    enablePivot: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    headerClass: 'tristan-center-header'
  }), []);

  // 首次数据渲染后，自动设置创建时间列默认过滤为 2026 年（AG Grid V35+ API）
  const onOrderGridFirstDataRendered = useCallback((params: any) => {
    params.api.setColumnFilterModel('createTime', {
      type: 'startsWith',
      filter: '2026',
    }).then(() => {
      params.api.onFilterChanged();
    });
  }, []);

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip="拉取订单数据中..." size="large" />
          </div>
        )}
        <AgGridReact
          theme={themeQuartz}
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          enableRangeSelection={true}
          rowSelection="multiple"
          suppressRowClickSelection={true} 
          animateRows={true}
          onFirstDataRendered={onOrderGridFirstDataRendered}
          sideBar={{ toolPanels: ['columns', 'filters'], defaultToolPanel: '' }}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agFilteredRowCountComponent' },
              { statusPanel: 'agSelectedRowCountComponent' },
              { statusPanel: 'agAggregationComponent' }
            ]
          }}
        />
        {total > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0', borderTop: '1px solid #e8e8e8', marginTop: 12 }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              showQuickJumper
              onChange={onPaginationChange}
              showTotal={(total) => `共 ${total} 条数据`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OverseasOrders;
