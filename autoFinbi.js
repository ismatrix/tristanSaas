// ==UserScript==
// @name         FineBI 数据抓取工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从 FineBI 平台抓取 Widget 数据并推送到本地 Dashboard
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
    const LOCAL_API = "http://127.0.0.1:3000/v1/finebi-data/bulk-upsert";

    // --- 默认查询参数 ---
    const DEFAULT_WIDGET_ID = "3d97c859360b41e0bdf57cb2beab491a";
    const DEFAULT_TEMPLATE_ID = "templateHelperId_1021aa8e66a540d6";
    const DEFAULT_TABLE_NAME = "07de22faf70c432c8680a9c370db4064";
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

    // --- 3. 构建 FineBI Widget 请求体 ---
    function buildPayload(opts = {}) {
        const tableName = opts.tableName || DEFAULT_TABLE_NAME;
        const widgetId = opts.widgetId || DEFAULT_WIDGET_ID;
        const subjectId = opts.subjectId || DEFAULT_SUBJECT_ID;
        const filterYear = opts.filterYear || "2026";
        const productFilter = opts.productFilter || ["IoT Application", "Private Network & Application"];

        // 字段 ID 映射表（Unicode 编码字段名）
        const F = {
            dataMonth:    `${tableName}_[6570][636e][6708][4efd]`,
            isIntlBiz:    `${tableName}_[662f][5426][56fd][9645][4e1a][52a1][6536][5165]`,
            ibossProduct: `${tableName}_iBOSS[4ea7][54c1][540d][79f0]`,
            newField:     `${tableName}_new`,
            circuitRef:   `${tableName}_[7535][8def][53c2][8003][7f16][53f7]`,
            finCustomer:  `${tableName}_[8d22][52a1][7cfb][7edf][5ba2][6237][6216][4f9b][5e94][5546][540d][79f0]`,
            endCustomer:  `${tableName}_[7ec8][7aef][5ba2][6237][540d][79f0]`,
            region:       `${tableName}_[5927][533a][7f16][7801]`,
            salesUnit:    `${tableName}_[9500][552e][5355][5143][7f16][7801]`,
            accountMgr:   `${tableName}_[5ba2][6237][7ecf][7406][540d][79f0]`,
            splitRatio:   `${tableName}_[5206][6210][6bd4][4f8b]`,
            dualFlag:     `${tableName}_[53cc][8ba1][53cc][8003][6807][8bc6]`
        };

        // 维度 ID 映射
        const D = {
            ibossProduct: "6062379a7e401072",
            circuitRef:   "1d101b4b5536cb31",
            finCustomer:  "60dc52a01d2f0c3a",
            dataMonth:    "570c415fa85a0e0a",
            accountMgr:   "4d120506802bda4b",
            region:       "bac03a46eb67e680",
            salesUnit:    "471a2a859015cdd8",
            endCustomer:  "d55488cf734997de",
            splitRatio:   "8aa935191dfcc2ee",
            dualFlag:     "367cd3c29a105ef5",
            newField:     "1bd1883a9ceb49c2",
            isIntlBiz:    "a29ada5ca9d14f2b",
            dataMonth2:   "d1157a68bdb7ec9a",
            ibossProduct2:"3d6d71e2166394c2"
        };

        // 构建 widgetMeasures
        const widgetMeasures = [
            {
                id: F.dataMonth,
                detailFilter: {
                    fieldId: F.dataMonth, filterLevel: 1, customFilterLevel: -1,
                    filterValue: filterYear, filterType: 5, usingFilterLevel: 1
                },
                group: {
                    group_11: { sort: { sortTarget: `${F.dataMonth}_11`, sortField: false, type: 1 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_22: { sort: { sortTarget: `${F.dataMonth}_11`, sortField: false, type: 1 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false },
                    group_23: { sort: { sortTarget: `${F.dataMonth}_11`, sortField: false, type: 1 }, repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false }
                },
                detailFilterUsedFieldIds: [F.dataMonth]
            },
            { id: F.isIntlBiz, group: {}, detailFilterUsedFieldIds: [] },
            {
                id: F.ibossProduct,
                detailFilter: {
                    fieldId: F.ibossProduct, filterLevel: 1, customFilterLevel: -1,
                    filterValue: { type: 1, assist: [], value: productFilter },
                    filterType: 1, usingFilterLevel: 1
                },
                group: {},
                detailFilterUsedFieldIds: [F.ibossProduct]
            },
            {
                id: F.newField,
                group: {
                    summary_3: {
                        cal: { cal_0: { repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false, displayName: "拆分后港币金额｜绝对值" } },
                        repeatCal: true, useDataBar: false, showMissingTime: false, depGroup: false
                    }
                }
            },
            { id: F.circuitRef, group: {}, detailFilterUsedFieldIds: [] }
        ];

        // 构建 dimensions 对象
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

        const dimensions = {};
        dimensions[D.ibossProduct]  = mkDim(D.ibossProduct, "iBOSS产品名称", F.ibossProduct);
        dimensions[D.circuitRef]    = mkDim(D.circuitRef, "电路参考编号", F.circuitRef);
        dimensions[D.finCustomer]   = mkDim(D.finCustomer, "财务系统客户或供应商名称", F.finCustomer);
        dimensions[D.dataMonth]     = mkDim(D.dataMonth, "数据月份", F.dataMonth);
        dimensions[D.accountMgr]    = mkDim(D.accountMgr, "客户经理名称", F.accountMgr);
        dimensions[D.region]        = mkDim(D.region, "大区编码", F.region);
        dimensions[D.salesUnit]     = mkDim(D.salesUnit, "销售单元编码", F.salesUnit);
        dimensions[D.endCustomer]   = mkDim(D.endCustomer, "终端客户名称", F.endCustomer);
        dimensions[D.splitRatio]    = mkDim(D.splitRatio, "分成比例", F.splitRatio, 2, 3, true);
        dimensions[D.dualFlag]      = mkDim(D.dualFlag, "双计双考标识", F.dualFlag);
        dimensions[D.newField]      = mkDim(D.newField, "new", F.newField, 2, 3, true);
        dimensions[D.isIntlBiz]     = mkDim(D.isIntlBiz, "是否国际业务收入", F.isIntlBiz);
        dimensions[D.dataMonth2]    = mkDim(D.dataMonth2, "数据月份", F.dataMonth);
        dimensions[D.ibossProduct2] = mkDim(D.ibossProduct2, "iBOSS产品名称", F.ibossProduct);

        // 构建 dimensionGroups
        const dimensionGroups = {};
        const dgMap = {
            [`${F.ibossProduct}_11`]:  [D.ibossProduct, D.ibossProduct2],
            [`${F.circuitRef}_11`]:    [D.circuitRef],
            [`${F.finCustomer}_11`]:   [D.finCustomer],
            [`${F.dataMonth}_11`]:     [D.dataMonth, D.dataMonth2],
            [`${F.accountMgr}_11`]:    [D.accountMgr],
            [`${F.region}_11`]:        [D.region],
            [`${F.salesUnit}_11`]:     [D.salesUnit],
            [`${F.endCustomer}_11`]:   [D.endCustomer],
            [`${F.splitRatio}_3_0`]:   [D.splitRatio],
            [`${F.dualFlag}_11`]:      [D.dualFlag],
            [`${F.newField}_3_0`]:     [D.newField],
            [`${F.isIntlBiz}_11`]:     [D.isIntlBiz]
        };
        for (const [g, ids] of Object.entries(dgMap)) {
            dimensionGroups[g] = { group: g, dimensionIds: ids };
        }

        // 构建 measures (API 级别)
        const measures = [
            { id: F.dataMonth, detailFilter: widgetMeasures[0].detailFilter, group: widgetMeasures[0].group, type: 16 },
            { id: F.isIntlBiz, group: {}, type: 16 },
            { id: F.ibossProduct, detailFilter: widgetMeasures[2].detailFilter, group: {}, type: 16 },
            { id: F.newField, group: widgetMeasures[3].group, type: 32 },
            { id: F.circuitRef, group: {}, type: 16 }
        ];

        // 构建 measureTables
        const measureTables = {};
        [F.dataMonth, F.isIntlBiz, F.ibossProduct, F.newField, F.circuitRef].forEach(id => {
            measureTables[id] = { id, tables: [tableName], engineType: "direct" };
        });

        // view 配置
        const viewIds = Object.keys(dimensions).filter(k => k !== D.dataMonth2 && k !== D.ibossProduct2);

        const sessionId = `e07b27af-0eaa-4ec9-a2c6-e0f8afa02104_${Date.now().toString(36)}`;

        return {
            chartType: "interval", type: 4, name: "Tristan-2026BR",
            timeStamp: Date.now(), tableName: [tableName], fields: [],
            widgetMeasures, injection: null, widgetModel: { type: 0 },
            settings: { nameStyleType: 1, titleHeight: 25, emptyDisplayValue: "default" },
            view: { "10000": viewIds, "20000": [], "30000": [] },
            viewAttr: {
                "10000": { type: 1, left: { reversed: false, log: false, sharedDomain: true }, right: { reversed: false, log: false, sharedDomain: true }, size: 0 },
                "20000": { type: 1, size: 0 },
                "30000": { type: 1, left: { reversed: false, log: false, sharedDomain: true }, right: { reversed: false, log: false, sharedDomain: true }, size: 0 }
            },
            dimensions, allData: true, drillOrder: [],
            resultFilter: [D.dataMonth2, D.ibossProduct2],
            dimensionGroups, legendFilter: null,
            columnSize: [], regionColumnSize: [], equallyDivideColumn: false,
            quickSettingClosed: false, uploadedImages: [], widgetParameters: [],
            explainConf: { fieldCombinationList: [[]] }, manualPreview: false,
            queryInfo: {
                mobile: false, bounds: { height: 0, left: 0, top: 0, width: 0 },
                previewCalLimit: 1, userId: "eb0025f0-cb8b-424f-82e0-ac3e1c2cc819",
                userName: "tristanwang", sessionId,
                subjectId, title: "Tristan-2026BR", widgetId, measureTables
            },
            preview: false, page: 1, yPage: 0, xPage: 0, realData: false,
            templateChartColorChange: false, detailSetting: false,
            tableWidth: 0, seqColWidth: 0, selectTable: "",
            sortSequence: [D.dataMonth], mobile: false, allowOverlap: false,
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

        // 构建 URL 参数
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
            "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
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

                        // 解析数据
                        const rows = data.data || data.result || data;
                        if (Array.isArray(rows)) {
                            console.log(`✅ [FineBI] 获取到 ${rows.length} 条数据`);
                        } else {
                            console.log('📊 [FineBI] 返回数据:', JSON.stringify(data).substring(0, 500));
                        }

                        // 推送到本地
                        await pushToLocal({ widgetId, timestamp: Date.now(), rawData: data }, "FineBI数据");
                        alert(`🎉 FineBI 数据获取成功！耗时: ${elapsed}ms`);
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
        b1.innerText = '📊 抓取FineBI数据';
        b1.style.cssText = btnStyle + 'background:linear-gradient(135deg,#667eea,#764ba2);';
        b1.onclick = () => runFinbiQuery();

        panel.appendChild(b1);
        (document.body || document.documentElement).appendChild(panel);
    };

    // 定时检测并注入 UI
    setInterval(injectUI, 2000);
})();
