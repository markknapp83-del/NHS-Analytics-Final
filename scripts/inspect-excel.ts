import * as XLSX from 'xlsx';
import * as path from 'path';

const excelPath = path.join(__dirname, 'icb-partners.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('📊 Workbook structure:\n');
console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n📄 Sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  console.log(`  Rows: ${data.length}`);
  console.log('\n  First 10 rows:');
  data.slice(0, 10).forEach((row, i) => {
    console.log(`  ${i}: ${JSON.stringify(row)}`);
  });
});
