require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');

// 中文到英文字段的映射
const participantMap = {
  '企业名称': 'companyName',
  '企业编号': 'companyCode',
  'COMPANY_ID': 'companyId',
  '供应商EBS编码': 'supplierEbsCode',
  '客户EBS编码': 'customerEbsCode',
  '企业认证国家/地区': 'certifiedCountryRegion',
  '企业名称_1': 'companyName_1', 
  '公司名称(辅助)': 'companyNameAuxiliary',
  '是否黑名单': 'isBlacklist',
  '注册国家/地区': 'registrationCountryRegion',
  '注册地址': 'registrationAddress',
  '统一社会信用码': 'unifiedSocialCreditCode',
  '营业执照编号/商业登记证编号': 'businessLicenseNumber',
  '税务登记证编号': 'taxRegistrationNumber',
  '上市公司关联方': 'listedCompanyRelatedParty',
  '数据来源': 'dataSource',
  '参与方认证状态': 'participantCertificationStatus',
  '采购线条状态': 'procurementLineStatus',
  '采购线条提交时间': 'procurementLineSubmitTime',
  '采购线条审批完成时间': 'procurementLineApprovalTime',
  'ICTS线条状态': 'ictsLineStatus',
  'ICTS线条提交时间': 'ictsLineSubmitTime',
  'ICTS线条审批完成时间': 'ictsLineApprovalTime',
  '标准产品线条状态': 'standardProductLineStatus',
  '产品线条提交时间': 'productLineSubmitTime',
  '产品线条审批完成时间': 'productLineApprovalTime',
  '简易支出线条状态': 'simpleExpenditureLineStatus',
  '简易支出线条提交时间': 'simpleExpenditureLineSubmitTime',
  '简易支出线条审批完成时间': 'simpleExpenditureLineApprovalTime',
  '移动部线条状态': 'mobileDeptLineStatus',
  '移动部线条提交时间': 'mobileDeptLineSubmitTime',
  '移动部线条审批完成时间': 'mobileDeptLineApprovalTime',
  '运营商部线条状态': 'operatorDeptLineStatus',
  '运营商部线条提交时间': 'operatorDeptLineSubmitTime',
  '运营商部线条审批完成时间': 'operatorDeptLineApprovalTime',
  '渠道商线条状态': 'channelLineStatus',
  '渠道商线条提交时间': 'channelLineSubmitTime',
  '渠道商线条审批完成时间': 'channelLineApprovalTime',
  '无忧行商户线条状态': 'jegoTripMerchantLineStatus',
  '无忧行商户线条提交时间': 'jegoTripMerchantLineSubmitTime',
  '无忧行商户线条审批完成时间': 'jegoTripMerchantLineApprovalTime',
  '承办人': 'undertaker',
  '承办部门': 'undertakerDept',
  '客户准入状态': 'customerAccessStatus',
  '客户失效日期': 'customerExpirationDate',
  '客户失效原因': 'customerExpirationReason',
  '供应商状态': 'supplierStatus',
  '供应商失效日期': 'supplierExpirationDate',
  '供应商失效原因': 'supplierExpirationReason',
  '公司注册日期': 'companyRegistrationDate',
  '通讯地址': 'communicationAddress',
  '通讯地址是否与注册地一致': 'isCommunicationAddressSameAsRegistration',
  '公司电话号': 'companyPhoneNumber',
  '公司传真号': 'companyFaxNumber',
  '企业邮箱': 'companyEmail',
  '官方网站': 'officialWebsite',
  '是否邮件通知': 'isEmailNotification',
  '数据来源_1': 'dataSource_1',
  '采购品类': 'procurementCategory',
  '采购品类说明': 'procurementCategoryDescription'
};

