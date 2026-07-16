const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');

// 8大行业英文到中文的映射字典
const INDUSTRY_NAME_MAP = {
  'Automotive': '汽车',
  'Energy': '能源',
  'Engineering and Construction': '住建',
  'Finance': '金融',
  'Industrial Manufacturing': '制造',
  'Retail Chain and Public Services': '连锁商业与公共服务',
  'Technology and Internet': '互联网/科技',
  'Transportation and Logistics': '交通与物流'
};

// 市场经分产品到产品大类和产品小类的映射字典
const PRODUCT_CATEGORY_MAP = {
  // 算力服务
  '算力服务': { parent: '算力服务', sub: '算力服务' },
  '多云服务': { parent: '算力服务', sub: '多云服务' },
  '数据中心': { parent: '算力服务', sub: '数据中心' },

  // 通讯服务
  'IPVPN': { parent: '通讯服务', sub: 'IPVPN' },
  'SD-WAN': { parent: '通讯服务', sub: 'SD-WAN' },
  '云连接': { parent: '通讯服务', sub: '云连接' },
  '互联网转接': { parent: '通讯服务', sub: '互联网转接' },
  '全球卡': { parent: '通讯服务', sub: '全球卡' },
  '其他云网': { parent: '通讯服务', sub: '其他云网' },
  '国际专线': { parent: '通讯服务', sub: '国际专线' },
  'IPX': { parent: '通讯服务', sub: 'IPX' },
  'LBO流量包': { parent: '通讯服务', sub: 'LBO流量包' },
  '物联网连接': { parent: '通讯服务', sub: '物联网连接' },

  // 智能服务
  '5G应用': { parent: '智能服务', sub: '5G应用' },
  'A2P短信': { parent: '智能服务', sub: 'A2P短信' },
  'ICT': { parent: '智能服务', sub: 'ICT' },
  'MVNO': { parent: '智能服务', sub: 'MVNO' },
  '内容平台': { parent: '智能服务', sub: '内容平台' },
  '其他云网-CDN': { parent: '智能服务', sub: '其他云网-CDN' },
  '加速产品': { parent: '智能服务', sub: '加速产品' },
  '安全产品': { parent: '智能服务', sub: '安全产品' },
  '智能终端': { parent: '智能服务', sub: '智能终端' },
  '物联网应用': { parent: '智能服务', sub: '物联网应用' },
  '登陆站': { parent: '智能服务', sub: '登陆站' },
  '其他': { parent: '智能服务', sub: '其他' }
};

