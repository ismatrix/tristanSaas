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
    { projection: { GID: 1, ultimateGID: 1, cmiIndustry: 1, cmiRegion: 1, registeredCountry: 1 } }
  ).toArray();

  const totalBranches = branches.length;

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

    // 区域与国家分支统计
    const region = br.cmiRegion || 'Other Regions';
    const country = br.registeredCountry || 'Unknown';
    if (!regionCountryBranchStats[region]) {
      regionCountryBranchStats[region] = {};
    }
    regionCountryBranchStats[region][country] = (regionCountryBranchStats[region][country] || 0) + 1;
  });

  // --- 3. 获取 TCV 签单数据（按行业和年份 2023-2026 统计） ---
  // 获取 keyFamilyTreeCustMapping 并建立 extCustId -> ultimateGID 映射
  const mappings = await db.collection('keyFamilyTreeCustMapping').find({}, { projection: { extCustId: 1, ultimateGID: 1 } }).toArray();
  const extCustIdToGidMap = new Map();
  const extCustIds = new Set();

  mappings.forEach(m => {
    if (m.extCustId) {
      const extId = String(m.extCustId).trim();
      extCustIdToGidMap.set(extId, m.ultimateGID ? String(m.ultimateGID).trim() : '');
      extCustIds.add(extId);
    }
  });

  // 查询匹配的 TCV 签单记录
  const tcvRecords = await db.collection('dmcTCV').find(
    { '签约客户标识': { $in: Array.from(extCustIds) } },
    { projection: { '签约客户标识': 1, '合同签署日期': 1, '签单金额(港币)': 1, '电路编号': 1 } }
  ).toArray();

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
  tcvRecords.forEach(rec => {
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

  // --- 4. 获取 2026 年计费收入数据（dmcBR） ---
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

  const formattedTcvStats = [];
  Object.keys(tcvStats).forEach(indCode => {
    formattedTcvStats.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      ...tcvStats[indCode]
    });
  });

  const formattedBrStats = [];
  Object.keys(brStats).forEach(indCode => {
    formattedBrStats.push({
      code: indCode,
      nameCn: INDUSTRY_NAME_MAP[indCode],
      categories: brStats[indCode]
    });
  });

  res.status(httpStatus.OK).send({
    quantity: {
      totalCustomers,
      totalBranches,
      sourceStats: sourceCountMap,
      industryStats: formattedIndustryStats,
      regionCountryStats: regionCountryBranchStats
    },
    tcv: formattedTcvStats,
    br2026: formattedBrStats,
    topCustomers: Object.values(customerIncomeStats),
    tcvCustomerStats
  });
});

const getCountryBranches = catchAsync(async (req, res) => {
  const { country } = req.query;
  if (!country) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '请提供国家参数 (country)' });
  }

  const db = mongoose.connection.db;

  // 查询该国家下的所有要客分支节点
  const records = await db.collection('keyGlobalFamilyTree').find(
    { registeredCountry: country },
    {
      projection: {
        ultimateGID: 1,
        companyNameCn: 1,
        registeredCountry: 1,
        registeredCity: 1,
        registeredAddress: 1,
        enterpriseNature: 1,
        isDomesticUltimate: 1
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

// 获取指定客户和年份下的 TCV 签单明细列表
const getTcvDetail = catchAsync(async (req, res) => {
  const { customerName, year } = req.query;
  if (!customerName) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: '请提供客户名称 (customerName)' });
  }

  const db = mongoose.connection.db;

  // 1. 查找要客 GID
  const cust = await db.collection('keycustomer').findOne({ nameCn: customerName });
  let extCustIds = [];
  if (cust && cust.GID) {
    const gid = String(cust.GID).trim();
    // 2. 查出 extCustId
    const mappings = await db.collection('keyFamilyTreeCustMapping').find({
      ultimateGID: { $in: [gid, Number(gid), cust.GID] }
    }).toArray();
    extCustIds = mappings.map(m => String(m.extCustId || '').trim()).filter(Boolean);
  }

  let list = [];
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
    '签单金额(港币)': 1
  };

  if (extCustIds.length > 0) {
    const filter = { '签约客户标识': { $in: extCustIds } };
    if (year) {
      filter['合同签署日期'] = { $regex: new RegExp('^' + year) };
    }
    list = await db.collection('dmcTCV').find(filter, { projection }).toArray();
  }

  // 3. 后备机制：若未关联到 GID/extCustId，或者关联出来的 TCV 数据为空，尝试用名称直接搜索 dmcTCV
  if (list.length === 0) {
    const filter = {
      $or: [
        { '分析客户名称(规整后)': customerName },
        { '签约客户名称': customerName },
        { '终端客户名称': customerName }
      ]
    };
    if (year) {
      filter['合同签署日期'] = { $regex: new RegExp('^' + year) };
    }
    list = await db.collection('dmcTCV').find(filter, { projection }).toArray();
  }

  res.status(httpStatus.OK).send(list);
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
      { projection: { '电路编号': 1 } }
    ).toArray();
    circuitIds = tcvRecs.map(r => String(r['电路编号'] || '').trim()).filter(Boolean);
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

module.exports = {
  getOverviewStats,
  getCountryBranches,
  getTcvDetail,
  getBrDetail
};
