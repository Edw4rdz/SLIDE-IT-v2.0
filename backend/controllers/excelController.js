import { parseExcelAndSuggestCharts } from '../services/excelChartSuggestService.js';
import path from 'path';

export const uploadExcelAndSuggest = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const filePath = path.join(path.resolve(), req.file.path);
  try {
    const result = parseExcelAndSuggestCharts(filePath);
    res.json({ sheets: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
};