const getOverviewStats = catchAsync(async (req, res) => {
  const db = mongoose.connection.db;

  // --- 1. 获取要客清单的 GID 到行业的映射 ---
  const keyCustomers = await db.collection('keycustomer').find({}, { projection: { GID: 1, industryCode: 1, source: 1, nameCn: 1 } }).toArray();
  
  const gidToIndustryMap = new Map();
  const gidToSourceMap = new Map();
  const gidToCustomerNameMap = new Map();
  const sourceCountMap = {};
  
  // 汇总要客个数按行业分组
  const industryCustomerCount = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    industryCustomerCount[ind] = 0;
  });

  keyCustomers.forEach(cust => {
    if (cust.GID) {
      const gidStr = String(cust.GID).trim();
      gidToIndustryMap.set(gidStr, cust.industryCode || 'Other');
      gidToSourceMap.set(gidStr, cust.source || '未知');
      gidToCustomerNameMap.set(gidStr, cust.nameCn || '未命名要客');
    }
    
    // 来源统计
    const src = cust.source || '未知';
    sourceCountMap[src] = (sourceCountMap[src] || 0) + 1;

    // 要客按行业个数统计
    if (cust.industryCode && industryCustomerCount[cust.industryCode] !== undefined) {
      industryCustomerCount[cust.industryCode]++;
    }
  });

  const totalCustomers = keyCustomers.length;

  // --- 2. 获取分支总数及统计分布 ---
  // 分支数指 keyGlobalFamilyTree 中排除根节点的所有节点 (即 GID 不等于 ultimateGID)
  const branches = await db.collection('keyGlobalFamilyTree').find(
    { $expr: { $ne: ['$GID', '$ultimateGID'] } },
    { projection: { GID: 1, ultimateGID: 1, cmiIndustry: 1, cmiRegion: 1, registeredCountry: 1, entityTypeName: 1 } }
  ).toArray();

  const totalBranches = branches.length;
  // 统计营业网点（Site）数量
  const siteBranchesCount = branches.filter(br => br.entityTypeName === 'Site').length;

  // 初始化8大行业分支计数
  const industryBranchCount = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    industryBranchCount[ind] = 0;
  });

  // 初始化区域和国家分支统计
  const regionCountryBranchStats = {};

  branches.forEach(br => {
    // 行业分支统计 (优先读取 cmiIndustry，如果未定义则通过 ultimateGID 继承要客的 industryCode)
    let indCode = br.cmiIndustry;
    if (!indCode || !INDUSTRY_NAME_MAP[indCode]) {
      const parentGid = br.ultimateGID ? String(br.ultimateGID).trim() : '';
      indCode = gidToIndustryMap.get(parentGid) || 'Other';
    }

    if (indCode && industryBranchCount[indCode] !== undefined) {
      industryBranchCount[indCode]++;
    }

    // 区域与国家分支统计 (排除营业网点 Site)
    if (br.entityTypeName !== 'Site') {
      const region = br.cmiRegion || 'Other Regions';
      const country = br.registeredCountry || 'Unknown';
      if (!regionCountryBranchStats[region]) {
        regionCountryBranchStats[region] = {};
      }
      regionCountryBranchStats[region][country] = (regionCountryBranchStats[region][country] || 0) + 1;
    }
  });

  // --- 3. 获取 TCV 签单数据（按行业和年份 2023-2026 统计） ---
  // 获取 keyFamilyTreeCustMapping 并建立 extCustId -> ultimateGID 映射（含 mappingPath）
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { extCustId: 1, ultimateGID: 1, mappingPath: 1 } }).toArray();
  const extCustIdToGidMap = new Map();
  const extCustIds = new Set();

  // A端：仅 mappingPath="endCustomer" 的记录，用于通过 ibosscustomers 关联终端客户名称
  const endCustExtIdToGidMap = new Map();
  const endCustExtIds = new Set();

  mappings.forEach(m => {
    if (m.extCustId) {
      const extId = String(m.extCustId).trim();
      const gidStr = m.ultimateGID ? String(m.ultimateGID).trim() : '';
      // B端：所有记录均纳入（通过签约客户标识匹配 dmcTCV）
      extCustIdToGidMap.set(extId, gidStr);
      extCustIds.add(extId);
      // A端：仅 endCustomer 路径
      if (m.mappingPath === 'endCustomer') {
        endCustExtIdToGidMap.set(extId, gidStr);
        endCustExtIds.add(extId);
      }
    }
  });

  // 查询匹配的 B端 TCV 签单记录（通过签约客户标识关联）
  const tcvRecords = await db.collection('dmcTCV').find(
    { '签约客户标识': { $in: Array.from(extCustIds) } },
    { projection: { '签约客户标识': 1, '合同签署日期': 1, '设置起租日期': 1, '电路编号': 1, '订单状态': 1, '签单金额(港币)': 1 } }
  ).toArray();

  // 1. 过滤“订单状态” = Achive 的订单
  let filteredTcv = tcvRecords.filter(rec => {
    const status = String(rec['订单状态'] || '').trim();
    return status.toLowerCase() !== 'achive';
  });

  // 2. 按照 _id 升序排序，确保重复时保留 _id 最小的记录
  filteredTcv.sort((a, b) => String(a._id).localeCompare(String(b._id)));

  // 3. TCV的金额统计去重：如果合同签署日期、设置起租日期、电路编号、订单状态、签单金额(港币)这5个字段都相同，只保留第一个（即 _id 最小的那条）
  const uniqueTcvMap = new Map();
  filteredTcv.forEach(rec => {
    const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
    const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
    const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
    const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
    const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
    
    const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
    if (!uniqueTcvMap.has(duplicateKey)) {
      uniqueTcvMap.set(duplicateKey, rec);
    }
  });

  const finalTcvRecords = Array.from(uniqueTcvMap.values());

  // 初始化 TCV 签单统计 (8大行业 x 2023, 2024, 2025, 2026 年)
  const tcvStats = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    tcvStats[ind] = { '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
  });

  // 记录电路编号到要客行业的映射，以供后续 dmcBR 数据统计使用
  const circuitToIndustryMap = new Map();
  // 记录电路编号到客户名称的映射，以供后续按客户统计计费收入
  const circuitToCustomerNameMap = new Map();

  const tcvCustomerSumMap = {};
  finalTcvRecords.forEach(rec => {
    const extId = String(rec['签约客户标识'] || '').trim();
    const parentGid = extCustIdToGidMap.get(extId);
    const industry = gidToIndustryMap.get(parentGid);
    const customerName = parentGid ? (gidToCustomerNameMap.get(String(parentGid)) || '未知客户') : '未知客户';

    // 记录电路对应行业
    if (rec['电路编号'] && industry && INDUSTRY_NAME_MAP[industry]) {
      circuitToIndustryMap.set(String(rec['电路编号']).trim(), industry);
    }
    // 记录电路对应客户中文名
    if (rec['电路编号']) {
      circuitToCustomerNameMap.set(String(rec['电路编号']).trim(), customerName);
    }

    if (!industry || !INDUSTRY_NAME_MAP[industry]) return;

    // 提取合同签署日期中的年份
    const signDate = rec['合同签署日期'] || '';
    const year = signDate.substring(0, 4);

    if (['2023', '2024', '2025', '2026'].includes(year)) {
      const amount = parseFloat(rec['签单金额(港币)'] || 0);
      tcvStats[industry][year] += amount;

      // 统计历年要客签单客户维度金额明细
      const key = `${year}_${industry}_${customerName}`;
      tcvCustomerSumMap[key] = (tcvCustomerSumMap[key] || 0) + amount;
    }
  });

  const tcvCustomerStats = Object.keys(tcvCustomerSumMap).map(k => {
    const [year, industry, customerName] = k.split('_');
    return {
      year,
      industry,
      customerName,
      amount: tcvCustomerSumMap[k]
    };
  });

  // --- 3-A. 获取 A端 TCV 签单数据（通过 ibosscustomers.enterpriseName 关联 终端客户名称）---
  // 先通过 endCustomer extCustId 批量查询 ibosscustomers 的 enterpriseName
  const ibossRecs = await db.collection('ibosscustomers').find(
    { custId: { $in: Array.from(endCustExtIds) } },
    { projection: { custId: 1, enterpriseName: 1 } }
  ).toArray();

  // 建立 enterpriseName -> ultimateGID 的映射（用于从终端客户名称反查要客）
  const enterpriseToGidMap_A = new Map();
  const enterpriseNames_A = new Set();

  ibossRecs.forEach(iboss => {
    const custIdStr = String(iboss.custId).trim();
    const gid = endCustExtIdToGidMap.get(custIdStr) || '';
    if (iboss.enterpriseName) {
      const eName = String(iboss.enterpriseName).trim();
      enterpriseToGidMap_A.set(eName, gid);
      enterpriseNames_A.add(eName);
    }
  });

  // 查询 A端 TCV 记录（通过终端客户名称匹配）
  const tcvRecords_A = await db.collection('dmcTCV').find(
    { '终端客户名称': { $in: Array.from(enterpriseNames_A) } },
    { projection: { '终端客户名称': 1, '合同签署日期': 1, '设置起租日期': 1, '电路编号': 1, '订单状态': 1, '签单金额(港币)': 1 } }
  ).toArray();

  // A端 TCV：同样过滤 Achive 状态并按5字段去重
  let filteredTcv_A = tcvRecords_A.filter(rec => {
    const status = String(rec['订单状态'] || '').trim();
    return status.toLowerCase() !== 'achive';
  });
  filteredTcv_A.sort((a, b) => String(a._id).localeCompare(String(b._id)));

  const uniqueTcvMap_A = new Map();
  filteredTcv_A.forEach(rec => {
    const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
    const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
    const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
    const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
    const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
    const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
    if (!uniqueTcvMap_A.has(duplicateKey)) {
      uniqueTcvMap_A.set(duplicateKey, rec);
    }
  });
  const finalTcvRecords_A = Array.from(uniqueTcvMap_A.values());

  // 初始化 A端 TCV 签单统计（8大行业 x 年份）
  const tcvStats_A = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    tcvStats_A[ind] = { '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
  });

  // A端电路到行业/客户名的映射，供后续 A端 BR 统计使用
  const circuitToIndustryMap_A = new Map();
  const circuitToCustomerNameMap_A = new Map();
  const tcvCustomerSumMap_A = {};

  finalTcvRecords_A.forEach(rec => {
    const eName = String(rec['终端客户名称'] || '').trim();
    const parentGid = enterpriseToGidMap_A.get(eName);
    const industry = parentGid ? gidToIndustryMap.get(parentGid) : undefined;
    const customerName = parentGid ? (gidToCustomerNameMap.get(String(parentGid)) || '未知客户') : '未知客户';

    // 记录 A端电路对应行业与客户名
    if (rec['电路编号'] && industry && INDUSTRY_NAME_MAP[industry]) {
      circuitToIndustryMap_A.set(String(rec['电路编号']).trim(), industry);
    }
    if (rec['电路编号']) {
      circuitToCustomerNameMap_A.set(String(rec['电路编号']).trim(), customerName);
    }

    if (!industry || !INDUSTRY_NAME_MAP[industry]) return;

    const signDate = rec['合同签署日期'] || '';
    const year = signDate.substring(0, 4);

    if (['2023', '2024', '2025', '2026'].includes(year)) {
      const amount = parseFloat(rec['签单金额(港币)'] || 0);
      tcvStats_A[industry][year] += amount;

      // A端历年客户维度签单明细
      const key = `${year}_${industry}_${customerName}`;
      tcvCustomerSumMap_A[key] = (tcvCustomerSumMap_A[key] || 0) + amount;
    }
  });

  const tcvCustomerStats_A = Object.keys(tcvCustomerSumMap_A).map(k => {
    const [year, industry, customerName] = k.split('_');
    return { year, industry, customerName, amount: tcvCustomerSumMap_A[k] };
  });

  // --- 4. 获取 2026 年计费收入数据（dmcBR）---
  const activeCircuits = Array.from(circuitToIndustryMap.keys());
  
  // 初始化计费收入统计 (8大行业 x 大类 x 小类)
  const brStats = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    brStats[ind] = {
      '通讯服务': {},
      '算力服务': {},
      '智能服务': {}
    };
  });

  // 初始化要客维度计费总收入及产品分布统计对象
  const customerIncomeStats = {};

  if (activeCircuits.length > 0) {
    // 仅查询包含匹配电路且月份属于2026年的计费记录
    const brRecords = await db.collection('dmcBR').find(
      {
        '电路参考编号': { $in: activeCircuits },
        '数据月份': { $regex: /^2026/ }
      },
      {
        projection: {
          '电路参考编号': 1,
          '市场经分产品分类': 1,
          '拆分后港币金额': 1,
          '拆分后港币金额｜绝对值': 1,
          '拆分后港币金额|绝对值': 1
        }
      }
    ).toArray();

    brRecords.forEach(rec => {
      const circuitId = String(rec['电路参考编号'] || '').trim();
      const industry = circuitToIndustryMap.get(circuitId);
      const customerName = circuitToCustomerNameMap.get(circuitId) || '未知客户';
      if (!industry || !brStats[industry]) return;

      const prodCategory = rec['市场经分产品分类'] || '其他';
      const mapping = PRODUCT_CATEGORY_MAP[prodCategory] || { parent: '智能服务', sub: '其他' };
      const largeCat = mapping.parent;
      const subCat = mapping.sub;

      // 优先采用“拆分后港币金额｜绝对值”字段，若不存在则进行兼容性兼容读取
      const rawAmount = rec['拆分后港币金额｜绝对值'] !== undefined
        ? rec['拆分后港币金额｜绝对值']
        : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : (rec['拆分后港币金额'] || 0));
      const amount = parseFloat(rawAmount);

      if (!brStats[industry][largeCat][subCat]) {
        brStats[industry][largeCat][subCat] = 0;
      }
      brStats[industry][largeCat][subCat] += amount;

      // 按客户和行业统计2026年计费收入及产品构成
      if (!customerIncomeStats[customerName]) {
        customerIncomeStats[customerName] = {
          name: customerName,
          industry: industry,
          total: 0,
          products: {}
        };
      }
      customerIncomeStats[customerName].total += amount;
      customerIncomeStats[customerName].products[prodCategory] = (customerIncomeStats[customerName].products[prodCategory] || 0) + amount;
    });
  }

  // --- 4-A. 获取 A端 2026 年计费收入数据（dmcBR）---
  const activeCircuits_A = Array.from(circuitToIndustryMap_A.keys());

  // 初始化 A端计费收入统计（8大行业 x 大类 x 小类）
  const brStats_A = {};
  Object.keys(INDUSTRY_NAME_MAP).forEach(ind => {
    brStats_A[ind] = { '通讯服务': {}, '算力服务': {}, '智能服务': {} };
  });

  // A端客户维度计费总收入统计
  const customerIncomeStats_A = {};

  if (activeCircuits_A.length > 0) {
    const brRecords_A = await db.collection('dmcBR').find(
      {
        '电路参考编号': { $in: activeCircuits_A },
        '数据月份': { $regex: /^2026/ }
      },
      {
        projection: {
          '电路参考编号': 1,
          '市场经分产品分类': 1,
          '拆分后港币金额': 1,
          '拆分后港币金额｜绝对值': 1,
          '拆分后港币金额|绝对值': 1
        }
      }
    ).toArray();

    brRecords_A.forEach(rec => {
      const circuitId = String(rec['电路参考编号'] || '').trim();
      const industry = circuitToIndustryMap_A.get(circuitId);
      const customerName = circuitToCustomerNameMap_A.get(circuitId) || '未知客户';
      if (!industry || !brStats_A[industry]) return;

      const prodCategory = rec['市场经分产品分类'] || '其他';
      const mapping = PRODUCT_CATEGORY_MAP[prodCategory] || { parent: '智能服务', sub: '其他' };
      const largeCat = mapping.parent;
      const subCat = mapping.sub;

      // 优先采用"拆分后港币金额｜绝对值"字段
      const rawAmount = rec['拆分后港币金额｜绝对值'] !== undefined
        ? rec['拆分后港币金额｜绝对值']
        : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : (rec['拆分后港币金额'] || 0));
      const amount = parseFloat(rawAmount);

      if (!brStats_A[industry][largeCat][subCat]) {
        brStats_A[industry][largeCat][subCat] = 0;
      }
      brStats_A[industry][largeCat][subCat] += amount;

      // A端客户维度 2026 计费收入
      if (!customerIncomeStats_A[customerName]) {
        customerIncomeStats_A[customerName] = {
          name: customerName,
          industry: industry,
          total: 0,
          products: {}
        };
      }
      customerIncomeStats_A[customerName].total += amount;
      customerIncomeStats_A[customerName].products[prodCategory] = (customerIncomeStats_A[customerName].products[prodCategory] || 0) + amount;
    });
  }

  // --- 5. 格式化并返回最终统计结果 ---
  // 将以英文为 Key 的行业转换整理，并提供对应中文名字以便前端绘图
  const formattedIndustryStats = [];
  Object.keys(INDUSTRY_NAME_MAP).forEach(indCode => {
    formattedIndustryStats.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      customerCount: industryCustomerCount[indCode] || 0,
      branchCount: industryBranchCount[indCode] || 0
    });
  });

  // B端 TCV 格式化（原有字段保持不变）
  const formattedTcvStats = [];
  Object.keys(tcvStats).forEach(indCode => {
    formattedTcvStats.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      ...tcvStats[indCode]
    });
  });

  // A端 TCV 格式化（新增）
  const formattedTcvStats_A = [];
  Object.keys(tcvStats_A).forEach(indCode => {
    formattedTcvStats_A.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      ...tcvStats_A[indCode]
    });
  });

  // B端 BR 格式化（原有字段保持不变）
  const formattedBrStats = [];
  Object.keys(brStats).forEach(indCode => {
    formattedBrStats.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      categories: brStats[indCode]
    });
  });

  // A端 BR 格式化（新增）
  const formattedBrStats_A = [];
  Object.keys(brStats_A).forEach(indCode => {
    formattedBrStats_A.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      categories: brStats_A[indCode]
    });
  });

  // 计算 B端、A端 2026 年签单总额（供前端 KPI 卡片展示 B/A端分类副标题）
  const tcv2026Total_B = Object.values(tcvStats).reduce((sum, s) => sum + (s['2026'] || 0), 0);
  const tcv2026Total_A = Object.values(tcvStats_A).reduce((sum, s) => sum + (s['2026'] || 0), 0);

  // 辅助函数：汇总 brStats 所有行业的全量计费收入
  const calcBrTotal = (brStatsObj) => {
    let total = 0;
    Object.values(brStatsObj).forEach(indCats => {
      Object.values(indCats).forEach(subMap => {
        Object.values(subMap).forEach(v => { total += (parseFloat(v) || 0); });
      });
    });
    return total;
  };
  const br2026Total_B = calcBrTotal(brStats);
  const br2026Total_A = calcBrTotal(brStats_A);

  res.status(httpStatus.OK).send({
    quantity: {
      totalCustomers,
      totalBranches,
      siteBranchesCount,
      sourceStats: sourceCountMap,
      industryStats: formattedIndustryStats,
      regionCountryStats: regionCountryBranchStats
    },
    // B端数据（原有字段保持向下兼容）
    tcv: formattedTcvStats,
    br2026: formattedBrStats,
    topCustomers: Object.values(customerIncomeStats),
    tcvCustomerStats,
    // A端数据（新增）
    tcv_A: formattedTcvStats_A,
    br2026_A: formattedBrStats_A,
    topCustomers_A: Object.values(customerIncomeStats_A),
    tcvCustomerStats_A,
    // 总额汇总（供 KPI 卡片展示 B端/A端 分类副标题）
    tcv2026Total_B,
    tcv2026Total_A,
    br2026Total_B,
    br2026Total_A
  });
});

