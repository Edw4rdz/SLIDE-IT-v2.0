import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { notify } from "../utils/notify";
import { useNavigate } from "react-router-dom";
import "../styles/exceltoppt.css";
import Sidebar from "../components/Sidebar";
import AIProviderModal from "../components/AIProviderModal";
import ImageProviderModal from "../components/ImageProviderModal";
import { convertExcel, cache, getHistory } from "../api"; // Added getHistory

const sanitizeNumber = (raw) => {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (s === '') return null;
  s = s.replace(/[,\s]+/g, '');
  if (/^\(.+\)$/.test(s)) s = '-' + s.replace(/^\(|\)$/g, '');
  s = s.replace(/[$£€¥₩₹%]/g, '');
  s = s.replace(/[^0-9eE+\-.]/g, '');
  if (s === '' || s === '+' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default function ExcelToPPT() {
const [currentConversionId, setCurrentConversionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(null);
  const progressIntervalRef = useRef(null);
  const progressStartRef = useRef(null);
  const estimatedTotalMsRef = useRef(0);
  const [chartSummary, setChartSummary] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [excelSuggestions, setExcelSuggestions] = useState([]);
  const [selectedChartSheetIndex, setSelectedChartSheetIndex] = useState(0);
  const [showChartTypeModal, setShowChartTypeModal] = useState(false);
  const [chartTypeToGenerate, setChartTypeToGenerate] = useState('bar');
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [pickerSheetIndex, setPickerSheetIndex] = useState(null);
  const [pickerLabelKey, setPickerLabelKey] = useState('');
  const [pickerValueKeys, setPickerValueKeys] = useState([]);
  const [autoOpenedPickerFor, setAutoOpenedPickerFor] = useState(null);
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (
      droppedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      droppedFile.type === "application/vnd.ms-excel"
    ) {
      if (droppedFile.size > 50 * 1024 * 1024) {
        notify("File too large (max 50MB)", "error");
        return;
      }
      setFile(droppedFile);
    } else {
      notify("Please upload a valid Excel file (.xlsx or .xls)", "error");
    }
  };

  // File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel"
    ) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        notify("File too large (max 50MB)", "error");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setExcelSuggestions([]);
    } else {
      notify("Please upload a valid Excel file (.xlsx or .xls)", "error");
      setFile(null);
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

  const isChartMeaningful = (sheet) => {
    if (!sheet || !Array.isArray(sheet.data) || sheet.data.length <= 1) return false;
    const keys = Object.keys(sheet.data[0] || {});
    const valueKeys = sheet.suggestedValueKeys || (sheet.suggestedValueKey ? [sheet.suggestedValueKey] : (keys.length>1 ? [keys[1]] : [keys[0]]));
    for (const k of valueKeys) {
      const vals = (sheet.data || []).map(r => {
        const v = r[k];
        if (v === null || v === undefined || String(v).trim() === '') return null;
        const n = Number(String(v).replace(/,/g, ''));
        return Number.isNaN(n) ? null : n;
      }).filter(x => x !== null);
      if (vals.length < 2) continue;
      const uniq = Array.from(new Set(vals.map(String)));
      if (uniq.length > 1) return true;
    }
    return false;
  };

  // Auto-open column picker when the suggested chart preview is invalid
  useEffect(() => {
    if (!Array.isArray(excelSuggestions) || excelSuggestions.length === 0) return;
    // Check each sheet and auto-open picker for the first one that isn't meaningful
    for (let idx = 0; idx < excelSuggestions.length; idx++) {
      const sheet = excelSuggestions[idx];
      const labelEmpty = sheet?.suggestedLabelKey === '__EMPTY' || !sheet?.suggestedLabelKey;
      const meaningful = isChartMeaningful(sheet);
      if (labelEmpty || !meaningful) {
        // auto-open for first encountered sheet only once
        if (autoOpenedPickerFor === null) {
          setAutoOpenedPickerFor(idx);
          // open picker with the sheet's defaults
          openColumnPicker(sheet, idx);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelSuggestions]);

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
        // Only set the editable chartSummary if user hasn't entered a custom summary; keep manual edits
        if (!chartSummary || chartSummary.trim() === '') setChartSummary(summary);
      }
    }
    setColumnPickerOpen(false);
    // Clear auto-open guard if we just fixed the one that was auto-opened
    if (autoOpenedPickerFor === pickerSheetIndex) setAutoOpenedPickerFor(null);
  };

  const isColumnNumeric = (sheet, key) => {
    if (!sheet || !Array.isArray(sheet.data) || !key) return false;
    const data = sheet.data || [];
    const sample = data.slice(0, Math.min(30, data.length));
    let numericCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const v = sample[i][key];
      const n = sanitizeNumber(v);
      if (n !== null) numericCount++;
    }
    return numericCount >= Math.max(1, Math.ceil(sample.length * 0.5));
  };


  // Unified Convert to PowerPoint flow
  const [pendingConvert, setPendingConvert] = useState(false);
  const handleConvert = () => {
    if (!file) return notify("Please select an Excel file first", "error");
    if (!loggedInUser?.user_id)
      return notify("You must be logged in to convert and save history.", "error");
    // Step 1: Show chart type modal first
    setShowChartTypeModal(true);
    setPendingConvert(true); // Mark that this is a convert flow
  };

  // When chart type is selected in modal, proceed to provider modal
  const handleChartTypeModalGenerate = async () => {
    setShowChartTypeModal(false);
    // If this is from the convert flow, fetch chart suggestion and then show provider modal
    if (pendingConvert) {
      setIsLoading(true);
      setLoadingText("Generating chart suggestion...");
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("chartType", chartTypeToGenerate);
        // Backend should return chart image and summary for first sheet
        const res = await axios.post("/api/excel/upload-excel", formData);
        const sheets = res.data.sheets || [];
        if (sheets.length === 0) throw new Error("No chart suggestions found");
        setExcelSuggestions(sheets);
        setSelectedChartSheetIndex(0);
        // Optionally, set chart summary for first sheet
        let summary = "";
        const sheet = sheets[0];
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
        setChartSummary(summary);
        // Now show provider modal
        setIsLoading(false);
        setLoadingText("");
        setShowProviderModal(true);
      } catch (err) {
        setIsLoading(false);
        setLoadingText("");
        notify("Failed to generate chart slide", "error");
        setPendingConvert(false);
      }
    }
  };

  // Provider modal selection
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

  // Final conversion: always use first chart as first slide, rest AI-generated
  // Final conversion: always use first chart as first slide, rest AI-generated
  const handleConversionStart = async (includeImages, imgProvider) => {
    setIsLoading(true);
    setLoadingText("Uploading Excel file...");
    // start simulated determinate progress
    const sCount = Number(slidesCount) || 15;
    const perSlideMs = includeImages ? 3000 : 2000;
    estimatedTotalMsRef.current = sCount * perSlideMs + 6000;
    progressStartRef.current = Date.now();
    setProgress(2);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - progressStartRef.current;
      const estTotal = Math.max(3000, estimatedTotalMsRef.current);
      let raw = Math.min(95, (elapsed / estTotal) * 90 + Math.random() * 5);
      raw = Math.max(2, raw);
      setProgress((prev) => Math.max(prev, Math.floor(raw)));
      const remainingMs = Math.max(0, estTotal * (1 - raw / 100));
      setEta(formatMs(remainingMs));
    }, 1000);
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
      
      // Always send chart info and summary for first slide
      let chartSheet = null;
      if (excelSuggestions.length > 0) {
        chartSheet = excelSuggestions[selectedChartSheetIndex] || excelSuggestions[0];
      }
      if (chartSheet) {
        formData.append("chartType", chartSheet.chartType || chartTypeToGenerate);
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
      // Capture the database ID for this conversion
      const conversionId = payload?.id;

      // ✅ PUT IT HERE:
      if (conversionId) setCurrentConversionId(conversionId);
      
      let slideArray = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.slides)
        ? payload.slides
        : [];

      // Ensure first slide is the chart, rest are AI-generated
      let chartSlide = null;
      if (chartSheet) {
        // Build chart slide object
        let summary = chartSummary;
        if (!summary && chartSheet.data && chartSheet.data.length > 1) {
          const keys = Object.keys(chartSheet.data[0]);
          const labelKey = chartSheet.suggestedLabelKey || keys[0];
          const valueKey = chartSheet.suggestedValueKey || keys[1] || keys[0];
          const firstLabel = chartSheet.data[0][labelKey];
          const lastLabel = chartSheet.data[chartSheet.data.length - 1][labelKey];
          const firstValue = chartSheet.data[0][valueKey];
          const lastValue = chartSheet.data[chartSheet.data.length - 1][valueKey];
          summary = `From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`;
        }
        // Format summary as bullet points for proper layout
        const bulletPoints = summary ? summary.split('.').filter(s => s.trim()).map(s => s.trim() + '.') : [];
        chartSlide = {
          id: 0,
          title: chartSheet.sheetName || "Chart Slide",
          uploadedImage: chartSheet.chartImageUrl || chartSheet.uploadedImage || "",
          summary,
          text: summary,
          bullets: bulletPoints.length > 0 ? bulletPoints : [summary],
          chartType: chartSheet.chartType || chartTypeToGenerate,
          chartData: chartSheet.data,
          // Add proper layout positioning for chart slides - chart on right, text on left
          imagePosition: 'right',
          imageData: { x: 0.55, y: 0.18, width: 0.4, height: 0.65 },
          bodyBox: { x: 0.05, y: 0.22, width: 0.48, height: 0.65, zIndex: 100 },
          titleBox: { x: 0.05, y: 0.06, width: 0.48, height: 0.14, zIndex: 100 },
        };
      }

      // Remove any chart slide from AI-generated slides if present (deduplication)
      if (slideArray.length && chartSlide) {
        if (
          slideArray[0]?.title === chartSlide.title ||
          (slideArray[0]?.uploadedImage && chartSlide.uploadedImage && slideArray[0].uploadedImage === chartSlide.uploadedImage)
        ) {
          slideArray = slideArray.slice(1);
        }
        // Prepend chart slide
        slideArray = [chartSlide, ...slideArray];
      }

      if (slideArray.length) {
        const slidesWithId = slideArray.map((s, idx) => ({
          ...s,
          id: idx,
        }));

        setConvertedSlides(slidesWithId);
        const newTopic = file.name.replace(/\.(xlsx|xls)$/i, "");
        setTopic(newTopic);
        setLoadingText("Conversion completed!");
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(100);
        setEta(formatMs(0));

        // --- FIX START: ROBUST DRAFT SAVING ---
        if (loggedInUser?.user_id) {
          cache.invalidate(`history-${loggedInUser.user_id}`);
        }

        // 1. Try to get ID from payload
        let validConversionId = payload?.id;

        // 2. If missing, fetch fresh history to find the ID of the item we just created
        if (!validConversionId && loggedInUser?.user_id) {
            try {
               const historyRes = await getHistory(loggedInUser.user_id);
               const historyList = historyRes.data || [];
               // The API sorts by date desc, so the first item is the newest.
               // Verify filename matches to be safe.
               if (historyList.length > 0 && historyList[0].fileName === file.name) {
                   validConversionId = historyList[0].id;
               }
            } catch (e) {
               console.warn("Could not retrieve history ID for draft saving", e);
            }
        }
        
        // 3. Update state so "Edit" button uses the correct ID
        if (validConversionId) setCurrentConversionId(validConversionId);

        // 4. Save to LocalStorage with error handling
        if (validConversionId) {
          const draftKey = `slideit_draft_${validConversionId}`;
          const draftData = { 
            slides: slidesWithId, 
            topic: newTopic, 
            design: null, 
            imageProvider: imgProvider || 'pollinations' 
          };
          try {
             localStorage.setItem(draftKey, JSON.stringify(draftData));
          } catch (err) {
             console.error("Failed to save draft to storage:", err);
             // Fallback: If quota exceeded (likely due to chart image size), 
             // save the draft WITHOUT the image so at least the slide exists in the list.
             if (err.name === 'QuotaExceededError') {
                 notify("Chart image too large for draft cache. Slide text saved.", "warning");
                 const reducedSlides = slidesWithId.map(s => s.id === 0 ? { ...s, uploadedImage: null } : s);
                 localStorage.setItem(draftKey, JSON.stringify({ ...draftData, slides: reducedSlides }));
             }
          }
        }
        // --- FIX END ---

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
      setTimeout(() => {
        setIsLoading(false);
        setLoadingText("");
        setProgress(0);
        setEta(null);
      }, 700);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setPendingConvert(false);
    }
  };

  function formatMs(ms) {
    if (ms <= 0) return '00:00';
    const totalSec = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

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
                <div 
                  className={`uploadp-area ${isDragging ? 'dragging' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
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
                  disabled={isLoading || !file || convertedSlides}
                >
                  {isLoading ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: '#4caf50', transition: 'width 400ms ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                        <span>{loadingText || 'Converting...'}</span>
                        <span>{progress}% • ETA: {eta || '--:--'}</span>
                      </div>
                    </div>
                  ) : convertedSlides ? (
                    "✅ Converted! Edit Now"
                  ) : (
                    "Convert to PowerPoint"
                  )}
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
                        </select>
                        <div style={{ textAlign: 'right' }}>
                          <button onClick={() => { setShowChartTypeModal(false); setPendingConvert(false); }} style={{ marginRight: 8, padding: '8px 14px' }}>Cancel</button>
                          <button onClick={handleChartTypeModalGenerate} style={{ padding: '8px 14px', background: '#0ea5a5', color: 'white', borderRadius: 6 }}>Generate</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chart suggestions UI removed as requested */}

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
                            imageProvider: selectedImageProvider,
                            convId: currentConversionId, // Pass historyId for draft saving
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
                  <label htmlFor="slidesCount">Number of Slides (max 50)</label>
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
                      min="1"
                      max="50"
                      value={slidesCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSlidesCount('');
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 1 && num <= 50) setSlidesCount(num);
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value);
                        if (e.target.value === '' || isNaN(num) || num < 1) {
                          setSlidesCount(1);
                        } else if (num > 50) {
                          setSlidesCount(50);
                        }
                      }}
                      className="slide-input"
                    />
                    <button
                      className="slide-btn plus"
                      onClick={() => setSlidesCount((prev) => Math.min(50, prev + 1))}
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
                <h3>Features</h3>
                <ul>
                  <li>Supports .xlsx and .xls formats</li>
                  <li>AI-powered data transformation</li>
                  <li>Max file size: 50MB</li>
                  <li>Customizable slide count</li>
                  Note: <strong>The system does not yet support live chart editing!</strong>
                </ul>
              </div>

              <div className="ai-info-box">
                <h3>Tips</h3>
                <ul>
                  <li>Include well-structured headers for better results.</li>
                  <li>Keep large files under 50MB.</li>
                   <li>Try 5–15 slides for best balance.</li>
                   <li>Above 20 Slides may affect performance.</li>
                  Note: <strong>Processing may take longer than usual. Kindly be patient.</strong>
                  <li>Edit in the next page before downloading.</li>
                Note: <strong>AI may contain inaccuracies. Please review carefully!</strong>
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
            <p style={{ marginBottom: 12, color: '#555' }}>Please select the label and value columns for your chart.</p>
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
