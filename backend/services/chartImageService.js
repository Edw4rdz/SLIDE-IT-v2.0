import axios from 'axios';

/**
 * Generate a chart image using QuickChart API
 * @param {string} chartType - 'bar', 'line', 'pie', etc.
 * @param {Array} labels - Array of label strings
 * @param {Array|Array[]} datasets - Array of dataset objects or values
 * @param {string} title - Chart title
 * @returns {Promise<string>} - URL to the generated chart image
 */
export async function generateChartImage(chartType, labels, datasets, title = '') {
  // Validate and normalize datasets
  let normalizedDatasets = [];
  if (Array.isArray(datasets) && datasets.length > 0 && datasets[0].data) {
    normalizedDatasets = datasets.map(ds => ({
      ...ds,
      data: Array.isArray(ds.data) ? ds.data.map(v => (typeof v === 'number' ? v : Number(v) || 0)) : [],
    }));
  } else if (Array.isArray(datasets) && datasets.length > 0) {
    normalizedDatasets = [
      {
        label: title || 'Series',
        data: datasets.map(v => (typeof v === 'number' ? v : Number(v) || 0)),
      },
    ];
  } else {
    normalizedDatasets = [
      {
        label: title || 'Series',
        data: [],
      },
    ];
  }

  const config = {
    type: chartType,
    data: {
      labels,
      datasets: normalizedDatasets,
    },
    options: {
      title: {
        display: !!title,
        text: title,
      },
      legend: {
        display: true,
      },
    },
  };
  console.log('[QuickChart Config]', JSON.stringify(config, null, 2));

  const url = 'https://quickchart.io/chart';
  try {
    const response = await axios.post(url, { chart: config }, { responseType: 'arraybuffer' });
    // Convert image buffer to base64 data URL
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error('QuickChart error:', err?.message || err);
    return '';
  }
}
