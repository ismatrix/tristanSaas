// ==UserScript==
// @name         FineBI TCV 数据抓取工具
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  拦截 FineBI TCV Widget 响应，支持分页循环获取、复合字段 upsert、双日期区间筛选、每页行数定制
// @author       Tristan
// @match        *://finebi.cmitry.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ================= 配置区 =================
    // 本地 API 认证 Token
    const ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxZmNmZTVlY2Q4NDg3Nzg5MmU4ZGUiLCJpYXQiOjE3NzY0MTgwNDYsImV4cCI6MjA5MjAzNzI0NiwidHlwZSI6ImFjY2VzcyJ9.5KdsXKEAiTC61dyINjTqDjUSgfG5eiOkKpaPxRZY2D0";

    // TCV 配置
    const LOCAL_API = "http://127.0.0.1:3000/v1/wildcards/dmcTCV/bulk-upsert";
    const TARGET_WIDGET_ID = "c0f131a7756b4af0adb8724b6833fdb3";
    const UPSERT_KEY = "电路编号,销售单元编码,客户经理账号,合同签署日期,签单金额(港币),订单状态";
    const CACHE_KEY_RESPONSE = 'finebi_tcv_response';
    const CACHE_KEY_TIME = 'finebi_tcv_response_time';
    const CACHE_KEY_COUNT = 'finebi_tcv_response_count';
    const CACHE_KEY_REQ_URL = 'finebi_tcv_request_url';
    const CACHE_KEY_REQ_HDR = 'finebi_tcv_request_headers';
    const CACHE_KEY_REQ_BODY = 'finebi_tcv_request_body';

    // BR 配置
    const BR_LOCAL_API = "http://127.0.0.1:3000/v1/wildcards/dmcBR/bulk-upsert";
    const BR_TARGET_WIDGET_ID = "948ff446345f4c28a0b7c38d31fc7477";
    const BR_UPSERT_KEY = "数据月份,电路参考编号,财务系统产品编码,销售单元编码,拆分后港币金额,服务开始日期,服务结束日期,票据编号,票据事务类型,票据行描述";
    const CACHE_KEY_BR_RESPONSE = 'finebi_br_response';
    const CACHE_KEY_BR_TIME = 'finebi_br_time';
    const CACHE_KEY_BR_COUNT = 'finebi_br_count';
    const CACHE_KEY_BR_REQ_URL = 'finebi_br_request_url';
    const CACHE_KEY_BR_REQ_HDR = 'finebi_br_request_headers';
    const CACHE_KEY_BR_REQ_BODY = 'finebi_br_request_body';

    // =========================================================
    // 核心策略（v3.1）：
    //   拦截 FineBI 页面自身的 Widget 数据响应（无 Session 问题）
    //   同时捕获请求 URL、Header、Body，以便分页时重放请求
    //   分页：解析响应中的 row/size 循环获取所有页数据
    //   只使用 text（中文名）作为字段 key，不存 dId
    //   upsert 按「电路编号 + 销售单元编码」复合主键匹配
    //   日期过滤：filterType 26（>=起始）和 filterType 25（<=结束）
    //   detailRowCounts 控制每页返回行数
    // =========================================================


    // --- 0. 注入响应拦截脚本（网页原生上下文，绕过油猴沙箱隔离）---
    const injectPageInterceptor = () => {
        const scriptId = 'finebi-interceptor-v40';
        if (document.getElementById(scriptId)) return;

        const script = document.createElement('script');
        script.id = scriptId;

        script.textContent = `
            (function () {
                'use strict';
                // TCV 配置
                const TARGET_WIDGET_ID = '${TARGET_WIDGET_ID}';
                const CACHE_KEY_RESPONSE = '${CACHE_KEY_RESPONSE}';
                const CACHE_KEY_TIME     = '${CACHE_KEY_TIME}';
                const CACHE_KEY_COUNT    = '${CACHE_KEY_COUNT}';
                const CACHE_KEY_REQ_URL  = '${CACHE_KEY_REQ_URL}';
                const CACHE_KEY_REQ_HDR  = '${CACHE_KEY_REQ_HDR}';
                const CACHE_KEY_REQ_BODY = '${CACHE_KEY_REQ_BODY}';

                // BR 配置
                const BR_TARGET_WIDGET_ID = '${BR_TARGET_WIDGET_ID}';
                const CACHE_KEY_BR_RESPONSE = '${CACHE_KEY_BR_RESPONSE}';
                const CACHE_KEY_BR_TIME     = '${CACHE_KEY_BR_TIME}';
                const CACHE_KEY_BR_COUNT    = '${CACHE_KEY_BR_COUNT}';
                const CACHE_KEY_BR_REQ_URL  = '${CACHE_KEY_BR_REQ_URL}';
                const CACHE_KEY_BR_REQ_HDR  = '${CACHE_KEY_BR_REQ_HDR}';
                const CACHE_KEY_BR_REQ_BODY = '${CACHE_KEY_BR_REQ_BODY}';

                console.log('%c⚡ [FineBI-Interceptor v4.0] 拦截器注入（document-start）', 'color:#38ef7d;font-weight:bold;');

                const save = (key, val) => {
                    try { sessionStorage.setItem(key, val); } catch(e) {}
                };

                const isWidgetUrl = (url) =>
                    url && typeof url === 'string' && url.includes('cache/widget/data');

                const isTcvUrl = (url) =>
                    isWidgetUrl(url) && url.includes('widgetId=' + TARGET_WIDGET_ID);

                const isBrUrl = (url) =>
                    isWidgetUrl(url) && url.includes('widgetId=' + BR_TARGET_WIDGET_ID);

                // 处理成功的响应：根据 Widget ID 分别缓存
                const handleResponse = (responseText, source, url, reqHeaders, reqBody) => {
                    try {
                        const resJson = JSON.parse(responseText);

                        // 打印所有 widget/data 响应（调试用）
                        if (isWidgetUrl(url)) {
                            const data = resJson.data || {};
                            const items = data.items || [];
                            const row = data.row !== undefined ? data.row : '?';
                            const size = data.size !== undefined ? data.size : '?';
                            console.log('[FineBI-' + source + '] Widget响应 | widgetId=' + (url.match(/widgetId=([^&]+)/)||[])[1] +
                                ' | success=' + resJson.success + ' | items=' + items.length +
                                ' | row=' + row + ' | size=' + size);
                        }

                        if (resJson.success === false) return;
                        const data = resJson.data || resJson;
                        const items = data.items || [];
                        if (!Array.isArray(items) || items.length === 0) return;

                        if (isTcvUrl(url)) {
                            // 缓存 TCV 第一页响应数据
                            save(CACHE_KEY_RESPONSE, responseText);
                            save(CACHE_KEY_TIME, new Date().toISOString());
                            save(CACHE_KEY_COUNT, String(data.row || items.length));

                            // 同时缓存请求信息（用于后续分页重放）
                            if (reqHeaders) save(CACHE_KEY_REQ_HDR, JSON.stringify(reqHeaders));
                            if (reqBody)    save(CACHE_KEY_REQ_BODY, reqBody);
                            save(CACHE_KEY_REQ_URL, url);

                            console.log('%c🎉 [FineBI-' + source + '] TCV 数据拦截成功！row=' + (data.row || items.length) +
                                ' size=' + (data.size || items.length), 'color:#38ef7d;font-weight:bold;');
                            window.dispatchEvent(new CustomEvent('finebi_tcv_data_ready', {
                                detail: { row: data.row || items.length, size: data.size || items.length }
                            }));
                        } else if (isBrUrl(url)) {
                            // 缓存 BR 第一页响应数据
                            save(CACHE_KEY_BR_RESPONSE, responseText);
                            save(CACHE_KEY_BR_TIME, new Date().toISOString());
                            save(CACHE_KEY_BR_COUNT, String(data.row || items.length));

                            // 同时缓存请求信息（用于后续分页重放）
                            if (reqHeaders) save(CACHE_KEY_BR_REQ_HDR, JSON.stringify(reqHeaders));
                            if (reqBody)    save(CACHE_KEY_BR_REQ_BODY, reqBody);
                            save(CACHE_KEY_BR_REQ_URL, url);

                            console.log('%c🎉 [FineBI-' + source + '] BR 数据拦截成功！row=' + (data.row || items.length) +
                                ' size=' + (data.size || items.length), 'color:#ff9900;font-weight:bold;');
                            window.dispatchEvent(new CustomEvent('finebi_br_data_ready', {
                                detail: { row: data.row || items.length, size: data.size || items.length }
                            }));
                        }
                    } catch(e) { /* 非 JSON 响应忽略 */ }
                };

                // ===== 拦截 XMLHttpRequest =====
                const originalOpen  = XMLHttpRequest.prototype.open;
                const originalSend  = XMLHttpRequest.prototype.send;
                const originalSetHdr = XMLHttpRequest.prototype.setRequestHeader;

                XMLHttpRequest.prototype.open = function (method, url) {
                    this._captured_url = url;
                    this._captured_headers = {};
                    return originalOpen.apply(this, arguments);
                };

                XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
                    if (this._captured_headers) this._captured_headers[header] = value;
                    return originalSetHdr.apply(this, arguments);
                };

                XMLHttpRequest.prototype.send = function (data) {
                    if (isWidgetUrl(this._captured_url)) {
                        const xhr = this;
                        const capturedUrl = this._captured_url;
                        const capturedHdr = Object.assign({}, this._captured_headers || {});
                        const capturedBody = (typeof data === 'string') ? data : null;
                        xhr.addEventListener('load', function () {
                            if (xhr.status === 200 && xhr.responseText) {
                                handleResponse(xhr.responseText, 'XHR', capturedUrl, capturedHdr, capturedBody);
                            }
                        });
                    }
                    return originalSend.apply(this, arguments);
                };

                // ===== 拦截 window.fetch =====
                const originalFetch = window.fetch;
                window.fetch = async function (resource, options) {
                    let url = '';
                    if (typeof resource === 'string') url = resource;
                    else if (resource && typeof resource.url === 'string') url = resource.url;

                    // 提取 fetch 请求头
                    let reqHeaders = {};
                    try {
                        const h = (options && options.headers) || {};
                        if (h instanceof Headers) {
                            h.forEach((v, k) => { reqHeaders[k] = v; });
                        } else {
                            Object.assign(reqHeaders, h);
                        }
                    } catch(e) {}

                    const reqBody = (options && typeof options.body === 'string') ? options.body : null;
                    const response = await originalFetch.apply(this, arguments);

                    if (isWidgetUrl(url)) {
                        try {
                            const cloned = response.clone();
                            cloned.text().then(text => {
                                if (text) handleResponse(text, 'Fetch', url, reqHeaders, reqBody);
                            }).catch(() => {});
                        } catch(e) {}
                    }

                    return response;
                };

                console.log('%c✅ [FineBI-Interceptor v4.0] XHR + Fetch 双通道拦截器就绪', 'color:#38ef7d;');
            })();
        `;
        (document.head || document.documentElement).appendChild(script);
    };

    // document-start 时尽早注入
    if (document.head || document.documentElement) {
        injectPageInterceptor();
    } else {
        const obs = new MutationObserver(() => {
            if (document.head || document.documentElement) {
                obs.disconnect();
                injectPageInterceptor();
            }
        });
        obs.observe(document, { childList: true, subtree: true });
    }

    // --- 1. 获取 FineBI Token（用于判断登录状态）---
    function getAuthToken() {
        const match = document.cookie.match(/fine_auth_token=([^;]+)/);
        return match ? match[1] : null;
    }

    // --- 2. 向 FineBI 发起分页数据请求（重放拦截到的请求，修改 page/detailRowCounts）---
    const fetchFinbiPage = (pageNum, reqUrl, reqHeaders, reqBodyStr) => {
        return new Promise((resolve) => {
            let payload;
            try {
                payload = JSON.parse(reqBodyStr);
                // 更新页码
                payload.page = pageNum;
                // 更新时间戳（避免服务端缓存）
                if (payload.queryInfo) {
                    payload.queryInfo.timeStamp = Date.now();
                }
            } catch (e) {
                console.error('❌ 解析请求体失败:', e);
                resolve(null);
                return;
            }

            GM_xmlhttpRequest({
                method: "POST",
                url: reqUrl,
                headers: Object.assign({}, reqHeaders, {
                    'content-type': 'application/json;charset=UTF-8'
                }),
                data: JSON.stringify(payload),
                withCredentials: true,
                timeout: 90000,
                onload: (res) => {
                    if (res.status === 200) {
                        try {
                            const resJson = JSON.parse(res.responseText);
                            if (resJson.success === false) {
                                console.error(`❌ 第 ${pageNum} 页请求失败:`, resJson.errorMsg);
                                resolve(null);
                            } else {
                                resolve(resJson);
                            }
                        } catch (e) {
                            resolve(null);
                        }
                    } else {
                        console.error(`❌ 第 ${pageNum} 页 HTTP 错误: ${res.status}`);
                        resolve(null);
                    }
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null)
            });
        });
    };

    // --- 3. 向本地 API 推送数据（支持 primaryKey）---
    const pushToLocal = (records, primaryKey, label, apiUrl = LOCAL_API) => {
        return new Promise((resolve) => {
            const t0 = Date.now();
            GM_xmlhttpRequest({
                method: "POST",
                url: apiUrl,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                data: JSON.stringify({ records, primaryKey, clear: false }),
                onload: (res) => {
                    console.log(`⏱️ [推送] ${label} | 耗时: ${Date.now() - t0}ms | 状态: ${res.status} | 响应: ${res.responseText.substring(0, 200)}`);
                    resolve(res);
                },
                onerror: (err) => {
                    console.error(`❌ [推送] ${label} 失败`, err);
                    resolve(null);
                }
            });
        });
    };

    // --- 3.5 删除本地特定条件的数据 ---
    const deleteLocalRecords = (query, label, apiUrl) => {
        return new Promise((resolve) => {
            const t0 = Date.now();
            const deleteUrl = apiUrl.replace(/\/bulk-upsert$/, '');
            GM_xmlhttpRequest({
                method: "DELETE",
                url: deleteUrl,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                data: JSON.stringify(query),
                onload: (res) => {
                    console.log(`⏱️ [删除] ${label} | 耗时: ${Date.now() - t0}ms | 状态: ${res.status} | 响应: ${res.responseText}`);
                    resolve(res);
                },
                onerror: (err) => {
                    console.error(`❌ [删除] ${label} 失败`, err);
                    resolve(null);
                }
            });
        });
    };

    // --- 4. 解析一页 FineBI Widget 响应为 records（只使用 text 中文名，不存 dId）---
    const parsePageRecords = (widgetData) => {
        const header = widgetData.header || widgetData.headers || [];
        const items = widgetData.items || [];
        const textFields = ["合同签署日期", "设置起租日期", "生成订单日期"];
        return items.map(row => {
            const record = {};
            header.forEach((col, idx) => {
                const cell = row[idx];
                if (col.text) {
                    if (textFields.includes(col.text)) {
                        record[col.text] = (cell && cell.text !== undefined) ? cell.text : ((cell && cell.value !== undefined) ? cell.value : null);
                    } else {
                        record[col.text] = (cell && cell.value !== undefined) ? cell.value : null;
                    }
                }
            });
            return record;
        });
    };

    // --- 5. 显示参数设置弹窗（双日期 + 每页记录数），返回用户选择的参数 ---
    const showSettingsDialog = (defaults, title = '📊 TCV 数据获取设置') => {
        return new Promise((resolve) => {
            const existing = document.getElementById('finbi-settings-modal');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'finbi-settings-modal';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.65); z-index: 2147483647;
                display: flex; align-items: center; justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;

            const now = new Date();
            // 默认起始日期（从 filterType:26 提取）
            const sY = (defaults && defaults.startDate) ? defaults.startDate.year : String(now.getFullYear());
            const sM = (defaults && defaults.startDate) ? defaults.startDate.month : '1';
            const sD = (defaults && defaults.startDate) ? defaults.startDate.day : '1';
            // 默认结束日期（从 filterType:25 提取）
            const eY = (defaults && defaults.endDate) ? defaults.endDate.year : String(now.getFullYear());
            const eM = (defaults && defaults.endDate) ? defaults.endDate.month : String(now.getMonth() + 1);
            const eD = (defaults && defaults.endDate) ? defaults.endDate.day : String(now.getDate());
            // 根据用户要求，条件框中每页记录数默认 10000
            const defaultPageSize = 10000;

            // 通用输入框样式
            const inputStyle = 'background:#0d0d1a; border:1px solid #38ef7d40; border-radius:6px; color:#e0e0e0; padding:8px 10px; font-size:13px; outline:none;';

            overlay.innerHTML = `
                <div style="
                    background: #1a1a2e; border: 1px solid #38ef7d40; border-radius: 12px;
                    padding: 28px 32px; width: 420px; color: #e0e0e0;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                ">
                    <h3 style="margin:0 0 20px; color:#38ef7d; font-size:16px; letter-spacing:0.5px;">
                        ${title}
                    </h3>

                    <div style="margin-bottom:14px;">
                        <label style="display:block; font-size:12px; color:#aaa; margin-bottom:6px;">
                            📅 起始日期（合同签署日期 ≥，对应 filterType:26）
                        </label>
                        <div style="display:flex; gap:8px;">
                            <input id="finbi-s-year" type="number" value="${sY}" min="2000" max="2099"
                                placeholder="年" style="flex:2; ${inputStyle}">
                            <input id="finbi-s-month" type="number" value="${sM}" min="1" max="12"
                                placeholder="月" style="flex:1; ${inputStyle}">
                            <input id="finbi-s-day" type="number" value="${sD}" min="1" max="31"
                                placeholder="日" style="flex:1; ${inputStyle}">
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <label style="display:block; font-size:12px; color:#aaa; margin-bottom:6px;">
                            📅 结束日期（合同签署日期 ≤，对应 filterType:25）
                        </label>
                        <div style="display:flex; gap:8px;">
                            <input id="finbi-e-year" type="number" value="${eY}" min="2000" max="2099"
                                placeholder="年" style="flex:2; ${inputStyle}">
                            <input id="finbi-e-month" type="number" value="${eM}" min="1" max="12"
                                placeholder="月" style="flex:1; ${inputStyle}">
                            <input id="finbi-e-day" type="number" value="${eD}" min="1" max="31"
                                placeholder="日" style="flex:1; ${inputStyle}">
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="display:block; font-size:12px; color:#aaa; margin-bottom:6px;">
                            📄 每页记录数（写入 detailRowCounts，默认 1000）
                        </label>
                        <input id="finbi-pagesize" type="number" value="${defaultPageSize}" min="100" max="10000"
                            style="width:100%; box-sizing:border-box; ${inputStyle}">
                        <div style="font-size:11px; color:#666; margin-top:4px;">
                            修改 payload 中 settings.tableStyle.detailRowCounts，建议 500~2000
                        </div>
                    </div>

                    <div id="finbi-dialog-status" style="
                        font-size:12px; color:#f39c12; margin-bottom:14px; min-height:18px;
                    "></div>

                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button id="finbi-cancel-btn" style="
                            padding:9px 20px; background:transparent; color:#aaa;
                            border:1px solid #555; border-radius:6px; cursor:pointer; font-size:13px;
                        ">取消</button>
                        <button id="finbi-confirm-btn" style="
                            padding:9px 20px; color:#000; font-weight:bold;
                            border:none; border-radius:6px; cursor:pointer; font-size:13px;
                            background:linear-gradient(135deg,#11998e,#38ef7d);
                        ">开始获取</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById('finbi-cancel-btn').onclick = () => {
                overlay.remove();
                resolve(null);
            };

            document.getElementById('finbi-confirm-btn').onclick = () => {
                const sYear = document.getElementById('finbi-s-year').value.trim();
                const sMonth = document.getElementById('finbi-s-month').value.trim();
                const sDay = document.getElementById('finbi-s-day').value.trim();
                const eYear = document.getElementById('finbi-e-year').value.trim();
                const eMonth = document.getElementById('finbi-e-month').value.trim();
                const eDay = document.getElementById('finbi-e-day').value.trim();
                const pageSize = parseInt(document.getElementById('finbi-pagesize').value.trim(), 10);
                const statusEl = document.getElementById('finbi-dialog-status');

                if (!sYear || !sMonth || !sDay || !eYear || !eMonth || !eDay) {
                    if (statusEl) statusEl.textContent = '⚠️ 请填写完整的起始和结束日期';
                    return;
                }
                if (isNaN(pageSize) || pageSize < 100) {
                    if (statusEl) statusEl.textContent = '⚠️ 每页记录数至少 100';
                    return;
                }

                overlay.remove();
                resolve({
                    startDate: { year: sYear, month: sMonth, day: sDay },
                    endDate: { year: eYear, month: eMonth, day: eDay },
                    pageSize
                });
            };
        });
    };

    // --- 6. 精确修改 payload（JSON解析方式）：起始日期、结束日期、detailRowCounts ---
    const applyPayloadParams = (bodyStr, startDate, endDate, pageSize) => {
        try {
            const payload = JSON.parse(bodyStr);

            // 修改每页行数（settings.tableStyle.detailRowCounts）
            if (payload.settings && payload.settings.tableStyle) {
                payload.settings.tableStyle.detailRowCounts = pageSize;
                console.log(`📋 [FineBI] detailRowCounts 已设置为: ${pageSize}`);
            }

            // 辅助：更新 detailFilter 中的日期（分别更新 filterType 26 和 25）
            const updateDetailFilter = (detailFilter) => {
                if (!detailFilter || !Array.isArray(detailFilter.filterValue)) return;
                detailFilter.filterValue.forEach(f => {
                    if (!f.filterValue || !f.filterValue.value) return;
                    if (f.filterType === 26) {
                        // >= 起始日期
                        f.filterValue.value.year = startDate.year;
                        f.filterValue.value.month = startDate.month;
                        f.filterValue.value.day = startDate.day;
                    } else if (f.filterType === 25) {
                        // <= 结束日期
                        f.filterValue.value.year = endDate.year;
                        f.filterValue.value.month = endDate.month;
                        f.filterValue.value.day = endDate.day;
                    }
                });
            };

            // 更新 widgetMeasures 中的 detailFilter
            if (Array.isArray(payload.widgetMeasures)) {
                payload.widgetMeasures.forEach(wm => {
                    if (wm.detailFilter) updateDetailFilter(wm.detailFilter);
                });
            }
            // 更新 measures 中的 detailFilter
            if (Array.isArray(payload.measures)) {
                payload.measures.forEach(m => {
                    if (m.detailFilter) updateDetailFilter(m.detailFilter);
                });
            }

            console.log(`📋 [FineBI] 日期已更新: 起始=${startDate.year}/${startDate.month}/${startDate.day} 结束=${endDate.year}/${endDate.month}/${endDate.day}`);

            // 突破 20000 条行数限制的通用调整
            const removeRowLimits = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                for (let k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        if (/limit|maxRow|maxRowCounts/i.test(k) && typeof obj[k] === 'number') {
                            console.log(`🔓 [FineBI] 发现并调整行数限制字段: ${k} = ${obj[k]} -> 200000`);
                            obj[k] = 200000;
                        }
                        if (typeof obj[k] === 'object') {
                            removeRowLimits(obj[k]);
                        }
                    }
                }
            };
            removeRowLimits(payload);

            return JSON.stringify(payload);
        } catch (e) {
            console.error('❌ applyPayloadParams 解析失败，使用原始 payload:', e);
            return bodyStr;
        }
    };

    // --- 6.1 精确修改 BR payload（JSON解析方式）：起始日期、结束日期、detailRowCounts ---
    const applyPayloadParamsBR = (bodyStr, startDate, endDate, pageSize) => {
        try {
            const payload = JSON.parse(bodyStr);

            // 修改每页行数（settings.tableStyle.detailRowCounts）与总行数限制（settings.tableStyle.totalRows）
            if (payload.settings && payload.settings.tableStyle) {
                payload.settings.tableStyle.detailRowCounts = pageSize;
                payload.settings.tableStyle.totalRows = 1234567;
                console.log(`📋 [FineBI-BR] detailRowCounts 已设置为: ${pageSize}, totalRows 已设置为: 1234567`);
            }

            // 辅助：更新 detailFilter 中的日期（分别更新 filterType 26 和 25）
            const updateDetailFilter = (detailFilter) => {
                if (!detailFilter || !Array.isArray(detailFilter.filterValue)) return;
                detailFilter.filterValue.forEach(f => {
                    if (!f.filterValue || !f.filterValue.value) return;
                    if (f.filterType === 26) {
                        // >= 起始日期
                        f.filterValue.value.year = startDate.year;
                        f.filterValue.value.month = startDate.month;
                        f.filterValue.value.day = startDate.day;
                    } else if (f.filterType === 25) {
                        // <= 结束日期
                        f.filterValue.value.year = endDate.year;
                        f.filterValue.value.month = endDate.month;
                        f.filterValue.value.day = endDate.day;
                    }
                });
            };

            // 更新 widgetMeasures 中的 detailFilter
            if (Array.isArray(payload.widgetMeasures)) {
                payload.widgetMeasures.forEach(wm => {
                    if (wm.detailFilter) updateDetailFilter(wm.detailFilter);
                });
            }
            // 更新 measures 中的 detailFilter
            if (Array.isArray(payload.measures)) {
                payload.measures.forEach(m => {
                    if (m.detailFilter) updateDetailFilter(m.detailFilter);
                });
            }

            console.log(`📋 [FineBI-BR] 日期已更新: 起始=${startDate.year}/${startDate.month}/${startDate.day} 结束=${endDate.year}/${endDate.month}/${endDate.day}`);

            // 突破限制的通用调整
            const removeRowLimits = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                for (let k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        if (/limit|maxRow|maxRowCounts|totalRows/i.test(k) && typeof obj[k] === 'number') {
                            console.log(`🔓 [FineBI-BR] 发现并调整行数限制字段: ${k} = ${obj[k]} -> 1234567`);
                            obj[k] = 1234567;
                        }
                        if (typeof obj[k] === 'object') {
                            removeRowLimits(obj[k]);
                        }
                    }
                }
            };
            removeRowLimits(payload);

            return JSON.stringify(payload);
        } catch (e) {
            console.error('❌ applyPayloadParamsBR 解析失败，使用原始 payload:', e);
            return bodyStr;
        }
    };

    // --- 6.5 按月拆分日期区间，用于突破 FineBI 20000 条的服务端强硬限制 ---
    const splitIntervalByMonth = (start, end) => {
        const sDate = new Date(parseInt(start.year), parseInt(start.month) - 1, parseInt(start.day));
        const eDate = new Date(parseInt(end.year), parseInt(end.month) - 1, parseInt(end.day));

        if (sDate > eDate) return [];

        const chunks = [];
        let currentStart = new Date(sDate);

        while (currentStart <= eDate) {
            const currentYear = currentStart.getFullYear();
            const currentMonth = currentStart.getMonth();
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

            let currentEnd;
            if (lastDayOfMonth >= eDate) {
                currentEnd = new Date(eDate);
            } else {
                currentEnd = lastDayOfMonth;
            }

            chunks.push({
                startDate: {
                    year: String(currentStart.getFullYear()),
                    month: String(currentStart.getMonth() + 1),
                    day: String(currentStart.getDate())
                },
                endDate: {
                    year: String(currentEnd.getFullYear()),
                    month: String(currentEnd.getMonth() + 1),
                    day: String(currentEnd.getDate())
                }
            });

            currentStart = new Date(currentYear, currentMonth + 1, 1);
        }
        return chunks;
    };

    // --- 7. 主流程：弹窗获取参数 → 分页循环拉取 → 推送入库 ---
    const runFinbiQuery = async () => {
        const cachedResponse = sessionStorage.getItem(CACHE_KEY_RESPONSE);
        const captureTime = sessionStorage.getItem(CACHE_KEY_TIME);
        const reqUrl = sessionStorage.getItem(CACHE_KEY_REQ_URL);
        const reqHeadersStr = sessionStorage.getItem(CACHE_KEY_REQ_HDR);
        const reqBodyStr = sessionStorage.getItem(CACHE_KEY_REQ_BODY);

        if (!cachedResponse) {
            alert(
                '⚠️ 尚未捕获到 TCV 数据！\n\n请按以下步骤操作：\n' +
                '1. 打开包含 TCV Widget 的 FineBI 报表页面\n' +
                '2. 等待 TCV 数据加载完成（右上角状态变为绿色"✅ 已就绪"）\n' +
                '3. 若页面已打开但未变绿，请按 F5 刷新页面重试\n' +
                '4. 再次点击"获取TCV"按钮'
            );
            return;
        }
        // 计算默认起始日期（上个月的1号）与结束日期（今天的日期）
        const today = new Date();
        const defaultEndDate = {
            year: String(today.getFullYear()),
            month: String(today.getMonth() + 1),
            day: String(today.getDate())
        };

        let prevMonthYear = today.getFullYear();
        let prevMonth = today.getMonth(); // 0代表1月，这里取上个月的月份数字 (1月时为0，即代表上月12月，但年份需要减1)
        if (prevMonth === 0) {
            prevMonth = 12;
            prevMonthYear -= 1;
        }
        const defaultStartDate = {
            year: String(prevMonthYear),
            month: String(prevMonth),
            day: '1'
        };

        let defaultDetRowCounts = 10000;
        if (reqBodyStr) {
            try {
                const reqPayload = JSON.parse(reqBodyStr);
                if (reqPayload.settings && reqPayload.settings.tableStyle && reqPayload.settings.tableStyle.detailRowCounts) {
                    defaultDetRowCounts = reqPayload.settings.tableStyle.detailRowCounts;
                }
            } catch (e) { /* 解析失败则用默认值 */ }
        }

        const settings = await showSettingsDialog({
            startDate: defaultStartDate,
            endDate: defaultEndDate,
            pageSize: defaultDetRowCounts
        });
        if (!settings) return; // 用户取消

        const { startDate, endDate, pageSize } = settings;

        const reqHeaders = reqHeadersStr ? JSON.parse(reqHeadersStr) : {};

        // 退化情况处理：如果缺少关键重放信息，则只推送缓存的第1页
        if (!reqUrl || !reqBodyStr) {
            console.warn('⚠️ [FineBI] 缺少请求信息，无法重新发起分页请求，使用缓存第1页数据');
            try {
                const firstPageJson = JSON.parse(cachedResponse);
                const cachedData = firstPageJson.data || firstPageJson;
                const allRecords = parsePageRecords(cachedData);
                await pushToLocal(allRecords, null, `dmcTCV直插(仅第1页-${allRecords.length}条)`, LOCAL_API);
            } catch (e) {
                alert('❌ 缓存数据解析失败，且缺少请求信息，无法导入');
            }
            return;
        }

        const chunks = splitIntervalByMonth(startDate, endDate);
        console.log(`📅 [FineBI] 日期区间已拆分为 ${chunks.length} 个月份子区间进行分批获取和数据库直插...`);

        let overallFetched = 0;
        let totalInserted = 0;
        const statsByMonth = {}; // 记录每个月份的删除和插入统计数

        let pushSuccess = true;
        let lastStatus = 0;
        let lastErrBody = '';

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            const cStart = chunk.startDate;
            const cEnd = chunk.endDate;
            const chunkLabel = `${cStart.year}-${cStart.month}-${cStart.day} 至 ${cEnd.year}-${cEnd.month}-${cEnd.day}`;

            const pad = (num) => String(num).padStart(2, '0');
            const dateStrGte = `${cStart.year}-${pad(cStart.month)}-${pad(cStart.day)}`;
            const dateStrLte = `${cEnd.year}-${pad(cEnd.month)}-${pad(cEnd.day)}`;
            const monthKey = `${cStart.year}${pad(cStart.month)}`;

            console.log(`%c\n📅 [FineBI] [月份区间 ${chunkIdx + 1}/${chunks.length}] 正在抓取: ${chunkLabel}`, 'color: #2db7f5; font-weight: bold; font-size: 12px;');

            // 针对当前月份子区间执行前置删除
            console.log(`🧹 [FineBI] [区间 ${chunkIdx + 1}] 准备清理日期 ${dateStrGte} 至 ${dateStrLte} 的本地历史数据...`);

            const delPayload = {
                deleteRange: {
                    field: "合同签署日期",
                    gte: dateStrGte,
                    lte: dateStrLte
                }
            };
            const delRes = await deleteLocalRecords(delPayload, `清理 dmcTCV 中 ${dateStrGte} 至 ${dateStrLte} 的数据`, LOCAL_API);

            let chunkDeletedCount = 0;
            if (delRes && delRes.status === 200) {
                try {
                    const delBody = JSON.parse(delRes.responseText || '{}');
                    chunkDeletedCount = delBody.deletedCount !== undefined ? delBody.deletedCount : 0;
                    console.log(`🧹 [FineBI] 后端返回删除数: ${chunkDeletedCount}`);
                } catch (e) {
                    console.warn(`⚠️ [FineBI] 解析删除数异常:`, e, "响应正文:", delRes.responseText);
                }
            }

            if (delRes && delRes.status === 200) {
                console.log(`%c✅ [FineBI] [区间 ${chunkIdx + 1}] 前置数据清理成功！共删除历史记录 ${chunkDeletedCount} 条`, 'color: #ff4d4d; font-weight: bold; background: #222; padding: 2px 6px; border-radius: 4px;');
            } else {
                const err = delRes ? delRes.responseText : '网络异常';
                console.error(`❌ [FineBI] [区间 ${chunkIdx + 1}] 前置清理数据失败:`, err);
                alert(`❌ 前置清理数据失败，中止导入！\n错误信息: ${err}`);
                return;
            }

            // 初始化该月份统计
            statsByMonth[monthKey] = { deleted: chunkDeletedCount, inserted: 0 };

            const chunkBodyStr = reqBodyStr ? applyPayloadParams(reqBodyStr, cStart, cEnd, pageSize) : null;
            if (!chunkBodyStr) {
                console.warn(`⚠️ [FineBI] [区间 ${chunkIdx + 1}] 缺少请求信息，跳过此区间`);
                continue;
            }

            const chunkRecords = [];

            // 1. 请求当前月份子区间的第 1 页，以获取真实总记录数
            console.log(`📡 [FineBI] 正在请求第 1 页...`);
            const page1Res = await fetchFinbiPage(1, reqUrl, reqHeaders, chunkBodyStr);
            if (!page1Res) {
                console.error(`❌ [FineBI] [区间 ${chunkIdx + 1}] 第 1 页请求失败，跳过`);
                continue;
            }

            const page1Data = page1Res.data || page1Res;
            const page1Records = parsePageRecords(page1Data);
            console.log(`✅ [FineBI] 第 1 页: ${page1Records.length} 条`);

            if (page1Records.length > 0) {
                chunkRecords.push(...page1Records);

                // 2. 从第 1 页中解析真实总记录数并计算总页数
                const realTotalRow = page1Data.row !== undefined ? page1Data.row : page1Records.length;
                const totalPages = pageSize > 0 ? Math.ceil(realTotalRow / pageSize) : 1;
                console.log(`%c📊 [FineBI] 子区间总数: ${realTotalRow} 条 | 总页数: ${totalPages}`, 'color: #00b4db; font-weight: bold; background: #222; padding: 2px 6px; border-radius: 4px;');

                // 3. 循环请求剩下的页（如果有）
                if (totalPages > 1 && page1Records.length === pageSize) {
                    for (let p = 2; p <= totalPages; p++) {
                        console.log(`📡 [FineBI] 正在请求第 ${p}/${totalPages} 页...`);
                        const pageRes = await fetchFinbiPage(p, reqUrl, reqHeaders, chunkBodyStr);

                        if (!pageRes) {
                            console.error(`❌ [FineBI] [区间 ${chunkIdx + 1}] 第 ${p} 页请求失败，中止此区间分页`);
                            break;
                        }

                        const pageData = pageRes.data || pageRes;
                        const pageRecords = parsePageRecords(pageData);
                        console.log(`✅ [FineBI] 第 ${p} 页: ${pageRecords.length} 条`);

                        if (pageRecords.length === 0) {
                            break;
                        }
                        chunkRecords.push(...pageRecords);

                        if (pageRecords.length < pageSize) {
                            break;
                        }
                    }
                }
            }

            if (chunkRecords.length === 0) {
                console.log(`ℹ️ [FineBI] [区间 ${chunkIdx + 1}] 数据为空，无需推送`);
                continue;
            }

            console.log(`🚀 [FineBI] [区间 ${chunkIdx + 1}] 获取完成，共 ${chunkRecords.length} 条。开始全量推送写入数据库...`);
            overallFetched += chunkRecords.length;

            // 将这一个月抓取的数据直接全量写入数据库（盲插直插）
            const pushResult = await pushToLocal(chunkRecords, null, `dmcTCV直插 (区间 ${chunkIdx + 1}/${chunks.length} - ${chunkRecords.length}条)`, LOCAL_API);

            if (pushResult && pushResult.status === 200) {
                try {
                    const resBody = JSON.parse(pushResult.responseText || '{}');
                    const inserted = (resBody.insertedCount || 0);
                    totalInserted += inserted;
                    if (statsByMonth[monthKey]) {
                        statsByMonth[monthKey].inserted += inserted;
                    }
                } catch (e) {
                    console.error('❌ 解析返回数据失败:', e);
                }
            } else {
                pushSuccess = false;
                lastStatus = pushResult ? pushResult.status : '未知';
                lastErrBody = pushResult ? pushResult.responseText : '无响应';
                console.error(`❌ [数据库] 推送 [区间 ${chunkIdx + 1}] 失败:`, lastErrBody);
            }

            if (!pushSuccess) {
                console.error('❌ 数据导入中途失败，中止后续区间拉取');
                break;
            }
        }

        if (pushSuccess) {
            const timeStr = captureTime ? new Date(captureTime).toLocaleString() : '未知';

            let totalDeleted = 0;
            let detailMsg = '';
            // 排序输出各月份结果
            const sortedMonths = Object.keys(statsByMonth).sort();
            sortedMonths.forEach(m => {
                totalDeleted += statsByMonth[m].deleted;
                detailMsg += `${m}:  删除${statsByMonth[m].deleted}条，插入${statsByMonth[m].inserted}条\n`;
            });

            alert(
                `🎉 TCV 数据分批导入成功！\n\n` +
                detailMsg +
                `总计删除： ${totalDeleted}条，插入： ${totalInserted}条\n\n` +
                `数据采集时间: ${timeStr}`
            );
        } else {
            console.error('❌ 数据导入失败:', lastErrBody);
            alert(`❌ 数据导入失败！\n本地服务返回状态码: ${lastStatus}\n错误信息: ${lastErrBody}`);
        }
    };

    // --- 7.5 BR 主流程：弹窗获取参数 → 分页循环拉取 → 推送入库 ---
    const runFinbiQueryBR = async () => {
        const cachedResponse = sessionStorage.getItem(CACHE_KEY_BR_RESPONSE);
        const captureTime = sessionStorage.getItem(CACHE_KEY_BR_TIME);
        const reqUrl = sessionStorage.getItem(CACHE_KEY_BR_REQ_URL);
        const reqHeadersStr = sessionStorage.getItem(CACHE_KEY_BR_REQ_HDR);
        const reqBodyStr = sessionStorage.getItem(CACHE_KEY_BR_REQ_BODY);

        if (!cachedResponse) {
            alert(
                '⚠️ 尚未捕获到 BR 数据！\n\n请按以下步骤操作：\n' +
                '1. 打开包含 BR Widget 的 FineBI 报表页面\n' +
                '2. 等待 BR 数据加载完成（右上角状态中 "BR:" 变为绿色"✅ 已就绪"）\n' +
                '3. 若页面已打开但未变绿，请按 F5 刷新页面重试\n' +
                '4. 再次点击"获取BR"按钮'
            );
            return;
        }
        // 计算默认起始日期（上个月的1号）与结束日期（今天的日期）
        const today = new Date();
        const defaultEndDate = {
            year: String(today.getFullYear()),
            month: String(today.getMonth() + 1),
            day: String(today.getDate())
        };

        let prevMonthYear = today.getFullYear();
        let prevMonth = today.getMonth(); // 0代表1月
        if (prevMonth === 0) {
            prevMonth = 12;
            prevMonthYear -= 1;
        }
        const defaultStartDate = {
            year: String(prevMonthYear),
            month: String(prevMonth),
            day: '1'
        };

        let defaultDetRowCounts = 10000;
        if (reqBodyStr) {
            try {
                const reqPayload = JSON.parse(reqBodyStr);
                if (reqPayload.settings && reqPayload.settings.tableStyle && reqPayload.settings.tableStyle.detailRowCounts) {
                    defaultDetRowCounts = reqPayload.settings.tableStyle.detailRowCounts;
                }
            } catch (e) { /* 解析失败则用默认值 */ }
        }

        const settings = await showSettingsDialog({
            startDate: defaultStartDate,
            endDate: defaultEndDate,
            pageSize: defaultDetRowCounts
        }, '📊 BR 数据获取设置');
        if (!settings) return; // 用户取消

        const { startDate, endDate, pageSize } = settings;

        const reqHeaders = reqHeadersStr ? JSON.parse(reqHeadersStr) : {};

        // 退化情况处理：如果缺少关键重放信息，则只推送缓存的第1页
        if (!reqUrl || !reqBodyStr) {
            console.warn('⚠️ [FineBI-BR] 缺少请求信息，无法重新发起分页请求，使用缓存第1页数据');
            try {
                const firstPageJson = JSON.parse(cachedResponse);
                const cachedData = firstPageJson.data || firstPageJson;
                const allRecords = parsePageRecords(cachedData);
                await pushToLocal(allRecords, null, `dmcBR直插(仅第1页-${allRecords.length}条)`, BR_LOCAL_API);
            } catch (e) {
                alert('❌ 缓存数据解析失败，且缺少请求信息，无法导入');
            }
            return;
        }

        const chunks = splitIntervalByMonth(startDate, endDate);
        console.log(`📅 [FineBI-BR] 日期区间已拆分为 ${chunks.length} 个月份子区间进行分批获取和数据库直插...`);

        let overallFetched = 0;
        let totalInserted = 0;
        const statsByMonth = {}; // 记录每个月份的删除和插入统计数

        let pushSuccess = true;
        let lastStatus = 0;
        let lastErrBody = '';

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            const cStart = chunk.startDate;
            const cEnd = chunk.endDate;
            const chunkLabel = `${cStart.year}-${cStart.month}-${cStart.day} 至 ${cEnd.year}-${cEnd.month}-${cEnd.day}`;

            // 计算当前年份月份，作为 stats key 和前置删除条件
            const monthNum = parseInt(cStart.year) * 100 + parseInt(cStart.month);

            console.log(`%c\n📅 [FineBI-BR] [月份区间 ${chunkIdx + 1}/${chunks.length}] 正在抓取: ${chunkLabel}`, 'color: #ff9900; font-weight: bold; font-size: 12px;');

            // 针对当前月份执行前置删除 (分两次请求发送以避开后端 express-mongo-sanitize 对 $ 符的过滤)
            console.log(`🧹 [FineBI-BR] [区间 ${chunkIdx + 1}] 准备清理月份 ${monthNum} 的本地历史数据...`);
            const delRes1 = await deleteLocalRecords({ "数据月份": monthNum }, `清理 dmcBR 中 ${monthNum}(数字) 的数据`, BR_LOCAL_API);
            const delRes2 = await deleteLocalRecords({ "数据月份": String(monthNum) }, `清理 dmcBR 中 ${monthNum}(字符串) 的数据`, BR_LOCAL_API);

            let chunkDeletedCount = 0;
            const parseDeletedCount = (res, label) => {
                if (res && res.status === 200) {
                    try {
                        const delBody = JSON.parse(res.responseText || '{}');
                        const count = delBody.deletedCount !== undefined ? delBody.deletedCount : 0;
                        console.log(`🧹 [FineBI-BR] ${label} 后端返回删除数: ${count}`);
                        return count;
                    } catch (e) {
                        console.warn(`⚠️ [FineBI-BR] ${label} 解析删除数异常:`, e, "响应正文:", res.responseText);
                    }
                }
                return 0;
            };

            const count1 = parseDeletedCount(delRes1, `${monthNum}(数字)`);
            const count2 = parseDeletedCount(delRes2, `${monthNum}(字符串)`);
            chunkDeletedCount = count1 + count2;

            if ((delRes1 && delRes1.status === 200) && (delRes2 && delRes2.status === 200)) {
                console.log(`%c✅ [FineBI-BR] [区间 ${chunkIdx + 1}] 前置数据清理成功！共删除历史记录 ${chunkDeletedCount} 条`, 'color: #ff4d4d; font-weight: bold; background: #222; padding: 2px 6px; border-radius: 4px;');
            } else {
                const err1 = delRes1 ? delRes1.responseText : '网络异常';
                const err2 = delRes2 ? delRes2.responseText : '网络异常';
                console.error(`❌ [FineBI-BR] [区间 ${chunkIdx + 1}] 前置清理数据失败:`, err1, err2);
                alert(`❌ 前置清理数据失败，中止导入！\n错误信息: ${err1 || err2}`);
                return;
            }

            // 初始化该月份统计
            statsByMonth[monthNum] = { deleted: chunkDeletedCount, inserted: 0 };

            const chunkBodyStr = reqBodyStr ? applyPayloadParamsBR(reqBodyStr, cStart, cEnd, pageSize) : null;
            if (!chunkBodyStr) {
                console.warn(`⚠️ [FineBI-BR] [区间 ${chunkIdx + 1}] 缺少请求信息，跳过此区间`);
                continue;
            }

            // 处理推送结果的内嵌函数，用于统一状态累加和错误处理
            const handlePushResult = (pushResult, pageNum) => {
                if (pushResult && pushResult.status === 200) {
                    try {
                        const resBody = JSON.parse(pushResult.responseText || '{}');
                        const inserted = (resBody.insertedCount || 0);
                        totalInserted += inserted;
                        if (statsByMonth[monthNum]) {
                            statsByMonth[monthNum].inserted += inserted;
                        }
                        return true;
                    } catch (e) {
                        console.error(`❌ [区间 ${chunkIdx + 1}] 第 ${pageNum} 页解析返回数据失败:`, e);
                        return true; // 依然算成功，不中止
                    }
                } else {
                    pushSuccess = false;
                    lastStatus = pushResult ? pushResult.status : '未知';
                    lastErrBody = pushResult ? pushResult.responseText : '无响应';
                    console.error(`❌ [数据库] 推送 [区间 ${chunkIdx + 1}] 第 ${pageNum} 页失败:`, lastErrBody);
                    return false;
                }
            };

            // 1. 请求当前月份子区间的第 1 页，以获取真实总记录数
            console.log(`📡 [FineBI-BR] 正在请求第 1 页...`);
            const page1Res = await fetchFinbiPage(1, reqUrl, reqHeaders, chunkBodyStr);
            if (!page1Res) {
                console.error(`❌ [FineBI-BR] [区间 ${chunkIdx + 1}] 第 1 页请求失败，跳过`);
                continue;
            }

            const page1Data = page1Res.data || page1Res;
            const page1Records = parsePageRecords(page1Data);
            console.log(`✅ [FineBI-BR] 第 1 页: ${page1Records.length} 条`);

            if (page1Records.length > 0) {
                overallFetched += page1Records.length;
                console.log(`🚀 [FineBI-BR] [区间 ${chunkIdx + 1}] 第 1 页获取完成，开始直接插入数据库...`);
                const push1 = await pushToLocal(page1Records, null, `dmcBR直插 (区间 ${chunkIdx + 1}/${chunks.length} - 第1页 - ${page1Records.length}条)`, BR_LOCAL_API);
                if (!handlePushResult(push1, 1)) {
                    break;
                }

                // 2. 从第 1 页中解析真实总记录数并计算总页数
                const realTotalRow = page1Data.row !== undefined ? page1Data.row : page1Records.length;
                const totalPages = pageSize > 0 ? Math.ceil(realTotalRow / pageSize) : 1;
                console.log(`%c📊 [FineBI-BR] 子区间总数: ${realTotalRow} 条 | 总页数: ${totalPages}`, 'color: #ff5b00; font-weight: bold; background: #222; padding: 2px 6px; border-radius: 4px;');

                // 3. 循环请求剩下的页并直接插入
                if (totalPages > 1 && page1Records.length === pageSize) {
                    for (let p = 2; p <= totalPages; p++) {
                        console.log(`📡 [FineBI-BR] 正在请求第 ${p}/${totalPages} 页...`);
                        const pageRes = await fetchFinbiPage(p, reqUrl, reqHeaders, chunkBodyStr);

                        if (!pageRes) {
                            console.error(`❌ [FineBI-BR] [区间 ${chunkIdx + 1}] 第 ${p} 页请求失败，中止此区间分页`);
                            pushSuccess = false;
                            lastStatus = '分发异常';
                            lastErrBody = `请求第 ${p} 页网络异常`;
                            break;
                        }

                        const pageData = pageRes.data || pageRes;
                        const pageRecords = parsePageRecords(pageData);
                        console.log(`✅ [FineBI-BR] 第 ${p} 页: ${pageRecords.length} 条`);

                        if (pageRecords.length === 0) {
                            break;
                        }

                        overallFetched += pageRecords.length;
                        console.log(`🚀 [FineBI-BR] [区间 ${chunkIdx + 1}] 第 ${p} 页获取完成，开始直接插入数据库...`);
                        const push = await pushToLocal(pageRecords, null, `dmcBR直插 (区间 ${chunkIdx + 1}/${chunks.length} - 第${p}页 - ${pageRecords.length}条)`, BR_LOCAL_API);
                        if (!handlePushResult(push, p)) {
                            break;
                        }

                        if (pageRecords.length < pageSize) {
                            break;
                        }
                    }
                }
            }

            if (!pushSuccess) {
                console.error('❌ 数据导入中途失败，中止后续区间拉取');
                break;
            }
        }

        if (pushSuccess) {
            const timeStr = captureTime ? new Date(captureTime).toLocaleString() : '未知';

            let totalDeleted = 0;
            let detailMsg = '';
            // 排序输出各月份结果
            const sortedMonths = Object.keys(statsByMonth).sort();
            sortedMonths.forEach(m => {
                totalDeleted += statsByMonth[m].deleted;
                detailMsg += `${m}:  删除${statsByMonth[m].deleted}条，插入${statsByMonth[m].inserted}条\n`;
            });

            alert(
                `🎉 BR 数据分批导入成功！\n\n` +
                detailMsg +
                `总计删除： ${totalDeleted}条，插入： ${totalInserted}条\n\n` +
                `数据采集时间: ${timeStr}`
            );
        } else {
            console.error('❌ 数据导入失败:', lastErrBody);
            alert(`❌ 数据导入失败！\n本地服务返回状态码: ${lastStatus}\n错误信息: ${lastErrBody}`);
        }
    };

    // --- 8. 调试函数 ---
    window._finbiDebug = () => {
        // TCV 缓存
        const tcvTime = sessionStorage.getItem(CACHE_KEY_TIME);
        const tcvCount = sessionStorage.getItem(CACHE_KEY_COUNT);
        const tcvData = sessionStorage.getItem(CACHE_KEY_RESPONSE);
        const tcvUrl = sessionStorage.getItem(CACHE_KEY_REQ_URL);
        const tcvHdr = sessionStorage.getItem(CACHE_KEY_REQ_HDR);
        const tcvBody = sessionStorage.getItem(CACHE_KEY_REQ_BODY);

        // BR 缓存
        const brTime = sessionStorage.getItem(CACHE_KEY_BR_TIME);
        const brCount = sessionStorage.getItem(CACHE_KEY_BR_COUNT);
        const brData = sessionStorage.getItem(CACHE_KEY_BR_RESPONSE);
        const brUrl = sessionStorage.getItem(CACHE_KEY_BR_REQ_URL);
        const brHdr = sessionStorage.getItem(CACHE_KEY_BR_REQ_HDR);
        const brBody = sessionStorage.getItem(CACHE_KEY_BR_REQ_BODY);

        console.log('=== FineBI TCV 缓存状态 (v4.0) ===');
        console.log('采集时间:', tcvTime || '无');
        console.log('总数据条数:', tcvCount || '无');
        console.log('请求 URL:', tcvUrl || '无');
        console.log('请求 Headers:', tcvHdr ? JSON.parse(tcvHdr) : '无');
        console.log('请求 Body 前 500 字符:', tcvBody ? tcvBody.substring(0, 500) : '无');
        console.log('响应数据前 500 字符:', tcvData ? tcvData.substring(0, 500) : '无');
        console.log('==================================');

        console.log('=== FineBI BR 缓存状态 (v4.0) ===');
        console.log('采集时间:', brTime || '无');
        console.log('总数据条数:', brCount || '无');
        console.log('请求 URL:', brUrl || '无');
        console.log('请求 Headers:', brHdr ? JSON.parse(brHdr) : '无');
        console.log('请求 Body 前 500 字符:', brBody ? brBody.substring(0, 500) : '无');
        console.log('响应数据前 500 字符:', brData ? brData.substring(0, 500) : '无');
        console.log('=================================');
    };
    console.log('💡 [FineBI-Interceptor v4.0] 调试：在控制台输入 _finbiDebug() 查看缓存状态');

    // --- 9. UI 注入 ---
    const injectUI = () => {
        if (document.getElementById('finbi-portal')) return;
        const token = getAuthToken();
        if (!token) return;

        const panel = document.createElement('div');
        panel.id = 'finbi-portal';
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 2147483647;
            display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        // 状态徽标 (支持显示多行状态)
        const statusBadge = document.createElement('div');
        statusBadge.id = 'finbi-status-badge';
        statusBadge.title = '点击在控制台打印缓存状态';
        statusBadge.style.cssText = `
            padding: 6px 12px; background: rgba(0,0,0,0.75); border-radius: 6px;
            font-size: 11px; color: #aaa; text-align: left; white-space: nowrap;
            backdrop-filter: blur(4px); cursor: pointer; border: 1px solid rgba(255,255,255,0.08);
            display: flex; flex-direction: column; gap: 3px; min-width: 180px;
        `;
        statusBadge.onclick = () => window._finbiDebug && window._finbiDebug();
        statusBadge.innerHTML = `
            <div id="finbi-tcv-status">TCV: ⏳ 等待数据加载...</div>
            <div id="finbi-br-status">BR: ⏳ 等待数据加载...</div>
        `;

        // 按钮容器
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex; gap: 8px; justify-content: flex-end;
        `;

        // 获取TCV 按钮 (经典绿青渐变)
        const btnTCV = document.createElement('button');
        btnTCV.id = 'finbi-btn-tcv';
        btnTCV.innerText = '获取TCV';
        btnTCV.style.cssText = `
            padding: 9px 15px; color: #000; font-weight: bold;
            border: none; border-radius: 6px; cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-size: 12px; white-space: nowrap;
            background: linear-gradient(135deg, #11998e, #38ef7d); transition: opacity 0.2s;
        `;
        btnTCV.onmouseover = () => { btnTCV.style.opacity = '0.85'; };
        btnTCV.onmouseout = () => { btnTCV.style.opacity = '1'; };
        btnTCV.onclick = () => runFinbiQuery();

        // 获取BR 按钮 (精美橙色渐变)
        const btnBR = document.createElement('button');
        btnBR.id = 'finbi-btn-br';
        btnBR.innerText = '获取BR';
        btnBR.style.cssText = `
            padding: 9px 15px; color: #fff; font-weight: bold;
            border: none; border-radius: 6px; cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); font-size: 12px; white-space: nowrap;
            background: linear-gradient(135deg, #ff9900, #ff5b00); transition: opacity 0.2s;
        `;
        btnBR.onmouseover = () => { btnBR.style.opacity = '0.85'; };
        btnBR.onmouseout = () => { btnBR.style.opacity = '1'; };
        btnBR.onclick = () => runFinbiQueryBR();

        btnContainer.appendChild(btnTCV);
        btnContainer.appendChild(btnBR);

        panel.appendChild(statusBadge);
        panel.appendChild(btnContainer);
        (document.body || document.documentElement).appendChild(panel);

        // 更新状态徽标内容
        const updateStatus = () => {
            // TCV 状态渲染
            const tcvEl = document.getElementById('finbi-tcv-status');
            if (tcvEl) {
                const tcvTime = sessionStorage.getItem(CACHE_KEY_TIME);
                const tcvCount = sessionStorage.getItem(CACHE_KEY_COUNT);
                if (tcvTime) {
                    const timeStr = new Date(tcvTime).toLocaleString('zh-CN', { hour12: false });
                    tcvEl.style.color = '#38ef7d';
                    tcvEl.innerText = `TCV: ✅ 已就绪 ${tcvCount ? tcvCount + '条 ' : ''}| ${timeStr}`;
                } else {
                    tcvEl.style.color = '#aaa';
                    tcvEl.innerText = 'TCV: ⏳ 等待数据加载...';
                }
            }

            // BR 状态渲染
            const brEl = document.getElementById('finbi-br-status');
            if (brEl) {
                const brTime = sessionStorage.getItem(CACHE_KEY_BR_TIME);
                const brCount = sessionStorage.getItem(CACHE_KEY_BR_COUNT);
                if (brTime) {
                    const timeStr = new Date(brTime).toLocaleString('zh-CN', { hour12: false });
                    brEl.style.color = '#ff9900';
                    brEl.innerText = `BR: ✅ 已就绪 ${brCount ? brCount + '条 ' : ''}| ${timeStr}`;
                } else {
                    brEl.style.color = '#aaa';
                    brEl.innerText = 'BR: ⏳ 等待数据加载...';
                }
            }
        };

        window.addEventListener('finebi_tcv_data_ready', (e) => {
            console.log('🔔 [FineBI-Portal] TCV 数据就绪，row:', e.detail && e.detail.row);
            updateStatus();
        });

        window.addEventListener('finebi_br_data_ready', (e) => {
            console.log('🔔 [FineBI-Portal] BR 数据就绪，row:', e.detail && e.detail.row);
            updateStatus();
        });

        updateStatus();
        setInterval(updateStatus, 3000);
    };

    // 等待 DOM 就绪后注入 UI
    const uiTimer = setInterval(() => {
        if (document.body) {
            injectUI();
            if (document.getElementById('finbi-portal')) clearInterval(uiTimer);
        }
    }, 500);
})();
