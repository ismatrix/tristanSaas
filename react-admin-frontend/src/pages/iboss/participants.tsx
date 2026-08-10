import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { request } from '@umijs/max';
import { Pagination, Spin, message, Button, Input, Drawer, Descriptions, Table } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

const { Search } = Input;

// 注册 Module
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

const DetailDrawer: React.FC<{ record: any; open: boolean; onClose: () => void }> = ({ record, open, onClose }) => {
  if (!record || !record.detailInfo) return null;
  const { detailInfo } = record;
  const basic = detailInfo.companyBasicDTO || {};
  const addresses = detailInfo.companyAddressDTOList || [];
  const banks = detailInfo.companyBankAccountDTOList || [];
  const contacts = detailInfo.companyContactDTOList || [];
  const attachments = detailInfo.companyAttachmentList || [];

  const getDynamicColumns = (dataArray: any[]) => {
    if (!dataArray || dataArray.length === 0) return [];
    // 动态提取该数组内所有对象出现过的全量键值作为列头
    const allKeys = new Set<string>();
    dataArray.forEach(obj => {
      if (obj) Object.keys(obj).forEach(k => allKeys.add(k));
    });
    
    return Array.from(allKeys).map(key => ({
      title: key,
      dataIndex: key,
      key: key,
      render: (val: any) => typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? ''),
      width: 180, // 固定列宽，触发横向滚动
      ellipsis: true, // 超长截断防止撑爆格子
    }));
  };

  return (
    <Drawer
      title={`参与方详情 - ${basic.companyName || record.companyBasicId}`}
      placement="right"
      width={900} // 放宽抽屉宽度，更好适配宽表格
      open={open}
      onClose={onClose}
    >
      <h3>基础信息 (companyBasicDTO)</h3>
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
        {Object.entries(basic).map(([k, v]) => (
          <Descriptions.Item label={k} key={k}>{String(v ?? '')}</Descriptions.Item>
        ))}
      </Descriptions>

      {addresses.length > 0 && (
        <>
          <h3>地址信息 (companyAddressDTOList)</h3>
          <Table 
            dataSource={addresses} 
            columns={getDynamicColumns(addresses)} 
            pagination={false} 
            size="small" 
            scroll={{ x: 'max-content' }} 
            style={{ marginBottom: 24 }}
            rowKey={(r, i) => i?.toString() || Math.random().toString()}
          />
        </>
      )}

      {banks.length > 0 && (
        <>
          <h3>银行信息 (companyBankAccountDTOList)</h3>
          <Table 
            dataSource={banks} 
            columns={getDynamicColumns(banks)} 
            pagination={false} 
            size="small" 
            scroll={{ x: 'max-content' }} 
            style={{ marginBottom: 24 }}
            rowKey={(r, i) => i?.toString() || Math.random().toString()}
          />
        </>
      )}

      {contacts.length > 0 && (
        <>
          <h3>联系人信息 (companyContactDTOList)</h3>
          <Table 
            dataSource={contacts} 
            columns={getDynamicColumns(contacts)} 
            pagination={false} 
            size="small" 
            scroll={{ x: 'max-content' }} 
            style={{ marginBottom: 24 }}
            rowKey={(r, i) => i?.toString() || Math.random().toString()}
          />
        </>
      )}

      {attachments.length > 0 && (
        <>
          <h3>附件信息 (companyAttachmentList)</h3>
          <Table 
            dataSource={attachments} 
            columns={getDynamicColumns(attachments)} 
            pagination={false} 
            size="small" 
            scroll={{ x: 'max-content' }} 
            style={{ marginBottom: 24 }}
            rowKey={(r, i) => i?.toString() || Math.random().toString()}
          />
        </>
      )}
    </Drawer>
  );
};

