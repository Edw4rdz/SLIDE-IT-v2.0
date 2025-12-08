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
        // Coerce labels to strings and replace null/undefined with empty string so Chart.js doesn't render 'null'
        labels = sheet.data.map(row => {
          const v = row[labelKey];
          return v === null || v === undefined ? '' : String(v);
        });
        // Ensure dataset values are numbers or null (already sanitized in service), keep as-is but coerce numeric-like strings
        datasets = valueKeys.map(vk => ({
          label: vk,
          data: sheet.data.map(row => {
            const val = row[vk];
            if (val === null || val === undefined || val === '') return null;
            if (typeof val === 'number') return val;
            const n = Number(String(val).replace(/[,\s]+/g, ''));
            return Number.isFinite(n) ? n : null;
          })
        }));
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
