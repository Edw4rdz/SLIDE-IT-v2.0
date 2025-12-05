import React, { useState, useRef } from "react";
import axios from "axios";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import { convertExcel, cache } from "../api";
import "../styles/exceltoppt.css";
import Sidebar from "../components/Sidebar";
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";
import { useEffect } from "react";
import { Chart as ChartJS } from "chart.js/auto";

// Simple, isolated chart preview using a <canvas> to avoid React child issues
function ChartPreview({ type, labels, values, datasets, title }) {
  const canvasId = React.useMemo(
    () => `excel-chart-preview-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !Array.isArray(labels) || (!Array.isArray(values) && !(Array.isArray(datasets) && datasets.length > 0))) return;

    const numericValues = Array.isArray(values)
      ? values.map((v) => (typeof v === "number" ? v : Number(v) || 0))
      : null;

    const anyNumeric = (numericValues && numericValues.some((v) => v && !Number.isNaN(v))) || (Array.isArray(datasets) && datasets.some(ds => Array.isArray(ds.data) && ds.data.some(v => !Number.isNaN(Number(v))))) ;
    if (!anyNumeric) return;

    const finalDatasets = Array.isArray(datasets) && datasets.length
      ? datasets.map((d, i) => ({
          ...d,
          data: d.data.map(v => (typeof v === 'number' ? v : Number(v) || 0)),
          backgroundColor: d.backgroundColor || (type === 'pie' ? [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 159, 64, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 205, 86, 0.6)',
            ] : 'rgba(75, 192, 192, 0.5)'),
          borderColor: d.borderColor || (type === 'pie' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(75, 192, 192, 1)'),
          borderWidth: d.borderWidth || 1,
        }))
      : [{
          label: title || 'Series',
          data: numericValues || [],
          backgroundColor: type === 'pie'
            ? [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 159, 64, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 205, 86, 0.6)',
            ] : 'rgba(75, 192, 192, 0.5)',
          borderColor: type === 'pie' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }];

    const chart = new ChartJS(ctx, {
      type: type === 'pie' ? 'pie' : type === 'line' ? 'line' : 'bar',
      data: { labels, datasets: finalDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
              legend: {
                display: type === 'pie' || (finalDatasets && finalDatasets.length > 1),
              },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [canvasId, labels, values, type, title]);

  return (
    <div
      style={{
        maxWidth: 900,
        width: '100%',
        height: 0,
        paddingBottom: '56.25%', // 16:9 aspect ratio
        position: 'relative',
        margin: "18px 0 24px",
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
      }}
    >
      <canvas id={canvasId} width={880} height={495} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

export default function ExcelToPPT() {
  // ...existing state...
  const [chartSummary, setChartSummary] = useState("");
  const [autoChartSummary, setAutoChartSummary] = useState("");
  const [file, setFile] = useState(null);
  const [excelSuggestions, setExcelSuggestions] = useState([]);
  const [selectedChartSheetIndex, setSelectedChartSheetIndex] = useState(0);
  const [showChartTypeModal, setShowChartTypeModal] = useState(false);
  const [chartTypeToGenerate, setChartTypeToGenerate] = useState('bar');
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pickerSheetIndex, setPickerSheetIndex] = useState(null);
  const [pickerLabelKey, setPickerLabelKey] = useState('');
  const [pickerValueKeys, setPickerValueKeys] = useState([]);
  const [slidesCount, setSlidesCount] = useState(15);
  const [convertedSlides, setConvertedSlides] = useState(null);
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showImageProviderModal, setShowImageProviderModal] = useState(false);
  const [includeImagesChoice, setIncludeImagesChoice] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("grockai");
  const [selectedImageProvider, setSelectedImageProvider] = useState("pollinations");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || null;

  // File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel"
    ) {
      setFile(selectedFile);
      setExcelSuggestions([]);
    } else {
      notify("Please upload a valid Excel file (.xlsx or .xls)", "error");
      setFile(null);
    }
  };

  // Show chart type modal before generating chart
  const handleSuggestCharts = () => {
    if (!file) return notify("Please select an Excel file first", "error");
    setShowChartTypeModal(true);
  };

  // Generate chart slide after chart type is selected
  const handleGenerateChartSlide = async () => {
    setShowChartTypeModal(false);
    setIsLoading(true);
    setLoadingText("Generating chart slide...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chartType", chartTypeToGenerate);
      // Backend should return chart image and summary for first sheet
      const res = await axios.post("/api/excel/upload-excel", formData);
      const sheets = res.data.sheets || [];
      if (sheets.length === 0) throw new Error("No chart suggestions found");
      const sheet = sheets[0];
      // Generate summary
      let summary = "";
      if (sheet.data && sheet.data.length > 1) {
        const keys = Object.keys(sheet.data[0]);
        const labelKey = sheet.suggestedLabelKey || keys[0];
        const valueKey = sheet.suggestedValueKey || keys[1] || keys[0];
        const firstLabel = sheet.data[0][labelKey];
        const lastLabel = sheet.data[sheet.data.length - 1][labelKey];
        const firstValue = sheet.data[0][valueKey];
        const lastValue = sheet.data[sheet.data.length - 1][valueKey];
        summary = `From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`;
      }
      // Chart image URL (assume backend returns chartImageUrl)
      const chartImageUrl = sheet.chartImageUrl || sheet.uploadedImage || "";
      // Create slide object
      const slide = {
        id: 0,
        title: sheet.sheetName || "Chart Slide",
        uploadedImage: chartImageUrl,
        summary,
        chartType: chartTypeToGenerate,
        chartData: sheet.data,
      };
      // Go to edit-preview with this slide
      navigate("/edit-preview", {
        state: {
          slides: [slide],
          topic: file.name.replace(/\.(xlsx|xls)$/i, ""),
          includeImages: true,
          imageProvider: null,
        },
      });
    } catch (err) {
      notify("Failed to generate chart slide", "error");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const openColumnPicker = (sheet, idx) => {
    if (!sheet || !Array.isArray(sheet.data) || sheet.data.length === 0) return;
    const keys = Object.keys(sheet.data[0] || {});
    setPickerSheetIndex(idx);
    setPickerLabelKey(sheet.suggestedLabelKey || keys[0] || '');
    setPickerValueKeys(sheet.suggestedValueKeys || (sheet.suggestedValueKey ? [sheet.suggestedValueKey] : (keys.length>1 ? [keys[1]] : [keys[0]])));
    setColumnPickerOpen(true);
  };

  const applyColumnPicker = () => {
    if (pickerSheetIndex === null) return;
    const copy = [...excelSuggestions];
    copy[pickerSheetIndex] = {
      ...copy[pickerSheetIndex],
      suggestedLabelKey: pickerLabelKey,
      suggestedValueKeys: pickerValueKeys,
    };
    setExcelSuggestions(copy);
    // If we just updated the first suggestion (used for conversion preview), refresh the auto summary
    if (pickerSheetIndex === 0) {
      const sheet = copy[0];
      if (sheet && sheet.data && sheet.data.length > 1) {
        const labelKey = sheet.suggestedLabelKey || Object.keys(sheet.data[0])[0];
        const valueKey = sheet.suggestedValueKey || Object.keys(sheet.data[0])[1] || Object.keys(sheet.data[0])[0];
        const firstLabel = sheet.data[0][labelKey];
        const lastLabel = sheet.data[sheet.data.length - 1][labelKey];
        const firstValue = sheet.data[0][valueKey];
        const lastValue = sheet.data[sheet.data.length - 1][valueKey];
        const summary = `From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`;
        setAutoChartSummary(summary);
        // Only set the editable chartSummary if user hasn't entered a custom summary; keep manual edits
        if (!chartSummary || chartSummary.trim() === '') setChartSummary(summary);
      }
    }
    setColumnPickerOpen(false);
  };

  const isColumnNumeric = (sheet, key) => {
    if (!sheet || !Array.isArray(sheet.data) || !key) return false;
    const data = sheet.data;
    // require at least one numeric
    let numericCount = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i][key];
      if (v === null || v === undefined || String(v).trim() === '') continue;
      const n = Number(String(v).replace(/,/g, ''));
      if (!Number.isNaN(n)) numericCount++;
    }
    return numericCount >= Math.max(1, Math.ceil(data.length * 0.5));
  };

  // *** NEW - Same behavior as PDFToPPT ***
  // Show provider modal first
  const handleConvert = () => {
    if (!file) return notify("Please select an Excel file first", "error");
    if (!loggedInUser?.user_id)
      return notify("You must be logged in to convert and save history.", "error");
    setShowProviderModal(true);
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setShowProviderModal(false);
    setIsModalOpen(true); // Open "Include images?" modal next
  };

  const handleImageChoice = (includeImages) => {
    setIsModalOpen(false);
    setIncludeImagesChoice(includeImages);
    if (includeImages) {
      setShowImageProviderModal(true);
    } else {
      handleConversionStart(false, null);
    }
  };

  const handleImageProviderSelect = (provider) => {
    setSelectedImageProvider(provider);
    setShowImageProviderModal(false);
    handleConversionStart(true, provider);
  };

  const handleConversionStart = async (includeImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Uploading Excel file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slideCount", String(slidesCount));
      formData.append("userId", String(loggedInUser.user_id));
      formData.append("includeImages", String(includeImages));
      formData.append("provider", selectedProvider);
      if (imgProvider) {
        formData.append("imageProvider", imgProvider);
      }
      // Send chart info and summary for first slide
      if (excelSuggestions.length > 0) {
      const chartSheet = excelSuggestions[selectedChartSheetIndex] || excelSuggestions[0];
        formData.append("chartType", chartSheet.chartType);
        // send a reduced chartData object containing only label/value columns where possible
        const keys = Object.keys(chartSheet.data?.[0] || {});
        const labelKey = chartSheet.suggestedLabelKey || keys[0];
        const valueKeys = chartSheet.suggestedValueKeys || (chartSheet.suggestedValueKey ? [chartSheet.suggestedValueKey] : (keys.length>1 ? [keys[1]] : [keys[0]]));
        const reduced = (chartSheet.data || []).map(row => {
          const r = { [labelKey]: row[labelKey] };
          for (const k of valueKeys) r[k] = row[k];
          return r;
        });
        formData.append("chartData", JSON.stringify(reduced));
        formData.append("chartSummary", chartSummary);
      }

      setLoadingText("Converting Excel to slides...");
      const response = await convertExcel(formData);
      const payload = response?.data;
      const slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      if (slideArray.length) {
        const slidesWithId = slideArray.map((s, idx) => ({
          ...s,
          id: idx,
        }));

        setConvertedSlides(slidesWithId);
        setTopic(file.name.replace(/\.(xlsx|xls)$/i, ""));
        setLoadingText("Conversion completed!");

        if (loggedInUser?.user_id) {
          cache.invalidate(`history-${loggedInUser.user_id}`);
        }

        notify("Conversion successful! You can now preview or edit it.", "success");
      } else {
        const errorMsg =
          payload?.error ||
          response?.error ||
          "Conversion failed: Invalid response from server.";
        notify(errorMsg, "error");
      }
    } catch (err) {
      console.error("Excel conversion error:", err);
      notify(
        `Conversion failed: ${
          err.response?.data?.error || err.message
        }`,
        "error"
      );
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activePage="dashboard" />

      <main className="main">
        <div className="ai-container exceltoppt">
          <header className="headerp">
            <div className="headerp-icon">XLSX</div>
            <div>
              <h1>Excel to PPT Converter</h1>
              <p>Transform your Excel sheets into editable AI slides</p>
            </div>
          </header>

          <div className="ai-content">
            {/* Left */}
            <div className="ai-left">
              <div className="ai-card ai-card-top">
                <h2>Upload Your Excel File</h2>
                <div className="uploadp-area">
                  <div className="uploadp-icon">⬆</div>
                  <h3>
                    Drop your Excel file here, or{" "}
                    <span
                      className="browsep"
                      onClick={() => fileInputRef.current.click()}
                    >
                      browse
                    </span>
                  </h3>
                  <p>Supports .xlsx and .xls files up to 50MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  {file && <p className="file-name">📄 {file.name}</p>}
                </div>

                <button
                  onClick={handleConvert}
                  className="uploadp-btn"
                  disabled={isLoading || !file}
                >
                  {isLoading ? (
                    <div className="progress-bar-container">
                      <div className="progress-bar-indeterminate"></div>
                      <span className="progress-text">{loadingText}</span>
                    </div>
                  ) : convertedSlides ? (
                    "✅ Converted! Edit Now"
                  ) : (
                    "Convert to PowerPoint"
                  )}
                </button>

                  {/* Button to get chart suggestions */}
                  <button
                    onClick={handleSuggestCharts}
                    className="uploadp-btn"
                    disabled={!file}
                    style={{ marginTop: 10 }}
                  >
                    Suggest Charts from Excel
                  </button>

                  {/* Chart Type Selection Modal */}
                  {showChartTypeModal && (
                    <div className="modal" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                      <div className="modal-content" style={{ width: 340, background: '#fff', padding: 24, borderRadius: 8 }}>
                        <h3>Select Chart Type</h3>
                        <select value={chartTypeToGenerate} onChange={e => setChartTypeToGenerate(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 16, marginBottom: 18 }}>
                          <option value="bar">Bar</option>
                          <option value="line">Line</option>
                          <option value="pie">Pie</option>
                          <option value="table">Table</option>
                        </select>
                        <div style={{ textAlign: 'right' }}>
                          <button onClick={() => setShowChartTypeModal(false)} style={{ marginRight: 8, padding: '8px 14px' }}>Cancel</button>
                          <button onClick={handleGenerateChartSlide} style={{ padding: '8px 14px', background: '#0ea5a5', color: 'white', borderRadius: 6 }}>Generate</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Display chart suggestions */}
                  {excelSuggestions.length > 0 && (
                    <div className="ai-card" style={{ marginTop: 20 }}>
                      <h3>Chart Suggestions</h3>
                      {excelSuggestions.map((sheet, idx) => {
                        let labels = [];
                        let values = [];
                        let datasets = null;
                        if (sheet.data && sheet.data.length > 0) {
                          const keys = Object.keys(sheet.data[0]);
                          const labelKey = sheet.suggestedLabelKey || keys[0];
                          const valueKeys = sheet.suggestedValueKeys || (sheet.suggestedValueKey ? [sheet.suggestedValueKey] : (keys.length>1 ? [keys[1]] : [keys[0]]));
                          if (labelKey && valueKeys && valueKeys.length) {
                            labels = sheet.data.map((row) => row[labelKey]);
                            datasets = valueKeys.map((vk, i) => ({ label: vk, data: sheet.data.map(row => row[vk]) }));
                            // if only one dataset, keep legacy `values` prop for ChartPreview compatibility
                            if (datasets.length === 1) values = datasets[0].data;
                          }
                        }
                        return (
                          <div key={sheet.sheetName} style={{ marginBottom: 24 }}>
                            <strong>Sheet:</strong> {sheet.sheetName}{" "}
                            <strong>Chart type:</strong>
                            <select
                              value={sheet._userChartType || ((sheet.chartType === 'table' || sheet.suggestedLabelKey === '__EMPTY' || !pickerValueKeys.some(k => isColumnNumeric(sheet, k))) ? 'table' : sheet.chartType)}
                              onChange={e => {
                                const copy = [...excelSuggestions];
                                copy[idx]._userChartType = e.target.value;
                                setExcelSuggestions(copy);
                              }}
                              style={{ marginLeft: 8, padding: '4px 8px', fontSize: 15, borderRadius: 6, border: '1px solid #ddd' }}
                            >
                              <option value="bar">Bar</option>
                              <option value="line">Line</option>
                              <option value="pie">Pie</option>
                              <option value="table">Table</option>
                            </select>
                            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                              <em>Using:</em> {sheet.suggestedLabelKey || 'label'} (label) and {sheet.suggestedValueKey || 'value'} (value)
                            </div>
                            {((sheet._userChartType || sheet.chartType) === 'table' || sheet.suggestedLabelKey === '__EMPTY' || !pickerValueKeys.some(k => isColumnNumeric(sheet, k))) ? (
                              <div style={{ width: '100%', minHeight: 180, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(15,23,42,0.12)', padding: 18, overflowX: 'auto', marginBottom: 18 }}>
                                <div style={{ color: '#b91c1c', fontSize: 14, marginBottom: 8 }}>
                                  No valid chart preview: please check your Excel headers and ensure you have a label column and at least one numeric value column.
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18, tableLayout: 'auto' }}>
                                  <thead>
                                    <tr>
                                      {Object.keys(sheet.data[0] || {}).map((col) => (
                                        <th key={col} style={{ borderBottom: '2px solid #eee', padding: '8px 12px', textAlign: 'left', background: '#f3f4f6', wordBreak: 'break-word', verticalAlign: 'top', fontWeight: 600 }}>{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sheet.data.slice(0, 10).map((row, i) => (
                                      <tr key={i}>
                                        {Object.keys(row).map((col) => (
                                            <td key={col} style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 12px', wordBreak: 'break-word', verticalAlign: 'top' }}>{row[col]}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {sheet.data.length > 10 && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>(showing first 10 rows)</div>}
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'row', marginTop: 12 }}>
                                  <button
                                    style={{ padding: '6px 10px', borderRadius: 6, background: '#efefef', border: '1px solid #ddd' }}
                                    onClick={() => openColumnPicker(sheet, idx)}
                                  >
                                    Edit columns
                                  </button>
                                  <button
                                    style={{ padding: '6px 10px', borderRadius: 6, background: selectedChartSheetIndex === idx ? '#6ee7b7' : '#eef1f3', border: '1px solid #ddd' }}
                                    onClick={() => setSelectedChartSheetIndex(idx)}
                                  >
                                    {selectedChartSheetIndex === idx ? 'Using as chart' : 'Use as chart'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ChartPreview
                                  type={sheet._userChartType || sheet.chartType}
                                  labels={labels}
                                  values={values}
                                  datasets={datasets}
                                  title={sheet.sheetName}
                                />
                                <div style={{ marginLeft: 12, display: 'flex', gap: 8, flexDirection: 'column' }}>
                                  <button
                                    style={{ padding: '6px 10px', borderRadius: 6, background: '#efefef', border: '1px solid #ddd' }}
                                    onClick={() => openColumnPicker(sheet, idx)}
                                  >
                                    Edit columns
                                  </button>
                                  <button
                                    style={{ padding: '6px 10px', borderRadius: 6, background: selectedChartSheetIndex === idx ? '#6ee7b7' : '#eef1f3', border: '1px solid #ddd' }}
                                    onClick={() => setSelectedChartSheetIndex(idx)}
                                  >
                                    {selectedChartSheetIndex === idx ? 'Using as chart' : 'Use as chart'}
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* JSON preview removed. Chart/table preview enlarged below. */}
                            {/* Chart summary section removed as requested */}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {convertedSlides && (
                  <div className="success-card">
                    <div className="success-header">
                      <div className="success-icon">✓</div>
                      <div className="success-text">
                        <h3>Slides Generated!</h3>
                        <p>Your {convertedSlides.length} slides are ready to edit.</p>
                      </div>
                    </div>
                    <button
                      className="edit-preview-btn"
                      onClick={() =>
                        navigate("/edit-preview", {
                          state: {
                            slides: convertedSlides,
                            topic,
                            includeImages: includeImagesChoice,
                            imageProvider: selectedImageProvider, // Pass the selected image provider
                          },
                        })
                      }
                    >
                      📝 Edit & Preview Slides
                    </button>
                  </div>
                )}
              </div>

              <div className="ai-card">
                <h2>Customize Your Presentation</h2>
                <div className="ai-slider-section centered-slide-control">
                  <label htmlFor="slidesCount">Number of Slides</label>
                  <div className="slide-control">
                    <button
                      className="slide-btn minus"
                      onClick={() =>
                        setSlidesCount((prev) => Math.max(1, prev - 1))
                      }
                    >
                      –
                    </button>
                    <input
                      type="number"
                      id="slidesCount"
                      value={slidesCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSlidesCount('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1) setSlidesCount(num);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          setSlidesCount(1);
                        }
                      }}
                      className="slide-input"
                    />
                    <button
                      className="slide-btn plus"
                      onClick={() => setSlidesCount((prev) => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span id="slide-count">Total Slides: {slidesCount}</span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="ai-right">
              <div className="ai-info-box">
                <h3>How it Works</h3>
                <ol>
                  <li>Upload your Excel document.</li>
                  <li>Choose number of slides.</li>
                  <li>AI automatically creates your presentation.</li>
                  <li>Preview & edit slides interactively before download.</li>
                </ol>
              </div>

              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Include well-structured headers for better results.</li>
                  <li>Keep large files under 50MB.</li>
                  <li>Use 5–15 slides for balanced detail.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Provider Modal */}
      <AIProviderModal
        isOpen={showProviderModal}
        onSelect={handleProviderSelect}
        onCancel={() => setShowProviderModal(false)}
      />

      {/* Image Provider Selection Modal */}
      <ImageProviderModal
        isOpen={showImageProviderModal}
        onSelect={handleImageProviderSelect}
        onCancel={() => setShowImageProviderModal(false)}
      />

      {/* Column Picker Modal */}
      {columnPickerOpen && pickerSheetIndex !== null && (
        <div className="modal" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ width: 560, background: '#fff', padding: 20, borderRadius: 8 }}>
            <h3>Select Label and Value Columns</h3>
            <p style={{ marginBottom: 12, color: '#555' }}>Pick which columns should be used for chart labels and numeric values.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label>Label column</label>
                <select value={pickerLabelKey} onChange={(e) => setPickerLabelKey(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 6 }}>
                  {Object.keys(excelSuggestions[pickerSheetIndex]?.data?.[0] || {}).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label>Value column</label>
                <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {Object.keys(excelSuggestions[pickerSheetIndex]?.data?.[0] || {}).map(k => (
                    <div key={k} style={{ marginBottom: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={pickerValueKeys.includes(k)}
                          onChange={(e) => {
                            if (e.target.checked) setPickerValueKeys(prev => [...prev, k]);
                            else setPickerValueKeys(prev => prev.filter(x => x !== k));
                          }}
                        />
                        <span>{k}</span>
                        <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>
                          {isColumnNumeric(excelSuggestions[pickerSheetIndex], k) ? 'numeric' : 'text'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {pickerValueKeys.length > 0 ? (
                    <span style={{ color: '#059669' }}>{pickerValueKeys.length} column(s) selected</span>
                  ) : (
                    <span style={{ color: '#b91c1c' }}>No numeric columns selected</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#444', marginBottom: 12 }}>
              <strong>Preview:</strong> {pickerLabelKey || '(none)'} vs {(pickerValueKeys || []).length ? (pickerValueKeys.join(', ')) : '(none)'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setColumnPickerOpen(false)} style={{ marginRight: 8, padding: '8px 14px' }}>Cancel</button>
              <button onClick={applyColumnPicker} style={{ padding: '8px 14px', background: '#0ea5a5', color: 'white', borderRadius: 6 }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Image choice modal */}
      {isModalOpen && (
        <div
          className="ai-image-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="ai-image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Image Generation</h2>
            <p>Do you want to include AI-generated images in your presentation?</p>

            <div className="ai-modal-buttons">
              <button
                className="ai-modal-btn text-only-btn"
                onClick={() => handleImageChoice(false)}
              >
                <span className="btn-icon">📄</span>
                <span className="btn-text">Text Only</span>
              </button>
              <button
                className="ai-modal-btn include-images-btn"
                onClick={() => handleImageChoice(true)}
              >
                <span className="btn-icon">🖼️</span>
                <span className="btn-text">Include Images</span>
              </button>
            </div>

            <button
              className="ai-modal-cancel"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