const getCountryBranches = catchAsync(async (req, res) => {
  const { country } = req.query;
  if (!country) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '请提供国家参数 (country)' });
  }

  const db = mongoose.connection.db;

  // 查询该国家下的所有要客分支节点 (排除营业网点 Site)
  const records = await db.collection('keyGlobalFamilyTree').find(
    { registeredCountry: country, entityTypeName: { $ne: 'Site' } },
    {
      projection: {
        ultimateGID: 1,
        companyNameCn: 1,
        registeredCountry: 1,
        registeredCity: 1,
        registeredAddress: 1,
        enterpriseNature: 1,
        isDomesticUltimate: 1,
        nationAgent: 1
      }
    }
  ).toArray();

  // 提取所有的 ultimateGID
  const uGids = [...new Set(records.map(r => r.ultimateGID).filter(Boolean))];

  // 查出 ultimateGID 在 keycustomer 表中的中文公司名称 nameCn
  const gidToNameMap = new Map();
  if (uGids.length > 0) {
    const customers = await db.collection('keycustomer').find(
      { GID: { $in: uGids.flatMap(g => [g, String(g), Number(g)]) } },
      { projection: { GID: 1, nameCn: 1 } }
    ).toArray();

    customers.forEach(c => {
      if (c.GID) {
        gidToNameMap.set(String(c.GID).trim(), c.nameCn);
      }
    });
  }

  // 组装返回数据，挂载要客集团中文名称 (ultimateNameCn)
  const formattedRecords = records.map(r => {
    const parentGid = r.ultimateGID ? String(r.ultimateGID).trim() : '';
    return {
      _id: r._id,
      ultimateGID: r.ultimateGID,
      ultimateNameCn: gidToNameMap.get(parentGid) || '未知要客集团',
      companyNameCn: r.companyNameCn || '未命名分支',
      registeredCountry: r.registeredCountry || '-',
      registeredCity: r.registeredCity || '-',
      registeredAddress: r.registeredAddress || '-',
      enterpriseNature: r.enterpriseNature || '-',
      isDomesticUltimate: r.isDomesticUltimate || false
    };
  });

  res.status(httpStatus.OK).send(formattedRecords);
});

