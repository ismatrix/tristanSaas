import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { request, useModel } from '@umijs/max';
import { Pagination, Spin, message, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// 注册 Module 防止 #272 错误
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

/**
 * 区域单元页面 —— 从「能力出海」页面独立拆分
 * 展示 cmibranches 集合数据，支持编辑和保存
 */
const RegionUnits: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const isTristan = initialState?.currentUser?.email === 'tristan@tristan.wang';
  const gridRef = useRef<AgGridReact>(null);

  // --- 数据状态 ---
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  // 拉取数据
  const fetchData = useCallback(async (page: number, limit: number) => {
    setLoading(true);
    try {
      const result = await request('/api/v1/cmi-branches', {
        method: 'GET',
        params: { page, limit, status: '1' }, // 默认只拉取激活状态的数据
      });
      setRowData(result.results || []);
      setTotal(result.totalResults || 0);
      setDirtyIds(new Set()); // 重置脏标记
    } catch (error) {
      console.error('Fetch branches failed', error);
      message.error('获取区域单元列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [fetchData, currentPage, pageSize]);

  const onPaginationChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  // 保存单条记录
  const handleSave = async (data: any) => {
    try {
      await request(`/api/v1/cmi-branches/${data.id}`, {
        method: 'PATCH',
        data: {
          RegionCode: data.RegionCode,
          UnitCode: data.UnitCode,
          columnDesc_zh: data.columnDesc_zh,
          columnDesc: data.columnDesc,
        },
      });
      message.success('保存成功');
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(data.id);
        return next;
      });
    } catch (error) {
      console.error('Save branch failed', error);
      message.error('保存失败');
    }
  };

  // 操作列渲染器
  const SaveActionRenderer = (p: any) => {
    const isDirty = dirtyIds.has(p.data.id);
    if (!isDirty) return null;
    return (
      <Button 
        type="primary" 
        size="small" 
        icon={<SaveOutlined />} 
        onClick={() => handleSave(p.data)}
      >
        保存
      </Button>
    );
  };

  // 列定义
  const colDefs = useMemo<any[]>(() => {
    const base: any[] = [
      { 
        headerName: '#', 
        valueGetter: "node.rowIndex + 1", 
        width: 60, minWidth: 40, pinned: 'left',
        filter: false, sortable: false,
        suppressHeaderMenuButton: true, suppressHeaderFilterButton: true 
      },
      { headerName: "ID", field: "columnValue", hide: true },
      { headerName: "Status", field: "status", hide: true },
      { headerName: "所属区域\nRegionCode", field: "RegionCode", editable: isTristan },
      { headerName: "机构编码\nUnitCode", field: "UnitCode", editable: isTristan },
      { headerName: "单元名称\ncolumnDesc_zh", field: "columnDesc_zh", editable: isTristan },
      { headerName: "单元英文\ncolumnDesc", field: "columnDesc", editable: isTristan },
    ];
    if (isTristan) {
      base.push({ 
        headerName: "操作", 
        width: 100,
        pinned: 'right',
        cellRenderer: SaveActionRenderer,
        filter: false,
        sortable: false
      });
    }
    return base;
  }, [dirtyIds, isTristan]);

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

  // 处理单元格变动标记脏数据
  const onCellValueChanged = (p: any) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.add(p.data.id);
      return next;
    });
  };

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

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>区域单元</h2>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip="拉取区域单元数据中..." size="large" />
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
          onCellValueChanged={onCellValueChanged}
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
            onChange={onPaginationChange}
            showTotal={(total) => `共 ${total} 条记录`}
          />
        </div>
      )}
    </div>
  );
};

export default RegionUnits;
