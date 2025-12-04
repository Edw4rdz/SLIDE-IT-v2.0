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
function ChartPreview({ type, labels, values, title }) {
  const canvasId = React.useMemo(
    () => `excel-chart-preview-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !Array.isArray(labels) || !Array.isArray(values)) return;

    const numericValues = values.map((v) =>
      typeof v === "number" ? v : Number(v) || 0
    );

    if (!numericValues.some((v) => v && !Number.isNaN(v))) return;

    const chart = new ChartJS(ctx, {
      type: type === "pie" ? "pie" : type === "line" ? "line" : "bar",
      data: {
        labels,
        datasets: [
          {
            label: title || "Series",
            data: numericValues,
            backgroundColor:
              type === "pie"
                ? [
                    "rgba(75, 192, 192, 0.6)",
                    "rgba(255, 159, 64, 0.6)",
                    "rgba(54, 162, 235, 0.6)",
                    "rgba(153, 102, 255, 0.6)",
                    "rgba(255, 205, 86, 0.6)",
                  ]
                : "rgba(75, 192, 192, 0.5)",
            borderColor:
              type === "pie"
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type === "pie",
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
        maxWidth: 480,
        height: 260,
        margin: "10px 0 16px",
        padding: 12,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
      }}
    >
      <canvas id={canvasId} />
    </div>
  );
}

export default function ExcelToPPT() {
  // ...existing state...
  const [chartSummary, setChartSummary] = useState("");
  const [autoChartSummary, setAutoChartSummary] = useState("");
  const [file, setFile] = useState(null);
  const [excelSuggestions, setExcelSuggestions] = useState([]);
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

  // Upload Excel and get chart suggestions
  const handleSuggestCharts = async () => {
    if (!file) return notify("Please select an Excel file first", "error");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("/api/excel/upload-excel", formData);
      setExcelSuggestions(res.data.sheets || []);
      // Auto-generate a summary for the first chart
      if (res.data.sheets && res.data.sheets.length > 0) {
        const sheet = res.data.sheets[0];
        // Simple auto-summary: e.g., "Sales increased from Jan to May."
        if (sheet.data && sheet.data.length > 1) {
          const keys = Object.keys(sheet.data[0]);
          const labelKey = keys[0];
          const valueKey = keys[1];
          const firstLabel = sheet.data[0][labelKey];
          const lastLabel = sheet.data[sheet.data.length - 1][labelKey];
          const firstValue = sheet.data[0][valueKey];
          const lastValue = sheet.data[sheet.data.length - 1][valueKey];
          setAutoChartSummary(`From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`);
          setChartSummary(`From ${firstLabel} to ${lastLabel}, ${valueKey} changed from ${firstValue} to ${lastValue}.`);
        }
      }
    } catch (err) {
      notify("Failed to get chart suggestions", "error");
    }
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
        const chartSheet = excelSuggestions[0];
        formData.append("chartType", chartSheet.chartType);
        formData.append("chartData", JSON.stringify(chartSheet.data));
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

                  {/* Display chart suggestions */}
                  {excelSuggestions.length > 0 && (
                    <div className="ai-card" style={{ marginTop: 20 }}>
                      <h3>Chart Suggestions</h3>
                      {excelSuggestions.map((sheet, idx) => {
                        let labels = [];
                        let values = [];
                        if (sheet.data && sheet.data.length > 0) {
                          const keys = Object.keys(sheet.data[0]);
                          if (keys.length >= 2) {
                            labels = sheet.data.map((row) => row[keys[0]]);
                            values = sheet.data.map((row) => row[keys[1]]);
                          }
                        }
                        return (
                          <div key={sheet.sheetName} style={{ marginBottom: 24 }}>
                            <strong>Sheet:</strong> {sheet.sheetName}{" "}
                            <strong>Suggested chart:</strong> {sheet.chartType}
                            <ChartPreview
                              type={sheet.chartType}
                              labels={labels}
                              values={values}
                              title={sheet.sheetName}
                            />
                            <pre
                              style={{
                                fontSize: 12,
                                background: "#f6f6f6",
                                padding: 8,
                                borderRadius: 4,
                                overflowX: "auto",
                              }}
                            >
                              {JSON.stringify(
                                sheet.data.slice(0, 3),
                                null,
                                2
                              )}
                              {sheet.data.length > 3 ? "\n...and more" : ""}
                            </pre>
                            {/* Only show summary field for first chart */}
                            {idx === 0 && (
                              <div style={{ marginTop: 16 }}>
                                <label htmlFor="chart-summary">
                                  <strong>Chart Summary (edit or use auto):</strong>
                                </label>
                                <textarea
                                  id="chart-summary"
                                  value={chartSummary}
                                  onChange={(e) => setChartSummary(e.target.value)}
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    marginTop: 8,
                                    padding: 8,
                                    borderRadius: 4,
                                    border: "1px solid #ccc",
                                  }}
                                />
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#888",
                                    marginTop: 4,
                                  }}
                                >
                                  Auto-generated: {autoChartSummary}
                                </div>
                              </div>
                            )}
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
