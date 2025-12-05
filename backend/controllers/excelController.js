import { parseExcelAndSuggestCharts } from '../services/excelChartSuggestService.js';
import path from 'path';
import { generateChartImage } from '../services/chartImageService.js';

export const uploadExcelAndSuggest = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    // Prefer buffer (from multer) if available; otherwise fallback to path
    const input = req.file.buffer || path.join(path.resolve(), req.file.path);
    const chartType = req.body.chartType || 'bar';
    const result = parseExcelAndSuggestCharts(input);

    // Only generate chart image for the first sheet
    if (result.length > 0) {
      const sheet = result[0];
      // Prepare chart data
      let labels = [];
      let datasets = [];
      if (sheet.data && sheet.data.length > 0) {
        const keys = Object.keys(sheet.data[0]);
        const labelKey = sheet.suggestedLabelKey || keys[0];
        const valueKeys = sheet.suggestedValueKeys || (sheet.suggestedValueKey ? [sheet.suggestedValueKey] : (keys.length > 1 ? [keys[1]] : [keys[0]]));
        labels = sheet.data.map(row => row[labelKey]);
        datasets = valueKeys.map(vk => ({ label: vk, data: sheet.data.map(row => row[vk]) }));
      }
      // Generate chart image
      sheet.uploadedImage = await generateChartImage(chartType, labels, datasets, sheet.sheetName);
    }
    res.json({ sheets: result });
  } catch (err) {
    console.error('Excel suggest error:', err?.message || err);
    console.error(err?.stack || err);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
};