// 获取指定客户和年份下的 TCV 签单明细列表（支持 mode=B/A/total 区分端别）
const getTcvDetail = catchAsync(async (req, res) => {
  const { customerName, year, mode } = req.query;
  if (!customerName) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '请提供客户名称 (customerName)' });
  }

  const db = mongoose.connection.db;

  // 投影字段
  const projection = {
    '签约客户标识': 1,
    '合同签署日期': 1,
    '大区编码': 1,
    '电路编号': 1,
    '大区中文名称': 1,
    '分析客户名称(规整后)': 1,
    '签约客户名称': 1,
    '终端客户名称': 1,
    '市场经分产品分类': 1,
    '是否国际业务收入标签': 1,
    '销售单元编码': 1,
    '销售单元中文名称': 1,
    '签单金额(港币)': 1,
    '设置起租日期': 1,
    '订单状态': 1
  };

  // 公共过滤去重函数
  const filterAndDedup = (rawList) => {
    let filtered = rawList.filter(rec => {
      const status = String(rec['订单状态'] || '').trim();
      return status.toLowerCase() !== 'achive';
    });
    filtered.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const uniqueMap = new Map();
    filtered.forEach(rec => {
      const k = [
        rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '',
        rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '',
        rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '',
        rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '',
        rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : ''
      ].join('_');
      if (!uniqueMap.has(k)) uniqueMap.set(k, rec);
    });
    return Array.from(uniqueMap.values());
  };

  // --- 查询 B端 TCV 数据（通过签约客户标识） ---
  const getBList = async () => {
    // 1. 查找要客 GID
    const cust = await db.collection('keycustomer').findOne({ nameCn: customerName });
    let extCustIds = [];
    if (cust && cust.GID) {
      const gid = String(cust.GID).trim();
      const mappings = await db.collection('keyFamilyTreeCustMapping').find({
        ultimateGID: { $in: [gid, Number(gid), cust.GID] }
      }).toArray();
      extCustIds = mappings.map(m => String(m.extCustId || '').trim()).filter(Boolean);
    }

    let list = [];
    if (extCustIds.length > 0) {
      const filter = { '签约客户标识': { $in: extCustIds } };
      if (year) filter['合同签署日期'] = { $regex: new RegExp('^' + year) };
      list = await db.collection('dmcTCV').find(filter, { projection }).toArray();
    }
    // 后备：若 B端未关联到数据，尝试名称直接搜索
    if (list.length === 0) {
      const filter = {
        $or: [
          { '分析客户名称(规整后)': customerName },
          { '签约客户名称': customerName }
        ]
      };
      if (year) filter['合同签署日期'] = { $regex: new RegExp('^' + year) };
      list = await db.collection('dmcTCV').find(filter, { projection }).toArray();
    }
    return list;
  };

  // --- 查询 A端 TCV 数据（通过 ibosscustomers.enterpriseName → 终端客户名称） ---
  const getAList = async () => {
    // 1. 查找要客 GID
    const cust = await db.collection('keycustomer').findOne({ nameCn: customerName });
    if (!cust || !cust.GID) return [];
    const gid = String(cust.GID).trim();

    // 2. 查找 endCustomer 路径的 extCustIds
    const mappings = await db.collection('keyFamilyTreeCustMapping').find({
      ultimateGID: { $in: [gid, Number(gid), cust.GID] },
      mappingPath: 'endCustomer'
    }).toArray();
    const endCustExtIds = mappings.map(m => String(m.extCustId || '').trim()).filter(Boolean);
    if (endCustExtIds.length === 0) return [];

    // 3. 通过 ibosscustomers 获取 enterpriseName
    const ibossRecs = await db.collection('ibosscustomers').find(
      { custId: { $in: endCustExtIds } },
      { projection: { custId: 1, enterpriseName: 1 } }
    ).toArray();
    const enterpriseNames = ibossRecs.map(r => r.enterpriseName).filter(Boolean).map(n => String(n).trim());
    if (enterpriseNames.length === 0) return [];

    // 4. 查询 A端 TCV（通过终端客户名称）
    const filter = { '终端客户名称': { $in: enterpriseNames } };
    if (year) filter['合同签署日期'] = { $regex: new RegExp('^' + year) };
    const list = await db.collection('dmcTCV').find(filter, { projection }).toArray();
    return list;
  };

  // 根据 mode 参数选择查询方式
  let rawList = [];
  const modeVal = (mode || 'total').toLowerCase();

  if (modeVal === 'b') {
    rawList = await getBList();
  } else if (modeVal === 'a') {
    rawList = await getAList();
  } else {
    // total：A端 + B端合并（去重时同一条记录只保留一条）
    const [bList, aList] = await Promise.all([getBList(), getAList()]);
    rawList = [...bList, ...aList];
  }

  const finalList = filterAndDedup(rawList);
  res.status(httpStatus.OK).send(finalList);
});


