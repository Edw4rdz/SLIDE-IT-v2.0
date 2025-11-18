import React, { useState } from "react";
import { 
  generateSlides, 
  convertPDF, 
  convertWord, 
  convertExcel, 
  convertText, 
  downloadPPTX 
} from "../api"; // Import from your updated Api.js

const Generator = () => {
  const [activeTab, setActiveTab] = useState("topic"); // 'topic' or 'file'
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slideCount, setSlideCount] = useState(10);

  // --- 1. Handle Generation Logic ---
  const handleGenerate = async () => {
    setLoading(true);
    try {
      let response;

      if (activeTab === "topic") {
        if (!topic) return alert("Please enter a topic.");
        // Call the Topic API
        response = await generateSlides({ topic, slideCount });
      } else {
        if (!file) return alert("Please upload a file.");
        
        // Prepare FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("slideCount", slideCount);

        // Call the appropriate File API based on extension
        const ext = file.name.split(".").pop().toLowerCase();
        
        if (ext === "pdf") response = await convertPDF(formData);
        else if (ext === "docx") response = await convertWord(formData);
        else if (ext === "xlsx" || ext === "csv") response = await convertExcel(formData);
        else if (ext === "txt") response = await convertText(formData);
        else throw new Error("Unsupported file format.");
      }

      // --- 2. Success! Now Download PPTX ---
      const slidesData = response.data.data; // Assuming backend returns { success: true, data: [...] }
      
      // Define a simple default design (or pass your selected template here)
      const defaultDesign = {
        globalBackground: "#FFFFFF",
        globalTextColor: "#333333",
        font: "Arial",
      };

      await downloadPPTX(slidesData, defaultDesign, "My_Presentation.pptx");
      alert("Presentation generated and downloaded!");

    } catch (error) {
      console.error("Generation Failed:", error);
      alert("Failed to generate slides. " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-md mt-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create Presentation</h1>

      {/* Tabs */}
      <div className="flex mb-6 border-b">
        <button
          className={`pb-2 px-4 font-semibold ${activeTab === "topic" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("topic")}
        >
          From Topic
        </button>
        <button
          className={`pb-2 px-4 font-semibold ${activeTab === "file" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveTab("file")}
        >
          From File
        </button>
      </div>

      {/* Inputs */}
      <div className="mb-6">
        {activeTab === "topic" ? (
          <textarea
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter a topic (e.g., 'The Future of AI in Healthcare')"
            rows="4"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition">
            <input
              type="file"
              accept=".pdf,.docx,.txt,.xlsx"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400 mt-2">Supported: PDF, DOCX, TXT, XLSX</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="flex items-center mb-6 gap-4">
        <label className="text-sm font-medium text-gray-700">Number of Slides:</label>
        <input
          type="number"
          min="1"
          max="20"
          value={slideCount}
          onChange={(e) => setSlideCount(e.target.value)}
          className="w-20 p-2 border rounded text-center"
        />
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`w-full py-3 rounded-lg text-white font-bold transition-all ${
          loading 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg transform hover:-translate-y-0.5"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating with Grok 4.1...
          </span>
        ) : (
          "Generate Presentation"
        )}
      </button>
    </div>
  );
};

export default Generator;