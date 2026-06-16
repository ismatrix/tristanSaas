const xlsx = require('xlsx');
const path = '/Users/tristan/Documents/CMI/01-专网及应用中心/07-行业/战客运营管理平台/数据治理/参与方信息(20260604)不含银行信息更新加companyid.xlsx';

try {
  const workbook = xlsx.readFile(path);
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== Sheet: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    // Get headers
    const headers = [];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[xlsx.utils.encode_cell({c: C, r: range.s.r})];
      let hdr = "UNKNOWN " + C; // <-- replace with your desired default
      if (cell && cell.t) hdr = xlsx.utils.format_cell(cell);
      headers.push(hdr);
    }
    console.log(headers);
  });
} catch (e) {
  console.error(e);
}