// 获取指定客户和年份下的 BR 计费明细列表
const getBrDetail = catchAsync(async (req, res) => {
  const { customerName, year } = req.query;
  if (!customerName) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '请提供客户名称 (customerName)' });
  }

  const db = mongoose.connection.db;

  // 1. 查找要客 GID 并查找对应的 extCustIds
  const cust = await db.collection('keycustomer').findOne({ nameCn: customerName });
  let extCustIds = [];
  if (cust && cust.GID) {
    const gid = String(cust.GID).trim();
    const mappings = await db.collection('keyFamilyTreeCustMapping').find({
      ultimateGID: { $in: [gid, Number(gid), cust.GID] }
    }).toArray();
    extCustIds = mappings.map(m => String(m.extCustId || '').trim()).filter(Boolean);
  }

  let circuitIds = [];
  if (extCustIds.length > 0) {
    // 2. 从 dmcTCV 中查找这些客户对应的电路编号
    const tcvRecs = await db.collection('dmcTCV').find(
      { '签约客户标识': { $in: extCustIds }, '电路编号': { $ne: null } },
      { projection: { '电路编号': 1, '合同签署日期': 1, '设置起租日期': 1, '订单状态': 1, '签单金额(港币)': 1 } }
    ).toArray();

    // 过滤与去重
    let filteredTcvRecs = tcvRecs.filter(rec => {
      const status = String(rec['订单状态'] || '').trim();
      return status.toLowerCase() !== 'achive';
    });

    filteredTcvRecs.sort((a, b) => String(a._id).localeCompare(String(b._id)));

    const uniqueTcvRecsMap = new Map();
    filteredTcvRecs.forEach(rec => {
      const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
      const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
      const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
      const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
      const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
      
      const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
      if (!uniqueTcvRecsMap.has(duplicateKey)) {
        uniqueTcvRecsMap.set(duplicateKey, rec);
      }
    });

    const finalTcvRecs = Array.from(uniqueTcvRecsMap.values());
    circuitIds = finalTcvRecs.map(r => String(r['电路编号'] || '').trim()).filter(Boolean);
  }

  let list = [];
  const projection = {
    '签约客户名称': 1,
    '数据月份': 1,
    '电路参考编号': 1,
    '是否国际业务收入': 1,
    '是否商品销售收入': 1,
    '销售单元编码': 1,
    '销售单元中文名称': 1,
    '市场经分产品分类': 1,
    '拆分后港币金额': 1,
    '拆分后港币金额｜绝对值': 1,
    '拆分后港币金额|绝对值': 1,
    '分成比例': 1,
    '客户经理名称': 1
  };

  if (circuitIds.length > 0) {
    const brFilter = { '电路参考编号': { $in: circuitIds } };
    if (year) {
      brFilter['数据月份'] = { $regex: new RegExp('^' + year) };
    }
    list = await db.collection('dmcBR').find(brFilter, { projection }).toArray();
  }

  // 3. 后备机制：若未查到电路编号，或者查出的 BR 列表为空，直接用名称模糊匹配 dmcBR 集合
  if (list.length === 0) {
    const brFilter = {
      $or: [
        { '分析客户名称(规整后)': customerName },
        { '终端客户名称': customerName }
      ]
    };
    if (year) {
      brFilter['数据月份'] = { $regex: new RegExp('^' + year) };
    }
    list = await db.collection('dmcBR').find(brFilter, { projection }).toArray();
  }

  res.status(httpStatus.OK).send(list);
});