const IBossParticipants: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);

  // 数据状态
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30); // 默认每页 30 条
  const [exporting, setExporting] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  
  // Drawer 状态
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState<any>(null);
  
  const extractBanks = (params: any) => {
    const list = params.data?.detailInfo?.companyBankAccountDTOList || [];
    return list.length;
  };
  
  const extractContacts = (params: any) => {
    const list = params.data?.detailInfo?.companyContactDTOList || [];
    return list.length;
  };

  // 生成全表及子对象全属性模糊过滤条件 (支持多词空格 AND 检索，兼容数值与字符串类型ID)
  const getQueryFilter = (keyword: string) => {
    if (!keyword || !keyword.trim()) return {};
    const words = keyword.trim().split(/\s+/).filter(Boolean);

    const makeSingleWordOrFilter = (word: string) => {
      const rx = { $regex: word, $options: 'i' };
      const num = Number(word);
      const isNum = !isNaN(num);

      const orList: any[] = [
        { companyBasicId: rx },
        { companyId: rx },
        { 'detailInfo.companyBasicDTO.companyName': rx },
        { 'detailInfo.companyBasicDTO.companyEnglishName': rx },
        { 'detailInfo.companyBasicDTO.businessRegistrationNumber': rx },
        { 'detailInfo.companyBasicDTO.companyId': rx },
        { 'detailInfo.companyBasicDTO.companyNum': rx },
        { 'detailInfo.companyBasicDTO.domesticForeignRelationMeaning': rx },
        { 'detailInfo.companyBasicDTO.registeredCountryName': rx },
        { 'detailInfo.companyBasicDTO.addressDetail': rx },
        { 'detailInfo.companyBasicDTO.businessScopeMeaning': rx },
        { 'detailInfo.companyBasicDTO.legalRepresentative': rx },
        { 'detailInfo.companyBasicDTO.unifiedSocialCreditCode': rx },
        { 'detailInfo.companyBasicDTO.taxNumber': rx },
        { 'detailInfo.companyBasicDTO.contactPhone': rx },
        { 'detailInfo.companyBasicDTO.email': rx },
        { 'detailInfo.companyAddressDTOList.address': rx },
        { 'detailInfo.companyAddressDTOList.countryName': rx },
        { 'detailInfo.companyAddressDTOList.cityName': rx },
        { 'detailInfo.companyBankAccountDTOList.bankName': rx },
        { 'detailInfo.companyBankAccountDTOList.bankBranchName': rx },
        { 'detailInfo.companyBankAccountDTOList.bankAccountName': rx },
        { 'detailInfo.companyBankAccountDTOList.bankAccountNumber': rx },
        { 'detailInfo.companyBankAccountDTOList.currency': rx },
        { 'detailInfo.companyContactDTOList.name': rx },
        { 'detailInfo.companyContactDTOList.contactTypeMeaning': rx },
        { 'detailInfo.companyContactDTOList.mobilePhone': rx },
        { 'detailInfo.companyContactDTOList.email': rx }
      ];

      // 若检索词为纯数字，兼容数据库数值类型字段匹配 (如 companyId: 80983)
      if (isNum) {
        orList.push({ companyBasicId: num });
        orList.push({ companyId: num });
        orList.push({ 'detailInfo.companyBasicDTO.companyId': num });
        orList.push({ 'detailInfo.companyBasicDTO.companyNum': num });
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

  // API 获取核心逻辑
  const fetchParticipants = useCallback(async (page: number, limit: number, searchWord: string) => {
    setLoading(true);
    try {
      const queryParams = {
        query: JSON.stringify(getQueryFilter(searchWord)),
        options: JSON.stringify({ page, limit, sort: { _id: -1 } })
      };
      
      const result = await request('/api/v1/wildcards/ibossParticipantDetail', {
        method: 'GET',
        params: queryParams,
      });
      setRowData(result.results || []);
      setTotal(result.totalResults || 0);
    } catch (error) {
      console.error('Fetch participants failed', error);
      message.error('获取参与方列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants(currentPage, pageSize, globalSearch);
  }, [fetchParticipants, currentPage, pageSize, globalSearch]);

  const onPaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const onSearch = (value: string) => {
    setCurrentPage(1); // 重新搜索时返回第一页
    setGlobalSearch(value);
  };

  // 导出全量过滤后的 JSON
  const handleExportJson = async () => {
    setExporting(true);
    try {
      const queryParams = {
        query: JSON.stringify(getQueryFilter(globalSearch)),
        options: JSON.stringify({ page: 1, limit: 1000000, sort: { _id: -1 } })
      };
      const result = await request('/api/v1/wildcards/ibossParticipantDetail', {
        method: 'GET',
        params: queryParams,
      });
      const records = result.results || [];
      if (records.length === 0) {
        message.warning('暂无数据可导出');
        return;
      }
      
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const fileName = `ibossparticipants_${timestamp}.json`;

      // 剔除内部自动生成的字段
      const exportData = records.map(({ _id, __v, _syncedAt, ...rest }: any) => rest);
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

  // AG Grid 字段映射与样式配置
  const colDefs = useMemo<any[]>(() => [
    { 
      headerName: '#', valueGetter: "node.rowIndex + 1", width: 60, minWidth: 40, 
      pinned: 'left', filter: false, sortable: false, suppressHeaderMenuButton: true, suppressHeaderFilterButton: true 
    },
    { headerName: "Basic ID\ncompanyBasicId", field: "companyBasicId", width: 140, pinned: 'left' },
    { 
      headerName: "公司名称\ncompanyName", 
      field: "detailInfo.companyBasicDTO.companyName", 
      width: 250, 
      pinned: 'left',
      cellRenderer: (params: any) => {
        return (
          <a onClick={() => {
            setDrawerRecord(params.data);
            setDrawerOpen(true);
          }} style={{ color: '#1677ff', cursor: 'pointer', fontWeight: 500 }}>
            {params.value || params.data?.companyBasicId || '未知公司名称'}
          </a>
        );
      }
    },
    { headerName: "英文名称\ncompanyEnglishName", field: "detailInfo.companyBasicDTO.companyEnglishName", width: 250 },
    { headerName: "工商注册号\nbusinessRegistrationNumber", field: "detailInfo.companyBasicDTO.businessRegistrationNumber", width: 200 },
    { headerName: "内部编码\ncompanyId", field: "detailInfo.companyBasicDTO.companyId", width: 150 },
    { headerName: "公司编号\ncompanyNum", field: "detailInfo.companyBasicDTO.companyNum", width: 150 },
    { headerName: "境内外关系\ndomesticForeignRelationMeaning", field: "detailInfo.companyBasicDTO.domesticForeignRelationMeaning", width: 150 },
    { headerName: "注册国家\nregisteredCountryName", field: "detailInfo.companyBasicDTO.registeredCountryName", width: 150 },
    { 
      headerName: "地址数\ncompanyAddressDTOList", 
      valueGetter: (params: any) => {
        const list = params.data?.detailInfo?.companyAddressDTOList || [];
        return list.length;
      }, 
      width: 100 
    },
    { headerName: "经营范围\nbusinessScopeMeaning", field: "detailInfo.companyBasicDTO.businessScopeMeaning", width: 300, hide: true },
    { 
      headerName: "银行账户数\ncompanyBankAccountDTOList", 
      valueGetter: extractBanks, 
      width: 120
    },
    { 
      headerName: "联系人数\ncompanyContactDTOList", 
      valueGetter: extractContacts, 
      width: 120
    }
  ], []);

  const defaultColDef = useMemo(() => ({
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
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 8, padding: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <style>{`
        .tristan-center-header .ag-header-cell-label {
          justify-content: center !important;
          text-align: center !important;
        }
      `}</style>
      
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>iBOSS参与方</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Search 
            placeholder="全字段关键字过滤搜索..." 
            onSearch={onSearch} 
            enterButton 
            allowClear
            style={{ width: 350 }}
          />
          <Button type="primary" icon={<ExportOutlined />} loading={exporting} onClick={handleExportJson}>
            导出JSON
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin tip="加载庞大列表数据中..." size="large" />
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
          getRowId={(params) => params.data.companyBasicId || String(params.data._id || Math.random())}
        />
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0', borderTop: '1px solid #e8e8e8', marginTop: 12 }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            pageSizeOptions={['30', '100', '200', '500']}
            total={total}
            showSizeChanger
            showQuickJumper
            onChange={onPaginationChange}
            showTotal={(total) => `共 ${total} 条参与方记录`}
          />
        </div>
      )}

      <DetailDrawer 
        record={drawerRecord} 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
    </div>
  );
};

export default IBossParticipants;