const contactMap = {
  '企业编号': 'companyCode',
  '参与方公司名称': 'participantCompanyName',
  'COMPANY_ID': 'companyId',
  '联系人姓名': 'contactName',
  '职位': 'position',
  '联系人类型': 'contactType',
  '售后服务升级等级': 'afterSalesServiceEscalationLevel',
  '联系人电话': 'contactPhone',
  '客服号码2': 'customerServiceNumber2',
  '客服号码3': 'customerServiceNumber3',
  '电子邮箱': 'email',
  '联系人传真': 'contactFax',
  'CMI对接人': 'cmiContactPerson',
  '备注': 'remark',
  '默认': 'isDefault',
  '启用': 'isEnabled',
  'SLA': 'sla'
};

const mappingMap = {
  'COMPANY_NUM': 'companyNum',
  'COMPANY_NAME': 'companyName',
  'EXT_CUST_ID': 'extCustId',
  'EXT_CUST_NUM': 'extCustNum',
  'COMPANY_ID': 'companyId'
};

// 转换数据的函数
function transformData(data, mapObj) {
  return data.map(row => {
    const newRow = {};
    for (const key in row) {
      let mappedKey = mapObj[key.trim()] || key.trim();
      newRow[mappedKey] = row[key];
    }
    return newRow;
  });
}

// 定义Mongoose Models
const participantSchema = new mongoose.Schema({}, { strict: false });
const contactSchema = new mongoose.Schema({}, { strict: false });
const mappingSchema = new mongoose.Schema({}, { strict: false });

const Participant = mongoose.model('excelParticipants', participantSchema, 'excelParticipants');
const Contact = mongoose.model('excelParticipantContacts', contactSchema, 'excelParticipantContacts');
const Mapping = mongoose.model('excelParticipantCustMapping', mappingSchema, 'excelParticipantCustMapping');

async function importExcel() {
  const filePath = '/Users/tristan/Documents/CMI/01-专网及应用中心/07-行业/战客运营管理平台/数据治理/参与方信息(20260604)不含银行信息更新加companyid.xlsx';
  
  console.log('开始连接数据库...');
  await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/node-boilerplate', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('数据库连接成功。');

  console.log('读取Excel文件...');
  const workbook = xlsx.readFile(filePath);
  
  // Sheet 1: 参与方信息
  const sheet1Name = '参与方信息';
  if (workbook.Sheets[sheet1Name]) {
    console.log(`处理 ${sheet1Name} ...`);
    const data1 = xlsx.utils.sheet_to_json(workbook.Sheets[sheet1Name]);
    const transformedData1 = transformData(data1, participantMap);
    await Participant.deleteMany({});
    await Participant.insertMany(transformedData1);
    console.log(`已成功导入 ${transformedData1.length} 条记录到 excelParticipants 表。`);
  }

  // Sheet 2: 参与方信息.联系人信息
  const sheet2Name = '参与方信息.联系人信息';
  if (workbook.Sheets[sheet2Name]) {
    console.log(`处理 ${sheet2Name} ...`);
    const data2 = xlsx.utils.sheet_to_json(workbook.Sheets[sheet2Name]);
    const transformedData2 = transformData(data2, contactMap);
    await Contact.deleteMany({});
    await Contact.insertMany(transformedData2);
    console.log(`已成功导入 ${transformedData2.length} 条记录到 excelParticipantContacts 表。`);
  }

  // Sheet 3: 参与方和iBOSSCUSTID
  const sheet3Name = '参与方和iBOSSCUSTID';
  if (workbook.Sheets[sheet3Name]) {
    console.log(`处理 ${sheet3Name} ...`);
    const data3 = xlsx.utils.sheet_to_json(workbook.Sheets[sheet3Name]);
    const transformedData3 = transformData(data3, mappingMap);
    await Mapping.deleteMany({});
    await Mapping.insertMany(transformedData3);
    console.log(`已成功导入 ${transformedData3.length} 条记录到 excelParticipantCustMapping 表。`);
  }

  console.log('导入完成，断开数据库连接。');
  await mongoose.disconnect();
}

importExcel().catch(err => {
  console.error('导入过程中发生错误:', err);
  process.exit(1);
});
