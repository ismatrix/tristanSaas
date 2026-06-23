// ==UserScript==
// @name         FineBI TCV 数据抓取工具
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  从 FineBI 平台抓取 TCV 数据并推送到本地 MongoDB 数据库中
// @author       Tristan
// @match        *://finebi.cmitry.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ================= 配置区 =================
    const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxZmNmZTVlY2Q4NDg3Nzg5MmU4ZGUiLCJpYXQiOjE3NzY0MTgwNDYsImV4cCI6MjA5MjAzNzI0NiwidHlwZSI6ImFjY2VzcyJ9.5KdsXKEAiTC61dyINjTqDjUSgfG5eiOkKpaPxRZY2D0";
    const FINEBI_BASE = "https://finebi.cmitry.com";
    const LOCAL_API = "http://127.0.0.1:3000/v1/wildcards/dmcTCV/bulk-upsert";

    // --- 默认 TCV 查询参数 ---
    const DEFAULT_WIDGET_ID = "c0f131a7756b4af0adb8724b6833fdb3";
    const DEFAULT_TEMPLATE_ID = "templateHelperId_07c87dddc450570e";
    const DEFAULT_TABLE_NAME = "99a7c34daf8249b7858637ee791d199a";
    const DEFAULT_SUBJECT_ID = "ada5e9a2abf541bc895f6923d70a816d";

    // --- 1. Token 获取 ---
    function getAuthToken() {
        // 从 Cookie 中获取 fine_auth_token
        const match = document.cookie.match(/fine_auth_token=([^;]+)/);
        return match ? match[1] : null;
    }

    function getSessionId() {
        const match = document.cookie.match(/JSESSIONID=([^;]+)/);
        return match ? match[1] : null;
    }

    // --- 2. 数据推送到本地 Dashboard ---
    const pushToLocal = (data, label) => {
        return new Promise((resolve) => {
            const t0 = Date.now();
            GM_xmlhttpRequest({
                method: "POST",
                url: LOCAL_API,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                data: JSON.stringify(data),
                onload: (res) => {
                    console.log(`⏱️ [推送] ${label} | 耗时: ${Date.now() - t0}ms | 状态: ${res.status}`);
                    resolve(res);
                },
                onerror: (err) => {
                    console.error(`❌ [推送] ${label} 失败`, err);
                    resolve(null);
                }
            });
        });
    };

    // --- 3. 构建 FineBI Widget 请求体 (TCV 数据专属) ---
    function buildPayload(opts = {}) {
        const mainTable = opts.tableName || DEFAULT_TABLE_NAME;
        const linkTable = "07de22faf70c432c8680a9c370db4064";
        const widgetId = opts.widgetId || DEFAULT_WIDGET_ID;
        const subjectId = opts.subjectId || DEFAULT_SUBJECT_ID;

        // 字段 ID 映射表（Unicode 编码字段名）
        const F = {
            // Table 07de... 关联字段
            link_dataMonth: `${linkTable}_[6570][636e][6708][4efd]`,
            link_isIntlBiz: `${linkTable}_[662f][5426][56fd][9645][4e1a][52a1][6536][5165]`,
            link_ibossProduct: `${linkTable}_iBOSS[4ea7][54c1][540d][79f0]`,
            link_newField: `${linkTable}_new`,
            link_circuitRef: `${linkTable}_[7535][8def][53c2][8003][7f16][53f7]`,

            // Table 99a7... 主表字段
            main_signDate: `${mainTable}_[5408][540c][7b7e][7f72][65e5][671f]`,
            main_circuitNbr: `${mainTable}_[7535][8def][7f16][53f7]`,
            main_tcvHkd: `${mainTable}_[7b7e][5355][91d1][989d]([6e2f][5e01])`,
            main_isIntlLabel: `${mainTable}_[662f][5426][56fd][9645][4e1a][52a1][6536][5165][6807][7b7e]`,
            main_salesUnit: `${mainTable}_[9500][552e][5355][5143][7f16][7801]`,
            main_custName: `${mainTable}_[7b7e][7ea6][5ba2][6237][540d][79f0]`,
            main_oneTimeFee: `${mainTable}_[4e00][6b21][6027][8d39][7528]`,
            main_oneTimeHkd: `${mainTable}_[4e00][6b21][6027][8d39][7528]([6e2f][5e01])`,
            main_periodFee: `${mainTable}_[5468][671f][6027][8d39][7528]`,
            main_exchangeRate: `${mainTable}_[6c47][7387]`,
            main_currency: `${mainTable}_[5408][540c][5e01][79cd]`,
            main_periodHkd: `${mainTable}_[5468][671f][6027][8d39][7528]([6e2f][5e01])`,
            main_billPeriod: `${mainTable}_[8ba1][8d39][5468][671f]`,
            main_regionCode: `${mainTable}_[5927][533a][7f16][7801]`,
            main_regionName: `${mainTable}_[5927][533a][4e2d][6587][540d][79f0]`,
            main_managerAcct: `${mainTable}_[5ba2][6237][7ecf][7406][8d26][53f7]`,
            main_custType: `${mainTable}_[5ba2][6237][7c7b][578b]`,
            main_custFeature: `${mainTable}_[5ba2][6237][7279][6027]`,
            main_signCustCode: `${mainTable}_[7b7e][7ea6][5ba2][6237][7f16][7801]`,
            main_signCustId: `${mainTable}_[7b7e][7ea6][5ba2][6237][6807][8bc6]`,
            main_signCustInd: `${mainTable}_[7b7e][7ea6][5ba2][6237][884c][4e1a]`,
            main_parentName: `${mainTable}_[4e0a][7ea7][4f01][4e1a][540d][79f0]`,
            main_marketProd: `${mainTable}_[5e02][573a][7ecf][5206][4ea7][54c1][5206][7c7b]`,
            main_salesUnitNm: `${mainTable}_[9500][552e][5355][5143][4e2d][6587][540d][79f0]`,
            main_endCustName: `${mainTable}_[7ec8][7aef][5ba2][6237][540d][79f0]`,
            main_tcvProdName: `${mainTable}_TCV[4ea7][54c1][540d][79f0]`,
            main_tcvOrderType: `${mainTable}_TCV[8ba2][5355][7c7b][578b]`,
            main_ibossProdTypeId: `${mainTable}_iBOSS[4ea7][54c1][7c7b][578b]ID`
        };

        // 维度 ID 映射表
        const D = {
            main_signDate: "8590643d204e79ba",
            main_signDate2: "1d54df01181da1ad",
            main_custName: "388ba72c2fafa181",
            main_salesUnit: "ac59ea80f3e5b33c",
            main_tcvHkd: "f4ee8ea4f2fd079b",
            main_circuitNbr: "919191d7918495fb",
            main_oneTimeFee: "2fcd7380dd39fd71",
            main_oneTimeHkd: "26db84cedf4bddf7",
            main_periodFee: "d399d8019b9a791a",
            main_exchangeRate: "a9b31da67b457be3",
            main_currency: "a5a93b18cf400a9c",
            main_periodHkd: "e3afb71907c547d2",
            main_billPeriod: "21977ba979e347f4",
            main_regionCode: "dd7ad3b4d0d7a52f",
            main_regionName: "87a8a10ced396997",
            main_managerAcct: "81e729fbd69c7f25",
            main_custType: "043483c918af1cb0",
            main_custFeature: "2529c1931fdbaf62",
            main_signCustCode: "d3746d1ff8baeeed",
            main_signCustId: "1e3e982cfeb6319b",
            main_signCustInd: "b40b95735ce0e129",
            main_parentName: "ac708c1e41d5902e",
            main_marketProd: "e86b8309df1f2443",
            main_isIntlLabel: "c4b0717ebae977e7",
            main_salesUnitNm: "00154957da0f137c",
            main_endCustName: "24c0e27430ebda4a",
            main_tcvProdName: "5ad9ebde1ace9fa8",
            main_tcvOrderType: "a2bde7c4e3fe259c",
            main_ibossProdTypeId: "1ff27cace9b80fc2"
        };

        // 构建 widgetMeasures 数组
        const widgetMeasures = [
            { id: F.link_dataMonth, group: {} },
            { id: F.link_isIntlBiz, group: {} },
            { id: F.link_ibossProduct, group: {} },
            { id: F.link_newField, group: {} },
            { id: F.link_circuitRef, group: {} },
            {
                id: F.main_signDate,
                detailFilter: {
                    fieldId: F.main_signDate, filterLevel: 1, customFilterLevel: -1,
                    filterValue: { value: { year: "2026", month: "4", day: "1" }, type: 1 },
                    filterType: 26, usingFilterLevel: 1
                },
                group: {
                    group_5: { sort: { sortTarget: `${F.main_signDate}_5`, sortField: false, type: 1 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false }
                },
                detailFilterUsedFieldIds: [F.main_signDate]
            },
            {
                id: F.main_circuitNbr,
                group: {
                    group_11: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_22: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_23: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false }
                },
                detailFilterUsedFieldIds: []
            },
            { id: F.main_tcvHkd, group: {}, detailFilterUsedFieldIds: [] },
            { id: F.main_isIntlLabel, group: {} },
            { id: F.main_salesUnit, group: {}, detailFilterUsedFieldIds: [] },
            { id: F.main_custName, group: {}, detailFilterUsedFieldIds: [] }
        ];

        // 构建 measures
        const measures = [
            { id: F.link_dataMonth, group: {}, type: 16 },
            { id: F.link_isIntlBiz, group: {}, type: 16 },
            { id: F.link_ibossProduct, group: {}, type: 16 },
            { id: F.link_newField, group: {}, type: 32 },
            { id: F.link_circuitRef, group: {}, type: 16 },
            {
                id: F.main_signDate,
                detailFilter: {
                    fieldId: F.main_signDate, filterLevel: 1, customFilterLevel: -1,
                    filterValue: { value: { year: "2026", month: "4", day: "1" }, type: 1 },
                    filterType: 26, usingFilterLevel: 1
                },
                group: {
                    group_5: { sort: { sortTarget: `${F.main_signDate}_5`, sortField: false, type: 1 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false }
                },
                type: 48
            },
            {
                id: F.main_circuitNbr,
                group: {
                    group_11: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_22: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_23: { sort: { sortTarget: `${F.main_circuitNbr}_11`, sortField: false, type: 3 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false }
                },
                type: 48
            },
            { id: F.main_tcvHkd, group: {}, type: 16 },
            { id: F.main_isIntlLabel, group: {}, type: 16 },
            { id: F.main_salesUnit, group: {}, type: 16 },
            { id: F.main_custName, group: {}, type: 16 }
        ];

        // 统一构建维度对象的辅助函数
        const mkDim = (id, name, fieldId, type = 1, groupType = 11, showSum = false) => ({
            name, type, notShowNull: false, id, fieldId, toCountType: 0,
            group: { type: groupType }, calculation: { type: 0, value: 0 }, filter: null,
            settings: {
                trendLine: [], cordon: [], categoryAxis: { title: { displayed: false, modified: false } },
                valueAxis: { reversed: false, log: false, sharedDomain: true }, annotate: [], size: 0,
                stack: false, formatStyle: 1, formatDecimal: -1, numLevel: 1, showType: 0,
                numSeparators: true, showHeaderPercent: false, showSum,
                tableShape: { shape: -1, color: "", filters: [] },
                tableColor: { color: "", backgroundColor: "", filters: [], applyToLine: false },
                unit: "", dateFormat: {}, flash: [], imageData: []
            },
            showMissingTime: false, metric: 0, counterDep: "TOTAL_ROWS", repeatCal: true,
            formatStyle: 0, formatDecimal: 0, numLevel: 0, numSeparators: false, used: true, drillDimensions: {}
        });

        // 组装 dimensions 映射对象
        const dimensions = {};
        dimensions[D.main_signDate] = mkDim(D.main_signDate, "合同签署日期", F.main_signDate, 1, 11);
        dimensions[D.main_signDate2] = mkDim(D.main_signDate2, "合同签署日期", F.main_signDate, 1, 11);
        dimensions[D.main_custName] = mkDim(D.main_custName, "签约客户名称", F.main_custName, 1, 11);
        dimensions[D.main_salesUnit] = mkDim(D.main_salesUnit, "销售单元编码", F.main_salesUnit, 1, 11);
        dimensions[D.main_tcvHkd] = mkDim(D.main_tcvHkd, "签单金额(港币)", F.main_tcvHkd, 2, 3, true);
        dimensions[D.main_circuitNbr] = mkDim(D.main_circuitNbr, "电路编号", F.main_circuitNbr, 1, 11);
        dimensions[D.main_oneTimeFee] = mkDim(D.main_oneTimeFee, "一次性费用", F.main_oneTimeFee, 2, 3, true);
        dimensions[D.main_oneTimeHkd] = mkDim(D.main_oneTimeHkd, "一次性费用(港币)", F.main_oneTimeHkd, 2, 3, true);
        dimensions[D.main_periodFee] = mkDim(D.main_periodFee, "周期性费用", F.main_periodFee, 2, 3, true);
        dimensions[D.main_exchangeRate] = mkDim(D.main_exchangeRate, "汇率", F.main_exchangeRate, 2, 3, true);
        dimensions[D.main_currency] = mkDim(D.main_currency, "合同币种", F.main_currency, 1, 11);
        dimensions[D.main_periodHkd] = mkDim(D.main_periodHkd, "周期性费用(港币)", F.main_periodHkd, 2, 3, true);
        dimensions[D.main_billPeriod] = mkDim(D.main_billPeriod, "计费周期", F.main_billPeriod, 1, 11);
        dimensions[D.main_regionCode] = mkDim(D.main_regionCode, "大区编码", F.main_regionCode, 1, 11);
        dimensions[D.main_regionName] = mkDim(D.main_regionName, "大区中文名称", F.main_regionName, 1, 11);
        dimensions[D.main_managerAcct] = mkDim(D.main_managerAcct, "客户经理账号", F.main_managerAcct, 1, 11);
        dimensions[D.main_custType] = mkDim(D.main_custType, "客户类型", F.main_custType, 1, 11);
        dimensions[D.main_custFeature] = mkDim(D.main_custFeature, "客户特性", F.main_custFeature, 1, 11);
        dimensions[D.main_signCustCode] = mkDim(D.main_signCustCode, "签约客户编码", F.main_signCustCode, 1, 11);
        dimensions[D.main_signCustId] = mkDim(D.main_signCustId, "签约客户标识", F.main_signCustId, 1, 11);
        dimensions[D.main_signCustInd] = mkDim(D.main_signCustInd, "签约客户行业", F.main_signCustInd, 1, 11);
        dimensions[D.main_parentName] = mkDim(D.main_parentName, "上级企业名称", F.main_parentName, 1, 11);
        dimensions[D.main_marketProd] = mkDim(D.main_marketProd, "市场经分产品分类", F.main_marketProd, 1, 11);
        dimensions[D.main_isIntlLabel] = mkDim(D.main_isIntlLabel, "是否国际业务收入标签", F.main_isIntlLabel, 1, 11);
        dimensions[D.main_salesUnitNm] = mkDim(D.main_salesUnitNm, "销售单元中文名称", F.main_salesUnitNm, 1, 11);
        dimensions[D.main_endCustName] = mkDim(D.main_endCustName, "终端客户名称", F.main_endCustName, 1, 11);
        dimensions[D.main_tcvProdName] = mkDim(D.main_tcvProdName, "TCV产品名称", F.main_tcvProdName, 1, 11);
        dimensions[D.main_tcvOrderType] = mkDim(D.main_tcvOrderType, "TCV订单类型", F.main_tcvOrderType, 1, 11);
        dimensions[D.main_ibossProdTypeId] = mkDim(D.main_ibossProdTypeId, "iBOSS产品类型ID", F.main_ibossProdTypeId, 1, 11);

        // 维度分组 mapping
        const dgMap = {
            [`${F.main_signDate}_5`]: [D.main_signDate, D.main_signDate2],
            [`${F.main_custName}_11`]: [D.main_custName],
            [`${F.main_salesUnit}_11`]: [D.main_salesUnit],
            [`${F.main_tcvHkd}_3_0`]: [D.main_tcvHkd],
            [`${F.main_circuitNbr}_11`]: [D.main_circuitNbr],
            [`${F.main_oneTimeFee}_3_0`]: [D.main_oneTimeFee],
            [`${F.main_oneTimeHkd}_3_0`]: [D.main_oneTimeHkd],
            [`${F.main_periodFee}_3_0`]: [D.main_periodFee],
            [`${F.main_exchangeRate}_3_0`]: [D.main_exchangeRate],
            [`${F.main_currency}_11`]: [D.main_currency],
            [`${F.main_periodHkd}_3_0`]: [D.main_periodHkd],
            [`${F.main_billPeriod}_11`]: [D.main_billPeriod],
            [`${F.main_regionCode}_11`]: [D.main_regionCode],
            [`${F.main_regionName}_11`]: [D.main_regionName],
            [`${F.main_managerAcct}_11`]: [D.main_managerAcct],
            [`${F.main_custType}_11`]: [D.main_custType],
            [`${F.main_custFeature}_11`]: [D.main_custFeature],
            [`${F.main_signCustCode}_11`]: [D.main_signCustCode],
            [`${F.main_signCustId}_11`]: [D.main_signCustId],
            [`${F.main_signCustInd}_11`]: [D.main_signCustInd],
            [`${F.main_parentName}_11`]: [D.main_parentName],
            [`${F.main_marketProd}_11`]: [D.main_marketProd],
            [`${F.main_isIntlLabel}_11`]: [D.main_isIntlLabel],
            [`${F.main_salesUnitNm}_11`]: [D.main_salesUnitNm],
            [`${F.main_endCustName}_11`]: [D.main_endCustName],
            [`${F.main_tcvProdName}_11`]: [D.main_tcvProdName],
            [`${F.main_tcvOrderType}_11`]: [D.main_tcvOrderType],
            [`${F.main_ibossProdTypeId}_11`]: [D.main_ibossProdTypeId]
        };
        const dimensionGroups = {};
        for (const [g, ids] of Object.entries(dgMap)) {
            dimensionGroups[g] = { group: g, dimensionIds: ids };
        }

        // 度量表配置
        const measureTables = {};
        [F.link_dataMonth, F.link_isIntlBiz, F.link_ibossProduct, F.link_newField, F.link_circuitRef].forEach(id => {
            measureTables[id] = { id, tables: [linkTable], engineType: "direct" };
        });
        [F.main_signDate, F.main_circuitNbr, F.main_tcvHkd, F.main_isIntlLabel, F.main_salesUnit, F.main_custName].forEach(id => {
            measureTables[id] = { id, tables: [mainTable], engineType: "direct" };
        });

        // 视口展示维度列表 (28个维度列)
        const viewIds = [
            D.main_circuitNbr, D.main_ibossProdTypeId, D.main_tcvProdName, D.main_tcvOrderType,
            D.main_marketProd, D.main_signDate2, D.main_signCustCode, D.main_signCustId,
            D.main_custName, D.main_endCustName, D.main_signCustInd, D.main_parentName,
            D.main_custType, D.main_custFeature, D.main_regionCode, D.main_regionName,
            D.main_salesUnit, D.main_salesUnitNm, D.main_managerAcct, D.main_tcvHkd,
            D.main_currency, D.main_exchangeRate, D.main_oneTimeFee, D.main_oneTimeHkd,
            D.main_billPeriod, D.main_periodFee, D.main_periodHkd, D.main_isIntlLabel
        ];

        const sessionId = `e07b27af-0eaa-4ec9-a2c6-e0f8afa02104_${Date.now().toString(36)}`;

        return {
            chartType: "interval", type: 4, name: "allTCV",
            timeStamp: Date.now(), tableName: [mainTable], fields: [],
            widgetMeasures, injection: null, widgetModel: { type: 0 },
            settings: { nameStyleType: 1, titleHeight: 25, emptyDisplayValue: "default" },
            view: { "10000": viewIds, "20000": [], "30000": [] },
            viewAttr: {
                "10000": { type: 1, left: { reversed: false, log: false, sharedDomain: true }, right: { reversed: false, log: false, sharedDomain: true }, size: 0 },
                "20000": { type: 1, size: 0 },
                "30000": { type: 1, left: { reversed: false, log: false, sharedDomain: true }, right: { reversed: false, log: false, sharedDomain: true }, size: 0 }
            },
            dimensions, allData: true, drillOrder: [],
            resultFilter: [D.main_signDate],
            dimensionGroups, legendFilter: null,
            columnSize: [], regionColumnSize: [], equallyDivideColumn: false,
            quickSettingClosed: false, uploadedImages: [], widgetParameters: [],
            explainConf: { fieldCombinationList: [[]] }, manualPreview: false,
            queryInfo: {
                mobile: false, bounds: { height: 0, left: 0, top: 0, width: 0 },
                previewCalLimit: 1, userId: "eb0025f0-cb8b-424f-82e0-ac3e1c2cc819",
                userName: "tristanwang", sessionId,
                subjectId, title: "allTCV", widgetId, measureTables
            },
            preview: false, page: 1, yPage: 0, xPage: 0, realData: false,
            templateChartColorChange: false, detailSetting: false,
            tableWidth: 0, seqColWidth: 0, selectTable: "",
            sortSequence: [D.main_signDate2, D.main_circuitNbr], mobile: false, allowOverlap: false,
            openJump: true, wId: widgetId, showTitle: true,
            measures, filter: { filterType: 34, filterValue: [] }, filterValues: []
        };
    }

    // --- 4. 主查询函数 ---
    const runFinbiQuery = function (opts = {}) {
        const token = getAuthToken();
        if (!token) { alert('❌ 未找到 FineBI Token，请先登录'); return; }

        const widgetId = opts.widgetId || DEFAULT_WIDGET_ID;
        const templateId = opts.templateId || DEFAULT_TEMPLATE_ID;

        // 构建 URL 参数，动态生成 taskId
        const taskId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const url = `${FINEBI_BASE}/webroot/decision/v5/cache/widget/data?widgetId=${widgetId}&templateId=${templateId}&entryType=0&engineType=1&showSectionError=true&taskId=${taskId}`;

        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
            "authorization": `Bearer ${token}`,
            "content-type": "application/json;charset=UTF-8",
            "fine-sw-tag": "traceWorkType=data",
            "origin": FINEBI_BASE,
            "referer": `${FINEBI_BASE}/webroot/decision/v5/conf/subject/page/edit/${DEFAULT_SUBJECT_ID}/widget/${widgetId}`,
            "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        };

        const payload = buildPayload(opts);
        const t0 = Date.now();
        console.log('📡 [FineBI] 正在请求 Widget 数据...');
        console.log('📋 [FineBI] 请求 URL:', url);

        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: headers,
            data: JSON.stringify(payload),
            withCredentials: true,
            timeout: 60000,
            onload: async function (response) {
                const elapsed = Date.now() - t0;
                console.log(`⏱️ [FineBI] Widget 数据返回 | 耗时: ${elapsed}ms | 状态: ${response.status}`);

                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('📦 [FineBI] 返回数据结构:', Object.keys(data));

                        const widgetData = data.data || data.result || data;
                        const header = widgetData.header || widgetData.headers || [];
                        const items = widgetData.items || [];

                        if (!Array.isArray(items) || items.length === 0) {
                            console.warn('⚠️ [FineBI] 未获取到任何数据项');
                            alert('⚠️ 未获取到任何数据，请检查仪表板状态');
                            return;
                        }

                        console.log(`✅ [FineBI] 成功抓取到 ${items.length} 行数据，开始解析格式...`);

                        // 转换每一行数据，使用 dId 标识符和 text 中文名分别作为字段名
                        const records = items.map(row => {
                            const record = {};
                            header.forEach((col, idx) => {
                                const cell = row[idx];
                                const val = (cell && cell.value !== undefined) ? cell.value : null;
                                if (col.dId) {
                                    record[col.dId] = val;
                                }
                                if (col.text) {
                                    record[col.text] = val;
                                }
                            });
                            return record;
                        });

                        console.log(`🚀 [FineBI] 数据解析完成。正在向本地 API 发送覆盖导入请求...`);

                        // 推送到本地 dmcTCV 数据库表，开启 clear 覆盖导入
                        const pushResult = await pushToLocal({
                            records: records,
                            clear: true
                        }, "dmcTCV 覆盖导入");

                        if (pushResult && pushResult.status === 200) {
                            alert(`🎉 FineBI TCV 数据抓取并覆盖导入成功！\n共导入 ${records.length} 条记录，总耗时: ${elapsed}ms`);
                        } else {
                            console.error('❌ 本地 API 推送失败:', pushResult);
                            alert(`❌ 数据导入失败！本地服务返回状态码: ${pushResult ? pushResult.status : '未知'}`);
                        }
                    } catch (e) {
                        console.error('❌ [FineBI] 解析返回数据失败:', e);
                        console.log('📝 [FineBI] 原始响应:', response.responseText.substring(0, 1000));
                        alert('数据解析失败，请查看控制台');
                    }
                } else {
                    console.error(`❌ [FineBI] 请求失败: ${response.status}`, response.responseText?.substring(0, 500));
                    alert(`FineBI 请求失败: ${response.status}`);
                }
            },
            onerror: (err) => {
                console.error('❌ [FineBI] 网络错误:', err);
                alert('FineBI 网络请求失败');
            },
            ontimeout: () => {
                console.error('❌ [FineBI] 请求超时 (60s)');
                alert('FineBI 请求超时');
            }
        });
    };

    // --- 5. UI 注入 ---
    const injectUI = () => {
        if (document.getElementById('finbi-portal')) return;
        const token = getAuthToken();
        if (!token) return;

        const panel = document.createElement('div');
        panel.id = 'finbi-portal';
        panel.style.cssText = `position:fixed; top:20px; right:20px; z-index:2147483647; display:flex; flex-direction:column; gap:8px; align-items:flex-end;`;

        const btnStyle = `padding:10px 14px; color:#fff; font-weight:bold; border:1px solid #555; border-radius:6px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.5); font-size:12px; white-space:nowrap;`;

        const b1 = document.createElement('button');
        b1.innerText = '获取TCV';
        b1.style.cssText = btnStyle + 'background:linear-gradient(135deg,#11998e,#38ef7d);';
        b1.onclick = () => runFinbiQuery();

        panel.appendChild(b1);
        (document.body || document.documentElement).appendChild(panel);
    };

    // 定时检测并注入 UI
    setInterval(injectUI, 2000);
})();