// 获取指定海外家族树 GID 对应的 Dashboard 数据接口 (符合中文注释规范)
const getFamilyTreeDashboardData = catchAsync(async (req, res) => {
  const db = mongoose.connection.db;
  const { gid } = req.query;
  if (!gid) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '缺少必填参数 gid' });
  }

  const gidStr = String(gid).trim();

  // 1. 获取该海外客户树在 keyFamilyTreeCustMapping 表中映射的所有外部 iBOSS 客户 ID
  const mappings = await db.collection('keyFamilyTreeCustMapping').find(
    { ultimateGID: gidStr },
    { projection: { extCustId: 1, mappingPath: 1 } }
  ).toArray();

  const extCustIds = mappings.map(m => m.extCustId).filter(Boolean);
  const endCustExtIds = mappings.filter(m => m.mappingPath === 'endCustomer').map(m => m.extCustId).filter(Boolean);

  // 2. A端关联转换：提取 CMI 终端客户对应的 enterpriseName
  let enterpriseNames = [];
  if (endCustExtIds.length > 0) {
    const ibossCustomers = await db.collection('ibosscustomers').find(
      { custId: { $in: endCustExtIds } },
      { projection: { custId: 1, enterpriseName: 1 } }
    ).toArray();
    enterpriseNames = ibossCustomers.map(c => c.enterpriseName).filter(Boolean);
  }

  // 3. TCV 签单明细提取与清洗排重
  const tcvQuery = { $or: [] };
  if (extCustIds.length > 0) {
    tcvQuery.$or.push({ '签约客户标识': { $in: extCustIds } });
  }
  if (enterpriseNames.length > 0) {
    tcvQuery.$or.push({ '终端客户名称': { $in: enterpriseNames } });
  }

  let finalTcv = [];
  if (tcvQuery.$or.length > 0) {
    const tcvRecords = await db.collection('dmcTCV').find(tcvQuery).toArray();
    // 过滤已注销的订单
    let filteredTcv = tcvRecords.filter(rec => String(rec['订单状态'] || '').trim().toLowerCase() !== 'achive');

    // 按照 _id 升序排序，保证重复时保留 _id 最小的记录
    filteredTcv.sort((a, b) => String(a._id).localeCompare(String(b._id)));

    // 5 字段去重
    const uniqueMap = new Map();
    filteredTcv.forEach(rec => {
      const kSignDate = rec['合同签署日期'] !== undefined && rec['合同签署日期'] !== null ? String(rec['合同签署日期']).trim() : '';
      const kStartDate = rec['设置起租日期'] !== undefined && rec['设置起租日期'] !== null ? String(rec['设置起租日期']).trim() : '';
      const kCircuit = rec['电路编号'] !== undefined && rec['电路编号'] !== null ? String(rec['电路编号']).trim() : '';
      const kStatus = rec['订单状态'] !== undefined && rec['订单状态'] !== null ? String(rec['订单状态']).trim() : '';
      const kAmount = rec['签单金额(港币)'] !== undefined && rec['签单金额(港币)'] !== null ? String(rec['签单金额(港币)']).trim() : '';
      const duplicateKey = `${kSignDate}_${kStartDate}_${kCircuit}_${kStatus}_${kAmount}`;
      if (!uniqueMap.has(duplicateKey)) {
        uniqueMap.set(duplicateKey, rec);
      }
    });
    finalTcv = Array.from(uniqueMap.values());
  }

  // --- 统计 TCV 大区、单元签单个数和总金额，以及产品大类/小类分解 ---
  const tcvGroupMap = new Map();

  finalTcv.forEach(rec => {
    const region = rec['大区中文名称'] || rec['大区'] || '其他大区';
    const unit = rec['销售单元中文名称'] || rec['销售单元编码'] || '其他单元';
    const amount = parseFloat(rec['签单金额(港币)'] || 0);

    const groupKey = `${region}_${unit}`;
    if (!tcvGroupMap.has(groupKey)) {
      tcvGroupMap.set(groupKey, {
        region,
        unit,
        count: 0,
        amount: 0
      });
    }
    const g = tcvGroupMap.get(groupKey);
    g.count += 1;
    g.amount += amount;
  });

  const tcvGroupList = Array.from(tcvGroupMap.values());

  // 4. BR 项目计收明细提取
  const circuitIds = Array.from(new Set(finalTcv.map(r => String(r['电路编号'] || '').trim()).filter(Boolean)));
  const brQuery = { $or: [] };
  if (circuitIds.length > 0) {
    brQuery.$or.push({ '电路参考编号': { $in: circuitIds } });
  }
  if (enterpriseNames.length > 0) {
    brQuery.$or.push({ '终端客户名称': { $in: enterpriseNames } });
  }

  let brList = [];
  if (brQuery.$or.length > 0) {
    const brRecords = await db.collection('dmcBR').find(brQuery).toArray();
    brList = brRecords.map(rec => {
      const rawAmount = rec['拆分后港币金额｜绝对值'] !== undefined
        ? rec['拆分后港币金额｜绝对值']
        : (rec['拆分后港币金额|绝对值'] !== undefined
            ? rec['拆分后港币金额|绝对值']
            : (rec['拆分后港币金额'] || 0));
      const amount = parseFloat(rawAmount || 0);

      return {
        _id: rec._id,
        签约客户名称: rec['签约客户名称'] || '—',
        终端客户名称: rec['终端客户名称'] || '—',
        数据月份: rec['数据月份'] || '—',
        电路参考编号: rec['电路参考编号'] || '—',
        大区中文名称: rec['大区中文名称'] || rec['大区'] || '其他大区',
        销售单元中文名称: rec['销售单元中文名称'] || rec['销售单元编码'] || '其他单元',
        市场经分产品分类: rec['市场经分产品分类'] || '其他',
        分成比例: rec['分成比例'] || 0,
        金额: amount
      };
    });
  }

  res.status(httpStatus.OK).send({
    tcvStats: tcvGroupList,
    tcvRecords: finalTcv,
    brStats: brList
  });
});

module.exports = {
  getOverviewStats,
  getCountryBranches,
  getTcvDetail,
  getBrDetail,
  getFamilyTreeDashboardData
};
