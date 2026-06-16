import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Tabs, Button, message, Spin, Row, Col, Input } from 'antd';
import { request } from 'umi';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import JSZip from 'jszip';

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

const GroupSyncList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const leftGridRef = useRef<AgGridReact>(null);
  const [quickFilterText, setQuickFilterText] = useState('');

  const isExternalFilterPresent = React.useCallback(() => {
    return quickFilterText.trim() !== '';
  }, [quickFilterText]);

  const doesExternalFilterPass = React.useCallback((node: any) => {
    if (!quickFilterText.trim()) return true;
    const lowerText = quickFilterText.trim().toLowerCase();
    const data = node.data;
    if (!data) return false;
    return Object.keys(data).some((key) => {
      if (key.startsWith('_')) return false; // 排除内部 MongoDB 字段
      const val = data[key];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(lowerText);
    });
  }, [quickFilterText]);

  useEffect(() => {
    if (leftGridRef.current?.api) {
      leftGridRef.current.api.onFilterChanged();
    }
  }, [quickFilterText]);

  const sequenceRef = useRef(0);
  const [activeSeq, setActiveSeq] = useState('000');

  const getNextSeq = () => {
    const seq = sequenceRef.current;
    sequenceRef.current += 1;
    return String(seq).padStart(3, '0');
  };



  // Mappings
  const [mappingFamilyTree, setMappingFamilyTree] = useState<any[]>([]);
  const [mappingKeyContacts, setMappingKeyContacts] = useState<any[]>([]);
  const [mappingCMIContacts, setMappingCMIContacts] = useState<any[]>([]);
  const [mappingGIDCust, setMappingGIDCust] = useState<any[]>([]);
  const [enCnDict, setEnCnDict] = useState<Record<string, Record<string, string>>>({});

  // Tab Data for active customer
  const [tab1Data, setTab1Data] = useState<any[]>([]);
  const [tab2Data, setTab2Data] = useState<any[]>([]);
  const [tab3Data, setTab3Data] = useState<any[]>([]);
  const [tab4Data, setTab4Data] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const getMappedField = (mapping: any[], cmccName: string) => {
    const m = mapping.find((x: any) => x.cmccColumnName === cmccName);
    return m ? (m.cmiColumnName || m.columnName) : null;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const custRes = await request('/api/v1/wildcards/keycustomer', {
        method: 'GET',
        params: {
          options: JSON.stringify({ limit: 10000, sort: { nameCn: 1 } }),
        },
      });
      setCustomers(custRes.results || custRes.data?.results || []);

      const [map1Res, map2Res, map3Res, map4Res, enCnRes] = await Promise.all([
        request('/api/v1/wildcards/columnMappingFamilyTree', { params: { options: JSON.stringify({ limit: 1000 }) } }),
        request('/api/v1/wildcards/columnMappingKeyContacts', { params: { options: JSON.stringify({ limit: 1000 }) } }),
        request('/api/v1/wildcards/columnMappingCMIContacts', { params: { options: JSON.stringify({ limit: 1000 }) } }),
        request('/api/v1/wildcards/columnMappingGIDCust', { params: { options: JSON.stringify({ limit: 1000 }) } }),
        request('/api/v1/wildcards/keyEnCN', { params: { options: JSON.stringify({ limit: 5000 }) } })
      ]);
      setMappingFamilyTree(map1Res.results || map1Res.data?.results || []);
      setMappingKeyContacts(map2Res.results || map2Res.data?.results || []);
      setMappingCMIContacts(map3Res.results || map3Res.data?.results || []);
      setMappingGIDCust(map4Res.results || map4Res.data?.results || []);

      const enCnRecords = enCnRes.results || enCnRes.data?.results || [];
      const dict: Record<string, Record<string, string>> = {};
      enCnRecords.forEach((r: any) => {
        const col = String(r.column || '').trim();
        const enVal = String(r.en || '').trim();
        const cnVal = String(r.cn || '').trim();
        if (col && enVal) {
          if (!dict[col]) {
            dict[col] = {};
          }
          dict[col][enVal] = cnVal;
        }
      });
      setEnCnDict(dict);

    } catch (err) {
      console.error(err);
      message.error('初始化数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCustomer) {
      fetchTabData(activeCustomer);
    } else {
      setTab1Data([]); setTab2Data([]); setTab3Data([]); setTab4Data([]);
    }
  }, [activeCustomer]);

  const assignPidGid = (data: any[], pid: string) => {
    return data.map((r, i) => ({ ...r, LineNo: i + 1, PID: pid }));
  };

  const enrichTab4Data = async (t4Data: any[]) => {
    if (!t4Data || t4Data.length === 0) return t4Data;

    const extIds = t4Data.map((r: any) => r.extCustId).filter(Boolean);

    const custMap = new Map();
    if (extIds.length > 0) {
      try {
        const custRes = await request('/api/v1/wildcards/ibosscustomers', {
          params: { query: JSON.stringify({ custId: { $in: extIds } }), options: JSON.stringify({ limit: 10000 }) }
        });
        const custRecords = custRes.results || custRes.data?.results || [];
        custRecords.forEach((r: any) => custMap.set(String(r.custId), r));
      } catch (e) {
        console.error('Failed to fetch ibosscustomers', e);
      }
    }

    const mappingMap = new Map();
    if (extIds.length > 0) {
      try {
        const mapRes = await request('/api/v1/wildcards/excelParticipantCustMapping', {
          params: { query: JSON.stringify({ extCustId: { $in: extIds } }), options: JSON.stringify({ limit: 10000 }) }
        });
        const mapRecords = mapRes.results || mapRes.data?.results || [];
        mapRecords.forEach((r: any) => mappingMap.set(String(r.extCustId), r));
      } catch (e) {
        console.error('Failed to fetch excelParticipantCustMapping', e);
      }
    }

    return t4Data.map((r: any) => {
      let custId = r.extCustId || '';
      let companyId = '';
      let companyNum = '';
      let enterpriseId = '';
      let ebsCustCode = '';

      const extId = String(r.extCustId);

      // 从 ibosscustomers 获取通用基础数据
      if (custMap.has(extId)) {
        const match = custMap.get(extId);
        enterpriseId = match.enterpriseId || '';
        ebsCustCode = match.ebsCustCode || match.ebsCustomerCode || '';
        // 如果是纯 customer，其 companyNum 可能也在表中
        companyNum = match.companyNum || match.companyCode || '';
      }

      // 如果能在 excelParticipantCustMapping 映射表中找到，则覆盖 companyId 和 companyNum
      if (mappingMap.has(extId)) {
        const match = mappingMap.get(extId);
        companyId = match.companyId || '';
        companyNum = match.companyNum || match.companyCode || companyNum;
      }

      return {
        ...r,
        custId,
        companyId,
        companyNum,
        enterpriseId,
        ebsCustCode
      };
    });
  };

  const translateVal = (column: string, val: any) => {
    if (val === null || val === undefined) return '';
    const trimmed = String(val).trim();
    if (enCnDict[column] && enCnDict[column][trimmed]) {
      return enCnDict[column][trimmed];
    }
    return val;
  };

  const fetchTabData = async (customer: any) => {
    setTabLoading(true);
    try {
      setActiveSeq(getNextSeq());
      const gid = customer.GID;
      const pid = customer.PID;
      
      // Tab 1: keyGlobalFamilyTree
      const tab1Res = await request('/api/v1/wildcards/keyGlobalFamilyTree', {
        params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
      });
      let t1Data = tab1Res.results || tab1Res.data?.results || [];
      const indField = getMappedField(mappingFamilyTree, 'CMCC_INDUSTRY') || 'cmccIndustry';
      const regTypeField = getMappedField(mappingFamilyTree, 'REGST_NUMBER_TYPE') || 'registrationType';
      const entNatureField = getMappedField(mappingFamilyTree, 'ENTERPRISE_NATURE') || 'enterpriseNature';
      const mainBizField = getMappedField(mappingFamilyTree, 'MAIN_BUSINESS') || 'mainBusiness';

      t1Data = t1Data.map((r: any) => {
        const newRow = { ...r, [indField]: customer.industryGroupCode };
        if (regTypeField) newRow[regTypeField] = translateVal(regTypeField, r[regTypeField]);
        if (entNatureField) newRow[entNatureField] = translateVal(entNatureField, r[entNatureField]);
        if (mainBizField) newRow[mainBizField] = translateVal(mainBizField, r[mainBizField]);
        return newRow;
      });
      setTab1Data(assignPidGid(t1Data, pid));

      // Tab 2: custContacts
      const tab2Res = await request('/api/v1/wildcards/custContacts', {
        params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
      });
      let t2Data = tab2Res.results || tab2Res.data?.results || [];
      const titleField = getMappedField(mappingKeyContacts, 'KEY_CONTACT_TITLE') || 'title';
      const levelField = getMappedField(mappingKeyContacts, 'KEY_CONTACT_LEVEL') || 'level';
      const customLevelField = getMappedField(mappingKeyContacts, 'USER_DEFINED_LEVEL') || 'customLevel';
      t2Data = t2Data.map((r: any) => {
        const finalTitle = r[titleField] && String(r[titleField]).trim() ? String(r[titleField]).trim() : '其他';
        const finalLevel = r[levelField] && String(r[levelField]).trim() ? String(r[levelField]).trim() : '其他';
        const finalCustomLevel = r[customLevelField] && String(r[customLevelField]).trim() ? String(r[customLevelField]).trim() : '';
        return {
          ...r,
          [titleField]: finalTitle,
          KEY_CONTACT_TITLE: finalTitle,
          [levelField]: finalLevel,
          KEY_CONTACT_LEVEL: finalLevel,
          [customLevelField]: finalCustomLevel,
          USER_DEFINED_LEVEL: finalCustomLevel
        };
      });
      setTab2Data(assignPidGid(t2Data, pid));

      // Tab 3: cmiContacts via keyCMIContacts
      const keyCmiRes = await request('/api/v1/wildcards/keyCMIContacts', {
        params: { query: JSON.stringify({ GID: gid }), options: JSON.stringify({ limit: 10000 }) }
      });
      const keyCmiRecords = keyCmiRes.results || keyCmiRes.data?.results || [];
      const cmiIdToGidMap = new Map();
      keyCmiRecords.forEach((r: any) => {
        if (r.cmiContactId) {
          cmiIdToGidMap.set(String(r.cmiContactId), r.GID);
        }
      });
      
      let cmiData: any[] = [];
      if (cmiIdToGidMap.size > 0) {
        const allCmiRes = await request('/api/v1/wildcards/cmiContacts', {
          params: { query: JSON.stringify({}), options: JSON.stringify({ limit: 10000 }) }
        });
        const allCmiRecords = allCmiRes.results || allCmiRes.data?.results || [];
        cmiData = allCmiRecords
          .filter((r: any) => cmiIdToGidMap.has(String(r._id)))
          .map((r: any) => ({ ...r, GID: cmiIdToGidMap.get(String(r._id)) }));
      }
      setTab3Data(assignPidGid(cmiData, pid));

      // Tab 4: keyFamilyTreeCustMapping
      const tab4Res = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
        params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
      });
      let t4Data = tab4Res.results || tab4Res.data?.results || [];
      t4Data = await enrichTab4Data(t4Data);
      setTab4Data(assignPidGid(t4Data, pid));

    } catch (err) {
      console.error(err);
      message.error('获取关联数据失败');
    } finally {
      setTabLoading(false);
    }
  };

  const getColDefs = (mapping: any[]) => {
    const mappedCols = mapping
      .filter((m: any) => m.cmccColumnName && String(m.cmccColumnName).trim() !== '')
      .map((m: any) => ({
        headerName: String(m.cmccColumnName).trim(),
        field: m.cmiColumnName === 'x' ? m.cmccColumnName : (m.cmiColumnName || m.columnName),
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120
      }));

    return [
      { headerName: 'LineNo', field: 'LineNo', width: 80, sortable: true, filter: true, pinned: 'left' },
      { headerName: 'PID', field: 'PID', width: 180, sortable: true, filter: true, pinned: 'left' },
      { headerName: 'GID', field: 'GID', width: 180, sortable: true, filter: true, pinned: 'left' },
      ...mappedCols.filter((c: any) => c.field !== 'PID' && c.field !== 'GID' && c.field !== 'LineNo')
    ];
  };

  const colDefs1 = useMemo(() => getColDefs(mappingFamilyTree), [mappingFamilyTree]);
  const colDefs2 = useMemo(() => getColDefs(mappingKeyContacts), [mappingKeyContacts]);
  const colDefs3 = useMemo(() => getColDefs(mappingCMIContacts), [mappingCMIContacts]);
  const colDefs4 = useMemo(() => getColDefs(mappingGIDCust), [mappingGIDCust]);

  const leftColDefs = useMemo(() => [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 50, pinned: 'left' as const },
    { field: 'nameCn', headerName: '公司名称', flex: 1, filter: true }
  ], []);

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data: any[], colDefs: any[]) => {
    const headers = colDefs.map((c: any) => c.headerName);
    const fields = colDefs.map((c: any) => c.field);

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '';
      const stringified = String(str);
      if (stringified.includes('"') || stringified.includes(',') || stringified.includes('\n') || stringified.includes('\r')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    let csv = headers.map(escapeCsv).join('€€') + '\n';
    
    for (const row of data) {
      const rowArr = fields.map(field => escapeCsv(row[field]));
      csv += rowArr.join('€€') + '\n';
    }
    
    return csv;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleExportCSV = async () => {
    const selectedNodes = leftGridRef.current?.api?.getSelectedNodes() || [];
    const selectedCustomers = selectedNodes.map((node: any) => node.data);

    if (selectedCustomers.length === 0) {
      message.warning('请至少在左侧列表中勾选一项要客');
      return;
    }
    
    message.loading({ content: '正在打包导出CSV...', key: 'exporting' });
    
    const zip = new JSZip();
    let successCount = 0;
    const timeStr = dayjs().format('YYYYMMDD');

    for (const customer of selectedCustomers) {
      const gid = customer.GID;
      const pid = customer.PID || 'UnknownPID';
      const seqStr = getNextSeq();
      const filePrefix = `${pid}_Global`;

      try {
        const tab1Res = await request('/api/v1/wildcards/keyGlobalFamilyTree', {
          params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
        });
        let t1DataRaw = tab1Res.results || tab1Res.data?.results || [];
        const indField = getMappedField(mappingFamilyTree, 'CMCC_INDUSTRY') || 'cmccIndustry';
        const regTypeField = getMappedField(mappingFamilyTree, 'REGST_NUMBER_TYPE') || 'registrationType';
        const entNatureField = getMappedField(mappingFamilyTree, 'ENTERPRISE_NATURE') || 'enterpriseNature';
        const mainBizField = getMappedField(mappingFamilyTree, 'MAIN_BUSINESS') || 'mainBusiness';

        t1DataRaw = t1DataRaw.map((r: any) => {
          const newRow = { ...r, [indField]: customer.industryGroupCode };
          if (regTypeField) newRow[regTypeField] = translateVal(regTypeField, r[regTypeField]);
          if (entNatureField) newRow[entNatureField] = translateVal(entNatureField, r[entNatureField]);
          if (mainBizField) newRow[mainBizField] = translateVal(mainBizField, r[mainBizField]);
          return newRow;
        });
        const t1Data = assignPidGid(t1DataRaw, pid);
        const csv1 = generateCSV(t1Data, colDefs1);

        const tab2Res = await request('/api/v1/wildcards/custContacts', {
          params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
        });
        let t2DataRaw = tab2Res.results || tab2Res.data?.results || [];
        const titleField = getMappedField(mappingKeyContacts, 'KEY_CONTACT_TITLE') || 'title';
        const levelField = getMappedField(mappingKeyContacts, 'KEY_CONTACT_LEVEL') || 'level';
        const customLevelField = getMappedField(mappingKeyContacts, 'USER_DEFINED_LEVEL') || 'customLevel';
        t2DataRaw = t2DataRaw.map((r: any) => {
          const finalTitle = r[titleField] && String(r[titleField]).trim() ? String(r[titleField]).trim() : '其他';
          const finalLevel = r[levelField] && String(r[levelField]).trim() ? String(r[levelField]).trim() : '其他';
          const finalCustomLevel = r[customLevelField] && String(r[customLevelField]).trim() ? String(r[customLevelField]).trim() : '';
          return {
            ...r,
            [titleField]: finalTitle,
            KEY_CONTACT_TITLE: finalTitle,
            [levelField]: finalLevel,
            KEY_CONTACT_LEVEL: finalLevel,
            [customLevelField]: finalCustomLevel,
            USER_DEFINED_LEVEL: finalCustomLevel
          };
        });
        const t2Data = assignPidGid(t2DataRaw, pid);
        const csv2 = generateCSV(t2Data, colDefs2);

        const keyCmiRes = await request('/api/v1/wildcards/keyCMIContacts', {
          params: { query: JSON.stringify({ GID: gid }), options: JSON.stringify({ limit: 10000 }) }
        });
        const keyCmiRecords = keyCmiRes.results || keyCmiRes.data?.results || [];
        const cmiIdToGidMap = new Map();
        keyCmiRecords.forEach((r: any) => {
          if (r.cmiContactId) {
            cmiIdToGidMap.set(String(r.cmiContactId), r.GID);
          }
        });
        
        let t3Data: any[] = [];
        if (cmiIdToGidMap.size > 0) {
          const allCmiRes = await request('/api/v1/wildcards/cmiContacts', {
            params: { query: JSON.stringify({}), options: JSON.stringify({ limit: 10000 }) }
          });
          const allCmiRecords = allCmiRes.results || allCmiRes.data?.results || [];
          t3Data = allCmiRecords
            .filter((r: any) => cmiIdToGidMap.has(String(r._id)))
            .map((r: any) => ({ ...r, GID: cmiIdToGidMap.get(String(r._id)) }));
        }
        t3Data = assignPidGid(t3Data, pid);
        const csv3 = generateCSV(t3Data, colDefs3);

        const tab4Res = await request('/api/v1/wildcards/keyFamilyTreeCustMapping', {
          params: { query: JSON.stringify({ ultimateGID: gid }), options: JSON.stringify({ limit: 10000 }) }
        });
        let t4DataRaw = tab4Res.results || tab4Res.data?.results || [];
        t4DataRaw = await enrichTab4Data(t4DataRaw);
        const t4Data = assignPidGid(t4DataRaw, pid);
        const csv4 = generateCSV(t4Data, colDefs4);

        // 写入 zip 中以 pid 命名的文件夹里
        const pidFolder = zip.folder(pid);
        if (pidFolder) {
          pidFolder.file(`${filePrefix}BasicInfo_${timeStr}_${seqStr}.csv`, '\uFEFF' + csv1);
          pidFolder.file(`${filePrefix}ContactInfo_${timeStr}_${seqStr}.csv`, '\uFEFF' + csv2);
          pidFolder.file(`${filePrefix}AMInfo_${timeStr}_${seqStr}.csv`, '\uFEFF' + csv3);
          pidFolder.file(`${filePrefix}GIDCust_${timeStr}_${seqStr}.csv`, '\uFEFF' + csv4);
        }
        
        successCount++;
        await delay(100);

      } catch (e) {
        console.error('Export error for customer', customer, e);
        message.error(`导出 ${customer.nameCn} 时出错`);
      }
    }
    
    if (successCount > 0) {
      try {
        const zipFilename = `cmccKeyCustomerFamilyTree_${dayjs().format('YYYYMMDDHHmmss')}_${successCount}.zip`;
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', zipFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        message.success({ content: `成功导出 ${successCount} 家要客数据包`, key: 'exporting' });
      } catch (err) {
        console.error('Failed to generate zip file', err);
        message.error({ content: '生成 ZIP 压缩包失败', key: 'exporting' });
      }
    } else {
      message.error({ content: '所有要客导出均失败，未生成压缩包', key: 'exporting' });
    }
  };

  const getTabTitle = (prefix: string) => {
    if (!activeCustomer) return prefix;
    const pid = activeCustomer.PID || 'UnknownPID';
    const timeStr = dayjs().format('YYYYMMDD');
    return `${pid}_Global${prefix}_${timeStr}_${activeSeq}.csv`;
  };

  const onRowClicked = (e: any) => {
    setActiveCustomer(e.data);
  };

  return (
    <PageContainer title="集团同步清单" style={{ height: '100%' }}>
      <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <Row style={{ flex: 1, minHeight: 0, height: '100%' }}>
          {/* 左侧 1/6 */}
          <Col span={4} style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>要客清单</span>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCSV}>导出</Button>
              </div>
              <Input
                placeholder="搜索公司..."
                prefix={<SearchOutlined />}
                allowClear
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <AgGridReact
                ref={leftGridRef}
                theme={themeQuartz}
                rowData={customers}
                isExternalFilterPresent={isExternalFilterPresent}
                doesExternalFilterPass={doesExternalFilterPass}
                getRowId={(params: any) => String(params.data.GID || params.data.PID || params.data._id || params.data.nameCn)}
                columnDefs={leftColDefs}
                rowSelection="multiple"
                onRowClicked={onRowClicked}
                suppressRowClickSelection={true}
                defaultColDef={{ resizable: true }}
              />
            </div>
          </Col>

          {/* 右侧 5/6 */}
          <Col span={20} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!activeCustomer ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
                请在左侧点击选择一家企业以查看数据
              </div>
            ) : (
              <Spin spinning={tabLoading} wrapperClassName="flex-spin-wrapper">
                <Tabs
                  defaultActiveKey="1"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  items={[
                    {
                      key: '1',
                      label: getTabTitle('BasicInfo'),
                      children: (
                        <div style={{ height: 'calc(100vh - 210px)' }}>
                          <AgGridReact theme={themeQuartz} rowData={tab1Data} columnDefs={colDefs1} defaultColDef={{ sortable: true, filter: true, resizable: true }} />
                        </div>
                      )
                    },
                    {
                      key: '2',
                      label: getTabTitle('ContactInfo'),
                      children: (
                        <div style={{ height: 'calc(100vh - 210px)' }}>
                          <AgGridReact theme={themeQuartz} rowData={tab2Data} columnDefs={colDefs2} defaultColDef={{ sortable: true, filter: true, resizable: true }} />
                        </div>
                      )
                    },
                    {
                      key: '3',
                      label: getTabTitle('AMInfo'),
                      children: (
                        <div style={{ height: 'calc(100vh - 210px)' }}>
                          <AgGridReact theme={themeQuartz} rowData={tab3Data} columnDefs={colDefs3} defaultColDef={{ sortable: true, filter: true, resizable: true }} />
                        </div>
                      )
                    },
                    {
                      key: '4',
                      label: getTabTitle('GIDCust'),
                      children: (
                        <div style={{ height: 'calc(100vh - 210px)' }}>
                          <AgGridReact theme={themeQuartz} rowData={tab4Data} columnDefs={colDefs4} defaultColDef={{ sortable: true, filter: true, resizable: true }} />
                        </div>
                      )
                    }
                  ]}
                />
              </Spin>
            )}
          </Col>
        </Row>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .flex-spin-wrapper { height: 100%; display: flex; flex-direction: column; }
        .flex-spin-wrapper .ant-spin-container { height: 100%; display: flex; flex-direction: column; }
        .flex-spin-wrapper .ant-tabs { height: 100%; display: flex; flex-direction: column; }
        .flex-spin-wrapper .ant-tabs-content { flex: 1; min-height: 0; }
        .flex-spin-wrapper .ant-tabs-tabpane { height: 100%; }
      `}} />
    </PageContainer>
  );
};

export default GroupSyncList;
