// ==UserScript==
// @name         iBoss 自动化查询工具 (全能同步版)
// @namespace    http://tampermonkey.net/
// @version      3.8
// @description  完全对标 3.0 版本的请求头与负载字典，修复订单同步超时与挂起问题，并保留全量分页逻辑与实时监控。
// @author       Tristan
// @match        *://eip.cmitry.com/*
// @match        *://iboss.cmitry.com/*
// @match        *://bpm.cmitry.com/*
// @match        *://scm.cmitry.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ================= 配置区 =================
    const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxZmNmZTVlY2Q4NDg3Nzg5MmU4ZGUiLCJpYXQiOjE3NzY0MTgwNDYsImV4cCI6MjA5MjAzNzI0NiwidHlwZSI6ImFjY2VzcyJ9.5KdsXKEAiTC61dyINjTqDjUSgfG5eiOkKpaPxRZY2D0";
    const targetOrdersUrl = "http://127.0.0.1:3000/v1/orders/bulk-upsert";
    const targetDetailsUrl = "http://127.0.0.1:3000/v1/order-details/bulk-upsert";
    const targetCustomersUrl = "http://127.0.0.1:3000/v1/iboss-customers/bulk-upsert";
    const targetContractsUrl = "http://127.0.0.1:3000/v1/contracts/bulk-upsert";
    const targetContractDetailsUrl = "http://127.0.0.1:3000/v1/contract-details/bulk-upsert";


    // --- 1. Token 获取 ---
    function getCleanToken() {
        let rawToken = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!rawToken) return null;
        try {
            if (rawToken.startsWith('{')) return JSON.parse(rawToken).v;
        } catch (e) { }
        return rawToken.replace('Bearer ', '').trim();
    }

    // --- 2. 数据推送助手 ---
    const pushToDashboard = (url, name, data) => {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "POST", url: url,
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
                data: JSON.stringify(data),
                onload: () => resolve(),
                onerror: () => resolve()
            });
        });
    };

    // --- 3. 详情查询 (模拟 3.0 环境) ---
    window.runDetailQuery = function (handleId) {
        return new Promise((resolve, reject) => {
            const token = getCleanToken();
            const headers = {
                "accept": "application/json, text/plain, */*",
                "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
                "authorization": "Bearer " + token,
                "content-type": "application/json;charset=UTF-8",
                "priority": "u=1, i",
                "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "referer": `https://iboss.cmitry.com/mks/handle-new-product?showMenuHead=5&tabIndex=0&isDetail=1&handleId=${handleId}&userId=131024`
            };
            const payload = { "aid_language": "zh-CN", "mksHandleList": { "handleId": handleId.toString() }, "isPriceAuthority": true, "operation": "0" };

            const t0 = Date.now();
            GM_xmlhttpRequest({
                method: "POST", url: "https://iboss.cmitry.com/sa-mks/api/v2/handleConfiguration/stdQueryPlan",
                headers: headers, data: JSON.stringify(payload), withCredentials: true,
                onload: (res) => {
                    console.log(`⏱️ [API] 获取详情 ID: ${handleId} | 耗时: ${Date.now() - t0}ms`);
                    if (res.status === 200) resolve(JSON.parse(res.responseText));
                    else reject(res.status);
                },
                onerror: reject
            });
        });
    };

    // --- 4. 订单列表同步 (完全对标 3.0 Payload 与 Headers) ---
    const runQuery = function () {
        const token = getCleanToken();
        if (!token) { alert('❌ 未找到 Token'); return; }

        const headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
            "authorization": "Bearer " + token,
            "content-type": "application/json;charset=UTF-8",
            "origin": "https://iboss.cmitry.com",
            "priority": "u=1, i",
            "referer": "https://iboss.cmitry.com/mks/cmi-handle-query?mpType=2&menuId=1809212305&showMenuHead=8&mpId=null&acd=0&user=tristanwang&Sys=fs&code=cEIiXc&state=FD3049&userId=131024",
            "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
        };

        const payload = {
            "aid_language": "zh-CN",
            "formItem": { "site": "", "esopNo": "", "esopProdOrdNo": "", "esopOrderNo": "", "aid_language": "zh-CN", "input1": "", "select1": "", "customerName": "", "intentionId": "", "handleId": "", "intentionCode": "", "handleCode": "", "requireCode": "", "subProdOrdId": "", "prodOrdId": "", "handleType": "", "productId": "", "status": "", "statusIsNormal": "", "handleListStatus": "NORMAL", "createDateStart": "2026-01-01", "vpnId": "", "createDateEnd": "", "refNo": "", "aContact": "", "aContPhone": "", "aAddress": "", "aAddressDesc": "", "bContact": "", "bContPhone": "", "bAddress": "", "endCustomer": "", "createStaffName": "", "enterpriseName": "", "custId": "", "contractBelong": "", "custType": "", "isTimeout": "", "contractSigned": "", "supplierName": "", "supplierId": "", "orderType": "", "importantProject": "" },
            "pageNum": 1, "pageSize": 500, "handleRelFlag": "", "custManagerName": "", "bandWidth": "", "bandWidthUnit": "1", "detailAddress": "", "customerName": "", "createDateStart": "2026-01-01", "createDateEnd": "", "aContact": "", "bContact": "", "aContPhone": "", "bContPhone": "", "vpnId": "", "createStaffName": "", "custId": "", "isTimeout": "", "contractSigned": "",
            "multipleItem": { "productIdList": { "0": "6850200002", "1": "6850200003" }, "statusList": {}, "handleTypeList": { "0": "1" }, "contractBelongList": {} },
            "supplierName": "", "supplierId": "", "intentionId": "", "ccsRelHandleFlag": "0"
        };

        const t0 = Date.now();
        console.log('📡 正在请求 iBOSS 订单列表...');
        GM_xmlhttpRequest({
            method: "POST", url: "https://iboss.cmitry.com/sa-mks/api/v1/product/handle-list-query",
            headers: headers, data: JSON.stringify(payload), withCredentials: true,
            onload: async function (response) {
                console.log(`⏱️ [API] 订单列表返回 | 耗时: ${Date.now() - t0}ms | 状态: ${response.status}`);
                if (response.status === 200) {
                    const data = JSON.parse(response.responseText);
                    let orders = data.result?.result || [];
                    if (orders.length > 0) {
                        console.log(`📦 订单列表获取成功，共 ${orders.length} 条，电路编码的订单：${orders.filter(it => it.servNbr).length} 条`);
                        await pushToDashboard(targetOrdersUrl, "订单主表", orders);
                        for (const row of orders) {
                            if (row.servNbr) {
                                try {
                                    const dRes = await window.runDetailQuery(row.handleId);
                                    let body = dRes.result || dRes.data || [dRes];
                                    if (!Array.isArray(body)) body = [body];
                                    body.forEach(it => { if (!it.handleId) it.handleId = row.handleId; });
                                    await pushToDashboard(targetDetailsUrl, `详情[${row.handleId}]`, body);
                                } catch (e) { }
                            }
                        }
                        alert('🎉 订单同步完成！');
                    }
                } else alert(`同步失败: ${response.status}`);
            },
            onerror: () => alert('网络故障', response)
        });
    };

    // --- 4.1 全量客户同步 (保持分页引擎，但恢复 3.0 负载细节) ---
    const runCustomerQuery = async function () {
        const token = getCleanToken();
        const pageSize = 100;

        const fetchPage = (page) => {
            return new Promise((resolve, reject) => {
                const headers = {
                    "accept": "application/json, text/plain, */*",
                    "authorization": "Bearer " + token,
                    "content-type": "application/json;charset=UTF-8",
                    "origin": "https://iboss.cmitry.com",
                    "referer": "https://iboss.cmitry.com/cust/cus-query?showMenuHead=8&mpId=null&acd=0&user=tristanwang&Sys=fs&userId=131024"
                };
                const payload = {
                    "params": {
                        "dataManagerName": "", "customerType": "", "customerStatus": "", "voiceManagerName": "",
                        "mobileManagerName": "", "smsManagerName": "", "enterpriseName": "",
                        "pageNum": page, "pageSize": pageSize,
                        "busiType": "", "managerName": "", "salesUnit": "", "salesUnitId": "",
                        "custCode": "", "customerLabel": "", "ebsCustCode": "", "rightCustType": "none", "language": "zh-CN"
                    }
                };
                const t0 = Date.now();
                GM_xmlhttpRequest({
                    method: "POST", url: "https://iboss.cmitry.com/sa-cust/api/v1/custQuery/queryCustomerPage",
                    headers: headers, data: JSON.stringify(payload), withCredentials: true,
                    onload: (res) => {
                        console.log(`⏱️ [API] 客户查询 第 ${page} 页 | 耗时: ${Date.now() - t0}ms`);
                        res.status === 200 ? resolve(JSON.parse(res.responseText)) : reject(res.status);
                    },
                    onerror: reject
                });
            });
        };

        try {
            console.log('📡 正在请求 iBOSS 客户列表...');
            const first = await fetchPage(1);
            const total = first.result?.count || 0;
            const pages = Math.ceil(total / pageSize);
            console.log(`📊 共 ${total} 条客户，开始分页同步...`);
            for (let p = 1; p <= pages; p++) {
                const res = (p === 1) ? first : await fetchPage(p);
                const items = res.result?.result || [];
                if (items.length > 0) await pushToDashboard(targetCustomersUrl, "客户数据", items);
            }
            alert(`🎉 ${total} 条客户档案同步完成！`);
        } catch (e) { alert('同步中断'); }
    };

    // --- 4.2 合同详情查询 ---
    const runContractDetailQuery = function (projectCode, orderApprovalId, uuid) {
        return new Promise((resolve, reject) => {
            const token = getCleanToken();
            const headers = {
                "accept": "application/json, text/plain, */*",
                "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
                "authorization": "Bearer " + token,
                "content-type": "application/json",
                "origin": "https://iboss.cmitry.com",
                "priority": "u=1, i",
                "referer": `https://iboss.cmitry.com/mksimp/handle-contract?showMenuHead=5&fromType=contract&projectCode=${projectCode}&orderApprovalId=${orderApprovalId}&userId=131024`,
                "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
            };

            // 生成请求追踪ID
            const now = new Date();
            const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const traceId = `${ts}-${crypto.randomUUID()}`;

            const payload = {
                "requestTraceId": traceId,
                "pmHandleBusinessIdentity": {
                    "busiIdentityId": "cmi.iboss.crm.pagerouter/contractManagement_DICT_Approval/Web",
                    "pageMetaId": null,
                    "tenantId": "120",
                    "mainServiceCode": "/sa-mks/api/v6/stdOrderApproval/queryOrderApprovalDetail",
                    "orderApprovalId": orderApprovalId,
                    "uuid": uuid,
                    "aid_language": "zh-CN",
                    "projectCode": projectCode
                },
                "orderApprovalId": orderApprovalId,
                "uuid": uuid,
                "aid_language": "zh-CN",
                "affairId": "",
                "detailFlag": "1"
            };

            const t0 = Date.now();
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://iboss.cmitry.com/sa-mks/api/v6/stdOrderApproval/queryOrderApprovalDetail",
                headers: headers,
                data: JSON.stringify(payload),
                withCredentials: true,
                timeout: 30000,
                onload: (res) => {
                    console.log(`⏱️ [API] 合同详情 UUID: ${uuid} | 耗时: ${Date.now() - t0}ms`);
                    if (res.status === 200) resolve(JSON.parse(res.responseText));
                    else reject(res.status);
                },
                onerror: reject,
                ontimeout: () => reject('timeout')
            });
        });
    };

    // --- 4.3 合同列表同步 (分页引擎) ---
    const runContractQuery = async function () {
        const token = getCleanToken();
        if (!token) { alert('❌ 未找到 Token'); return; }
        const pageSize = 100;

        // 分页请求封装
        const fetchContractPage = (pageNum) => {
            return new Promise((resolve, reject) => {
                const headers = {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
                    "authorization": "Bearer " + token,
                    "content-type": "application/json;charset=UTF-8",
                    "origin": "https://iboss.cmitry.com",
                    "priority": "u=1, i",
                    "referer": "https://iboss.cmitry.com/mks/cmi-order-approval-query?isDICT=1&showMenuHead=8&mpId=null&acd=0&user=tristanwang&Sys=fs&userId=131024",
                    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
                };

                const payload = {
                    "lang": "zh-CN",
                    "circuitId": "",
                    "customerName": "",
                    "orderOwner": "",
                    "creator": "",
                    "handleCode": "",
                    "status": "",
                    "contractSubject": "",
                    "productType": "",
                    "contractNo": "",
                    "contractName": "",
                    "createTimeStart": "2026-01-01",
                    "createTimeEnd": "2027-01-01",
                    "projectCode": "",
                    "projectName": "",
                    "page": { "total": 0, "pageSize": pageSize, "pageNum": pageNum, "current": pageNum },
                    "requireCode": "",
                    "queryType": "",
                    "fromType": "20",
                    "includeCancel": "0"
                };

                const t0 = Date.now();
                GM_xmlhttpRequest({
                    method: "POST",
                    url: "https://iboss.cmitry.com/sa-mks/api/v1/orderApproval/queryInquiryData",
                    headers: headers,
                    data: JSON.stringify(payload),
                    withCredentials: true,
                    timeout: 30000,
                    onload: (res) => {
                        console.log(`⏱️ [API] 合同列表 第 ${pageNum} 页 | 耗时: ${Date.now() - t0}ms`);
                        if (res.status === 200) resolve(JSON.parse(res.responseText));
                        else reject(res.status);
                    },
                    onerror: reject,
                    ontimeout: () => reject('timeout')
                });
            });
        };

        try {
            console.log('📡 正在请求 iBOSS 合同列表...');

            // 首页探测总数
            const first = await fetchContractPage(1);
            console.log('🔍 [DEBUG] 合同列表首页返回结构:', JSON.stringify(first.result ? { page: first.result.page, total: first.result.total, count: first.result.count, resultLen: first.result.result?.length } : first, null, 2));
            const total = first.result?.page?.total || first.result?.total || first.result?.count || first.result?.result?.length || 0;
            const pages = Math.max(1, Math.ceil(total / pageSize));
            console.log(`📊 共 ${total} 条合同，${pages} 页，开始分页同步...`);

            // 收集所有合同
            let allContracts = [];
            for (let p = 1; p <= pages; p++) {
                const res = (p === 1) ? first : await fetchContractPage(p);
                const items = res.result?.result || [];
                if (items.length > 0) {
                    await pushToDashboard(targetContractsUrl, `合同主表 第${p}页`, items);
                    allContracts = allContracts.concat(items);
                }
                console.log(`✅ 合同列表 ${p}/${pages} 页已入库 (${items.length} 条)`);
            }

            console.log(`📦 合同主表全部入库完成，共 ${allContracts.length} 条，开始获取详情...`);

            // 串行循环获取每条合同的详情（仅限包含指定产品代码的合同）
            const targetProducts = ['6850200002', '6850200003'];
            let detailCount = 0;
            let skippedCount = 0;
            for (let i = 0; i < allContracts.length; i++) {
                const row = allContracts[i];
                const projectCode = row.projectCode || '';
                const orderApprovalId = row.orderApprovalId || '';
                const uuid = row.uuid || '';
                const approvalProduct = String(row.approvalProduct || '');

                // 过滤：approvalProduct 必须包含 6850200002 或 6850200003
                if (!targetProducts.some(code => approvalProduct.includes(code))) {
                    skippedCount++;
                    continue;
                }

                if (!uuid) {
                    console.log(`⚠️ 第 ${i + 1}/${allContracts.length} 条缺少 uuid，跳过`);
                    continue;
                }

                try {
                    console.log(`📋 获取合同详情 ${i + 1}/${allContracts.length} | UUID: ${uuid}`);
                    const dRes = await runContractDetailQuery(projectCode, orderApprovalId, uuid);
                    let detailData = dRes.result?.result || dRes.result || dRes;

                    // 确保是数组
                    if (!Array.isArray(detailData)) detailData = [detailData];

                    // 确保每条详情都有 uuid
                    detailData.forEach(item => { if (!item.uuid) item.uuid = uuid; });

                    await pushToDashboard(targetContractDetailsUrl, `合同详情[${uuid}]`, detailData);
                    detailCount++;
                } catch (e) {
                    console.error(`❌ 合同详情获取失败 UUID: ${uuid}`, e);
                }
            }

            alert(`🎉 合同同步完成！共 ${allContracts.length} 条合同，${detailCount} 条详情已入库，${skippedCount} 条非目标产品已跳过`);
        } catch (e) {
            console.error('合同同步失败', e);
            alert('合同同步失败，请查看控制台');
        }
    };

    let scmToken = '';

    // --- 5. 同步参与方 (SCM 系统) ---
    const runParticipantQuery = async function () {
        if (!scmToken) {
            alert('未获取到 Token，请刷新页面并等待页面加载数据');
            return;
        }
        const token = scmToken;

        const headers = {
            "accept": "*/*",
            "accept-language": "und,zh-CN;q=0.9,zh;q=0.8,eo;q=0.7,en;q=0.6",
            "authorization": "Bearer " + token,
            "cache-control": "no-cache",
            "origin": "https://scm.cmitry.com",
            "pragma": "no-cache",
            "referer": "https://scm.cmitry.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "sec-fetch-storage-access": "active"
        };

        const targetParticipantsUrl = "http://127.0.0.1:3000/v1/wildcards/ibossParticipants/bulk-upsert";

        try {
            let page = 0;
            let totalPages = 1;
            let allCount = 0;

            while (page < totalPages) {
                console.log(`正在获取参与方 第 ${page + 1}/${totalPages} 页...`);
                const url = `https://scm.cmi.chinamobile.com:8443/spfm/v1/portal-company/listCompanySupplier?page=${page}&size=1000`;

                const res = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "GET", url: url, headers: headers,
                        onload: (r) => {
                            if (r.status === 200) resolve(JSON.parse(r.responseText));
                            else reject(`请求失败, 状态码: ${r.status}`);
                        },
                        onerror: reject
                    });
                });

                if (!res || !res.content) {
                    alert('获取参与方失败，可能Token已过期或返回格式错误');
                    break;
                }

                totalPages = res.totalPages || 1;
                const records = res.content || [];

                if (records.length > 0) {
                    await new Promise((resolve) => {
                        GM_xmlhttpRequest({
                            method: "POST", url: targetParticipantsUrl,
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminToken}` },
                            data: JSON.stringify({ records: records, primaryKey: "companyBasicId" }),
                            onload: () => resolve(),
                            onerror: () => resolve()
                        });
                    });
                    allCount += records.length;
                    console.log(`第 ${page + 1} 页入库成功，共 ${records.length} 条数据`);
                }
                page++;
            }
            alert(`🎉 参与方同步完成！共同步 ${allCount} 条数据。`);
        } catch (e) {
            console.error('参与方同步出错', e);
            alert('参与方同步失败，请查看控制台');
        }
    };

    // --- 6. UI 注入 (常规页面) ---
    const injectRegularUI = () => {
        if (document.getElementById('tristan-portal')) return;
        const token = getCleanToken();
        if (!token) return;

        const panel = document.createElement('div');
        panel.id = 'tristan-portal';
        panel.style.cssText = `position:fixed; top:20px; right:20px; z-index:2147483647; display:flex; flex-direction:column; gap:8px; align-items:flex-end;`;

        const btnStyle = `padding: 10px 14px; color:#fff; font-weight:bold; border:1px solid #555; border-radius:6px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.5); font-size:12px; white-space:nowrap;`;

        const b1 = document.createElement('button'); b1.innerText = '🚀 同步订单'; b1.style.cssText = btnStyle + 'background: #28a745;'; b1.onclick = runQuery;
        const b2 = document.createElement('button'); b2.innerText = '👥 同步客户'; b2.style.cssText = btnStyle + 'background: #e83e8c;'; b2.onclick = runCustomerQuery;
        const b3 = document.createElement('button'); b3.innerText = '🔍 同步方案'; b3.style.cssText = btnStyle + 'background: #007bff;';
        b3.onclick = async () => {
            const hId = prompt('ID:');
            if (hId) {
                try { const r = await window.runDetailQuery(hId); console.log(r); alert('看控制台'); } catch (e) { }
            }
        };
        const b4 = document.createElement('button'); b4.innerText = '📄 同步合同'; b4.style.cssText = btnStyle + 'background: #fd7e14;'; b4.onclick = runContractQuery;

        panel.appendChild(b1); panel.appendChild(b2); panel.appendChild(b3); panel.appendChild(b4);
        (document.body || document.documentElement).appendChild(panel);
    };

    // --- 7. UI 注入 (特定参与方页面) ---
    const injectParticipantUI = () => {
        if (document.getElementById('tristan-portal-participant')) return;

        const panel = document.createElement('div');
        panel.id = 'tristan-portal-participant';
        panel.style.cssText = `position:fixed; top:20px; right:20px; z-index:2147483647; display:flex; flex-direction:column; gap:8px; align-items:flex-end;`;

        const btnStyle = `padding: 10px 14px; color:#fff; font-weight:bold; border:1px solid #555; border-radius:6px; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.5); font-size:12px; white-space:nowrap;`;

        const b5 = document.createElement('button'); b5.innerText = '获取参与方'; b5.style.cssText = btnStyle + 'background: #6f42c1;'; b5.onclick = runParticipantQuery;

        panel.appendChild(b5);
        (document.body || document.documentElement).appendChild(panel);
    };

    // --- 8. 拦截与路由分发 ---
    const isParticipantPage = location.href.includes('eipid=756');

    if (isParticipantPage) {
        // 注入拦截器，捕获 xhr 和 fetch
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                const checkAuth = (url, auth) => {
                    if (url && typeof url === 'string' && url.includes('listCompanySupplier') && auth) {
                        window.postMessage({ type: 'SCM_TOKEN', token: auth }, '*');
                    }
                };

                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    let url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url);
                    let opts = args[1] || args[0] || {};
                    let auth = '';

                    if (opts.headers) {
                        if (opts.headers instanceof Headers) {
                            auth = opts.headers.get('authorization') || '';
                        } else if (typeof opts.headers.get === 'function') {
                            auth = opts.headers.get('authorization') || '';
                        } else {
                            for (let k in opts.headers) {
                                if (k.toLowerCase() === 'authorization') auth = opts.headers[k];
                            }
                        }
                    }
                    checkAuth(url, auth);
                    return originalFetch.apply(this, args);
                };

                const originalOpen = XMLHttpRequest.prototype.open;
                const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
                XMLHttpRequest.prototype.open = function(method, url) {
                    this._url = url;
                    return originalOpen.apply(this, arguments);
                };
                XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                    if (header.toLowerCase() === 'authorization') {
                        checkAuth(this._url, value);
                    }
                    return originalSetHeader.apply(this, arguments);
                };
            })();
        `;
        (document.head || document.documentElement).appendChild(script);
        script.remove();

        window.addEventListener('message', function (event) {
            if (event.data && event.data.type === 'SCM_TOKEN') {
                scmToken = event.data.token.replace(/bearer /i, '').trim();
                console.log('🎉 成功拦截到 SCM Token:', scmToken);
                injectParticipantUI();
            }
        });
    } else {
        // 其他常规页面
        setInterval(injectRegularUI, 2000);
    }
})();
