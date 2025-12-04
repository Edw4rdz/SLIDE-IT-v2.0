import XLSX from 'xlsx';

function suggestChartType(data) {
  if (data.length < 2) return 'table';
  const headers = Object.keys(data[0]);
  if (headers.length === 2) {
    return 'bar';
  }
  if (headers.length > 2) {
    return 'line';
  }
  return 'table';
}

export function parseExcelAndSuggestCharts(filePath) {
  const workbook = XLSX.readFile(filePath);
  const result = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    const chartType = suggestChartType(data);
    result.push({ sheetName, chartType, data });
  });
  return result;
}