"use client";

import { useState } from "react";
import { Sparkles, Calendar, ChevronDown, HelpCircle, Check, MessageSquare, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, FileText, Archive, FileImage, File as FileIcon } from "lucide-react";
import { api } from "@/lib/api";
import Papa from "papaparse";

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<"paste" | "csv">("paste");
  const [demoBanner, setDemoBanner] = useState(false);

  // Format tabs
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  // Paste Note State
  const [text, setText] = useState("");
  const [entityId, setEntityId] = useState("acme_corp");
  const [entityType, setEntityType] = useState("Customer");
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);

  // CSV State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState(0);
  const [csvResults, setCsvResults] = useState<any | null>(null);

  const handleIngest = async () => {
    if (!text.trim()) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await api.ingestEvent({
        text,
        entity_id: entityId,
        entity_type: entityType,
        date
      });
      setIngestResult(res);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 403) {
        setDemoBanner(true);
      } else if (err?.status === 422) {
        alert(err?.message || err?.detail || "Invalid date — please check the date field.");
      } else {
        alert("Failed to ingest note");
      }
    } finally {
      setIngesting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        complete: (results) => {
          setPreviewRows(results.data.length);
        }
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setCsvResults(null);
    try {
      const res = await api.importCsv(file);
      setCsvResults(res);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 403) {
        setDemoBanner(true);
      } else {
        alert("Upload failed. Check console for details.");
      }
    } finally {
      setUploading(false);
      setFile(null);
      setPreviewRows(0);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 h-full min-h-full bg-[#FAFAFA] font-sans flex flex-col relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-bold text-gray-900 text-[28px] tracking-tight">Ingest New Interaction</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#DCFCE7] text-emerald-700 px-3 py-1 rounded-full text-[12px] font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cognee Remember</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#0A3020] text-white px-4 py-2 rounded-full text-[12px] font-bold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Agent Live
          </div>
          <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors shadow-sm bg-white">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex-1 flex overflow-hidden p-4 md:p-6 lg:p-8 gap-6 lg:gap-12 flex-col lg:flex-row relative">
        
        {demoBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl animate-fade-in shadow-md w-full max-w-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 text-sm font-medium">
                Demo mode is active — write operations are disabled on the public instance.
              </span>
            </div>
            <button
              onClick={() => setDemoBanner(false)}
              className="text-amber-600 hover:text-amber-800 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Left Column - Form */}
        <div className="flex-1 max-w-[600px] flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-8 border-b border-gray-100 mb-8">
            <button 
              onClick={() => setActiveTab("paste")}
              className={`pb-3 text-[14px] font-bold transition-colors ${activeTab === "paste" ? "text-gray-900 border-b-2 border-[#0A3020]" : "text-gray-400 hover:text-gray-600"}`}
            >
              Paste Note
            </button>
            <button 
              onClick={() => setActiveTab("csv")}
              className={`pb-3 text-[14px] font-bold transition-colors ${activeTab === "csv" ? "text-gray-900 border-b-2 border-[#0A3020]" : "text-gray-400 hover:text-gray-600"}`}
            >
              Upload CSV
            </button>
          </div>

          {/* Format selector (visible in CSV tab) */}
          {activeTab === "csv" && (
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                Upload Format
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "csv", label: "CSV", icon: FileSpreadsheet, desc: "Comma-separated values" },
                  { key: "txt", label: "TXT", icon: FileText, desc: "Plain text logs" },
                  { key: "pdf", label: "PDF", icon: FileImage, desc: "PDF reports" },
                  { key: "zip", label: "ZIP", icon: Archive, desc: "Compressed archives" },
                  { key: "xlsx", label: "XLSX", icon: FileIcon, desc: "Excel spreadsheets" },
                  { key: "json", label: "JSON", icon: FileIcon, desc: "Structured data" },
                  { key: "xml", label: "XML", icon: FileIcon, desc: "EDI / ERP exports" },
                ].map(fmt => {
                  const Icon = fmt.icon;
                  const isActive = activeFormat === fmt.key;
                  const isDisabled = fmt.key !== "csv";
                  return (
                    <button
                      key={fmt.key}
                      onClick={() => {
                        setActiveFormat(fmt.key);
                        if (fmt.key !== "csv") {
                          alert(`${fmt.key.toUpperCase()} import coming soon — this is a demo placeholder.`);
                        }
                      }}
                      disabled={false}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold transition-all border ${
                        isDisabled
                          ? "border-gray-100 bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100 hover:border-gray-200"
                          : isActive
                          ? "border-[#0A3020] bg-[#F0FDF4] text-[#0A3020]"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isDisabled ? "text-gray-300" : ""}`} />
                      <span>{fmt.label}</span>
                      {isDisabled && (
                        <span className="text-[9px] text-gray-400 font-medium ml-0.5">soon</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "paste" ? (
            <>
              {/* Form Fields */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Entity ID
                  </label>
                  <input 
                    type="text" 
                    value={entityId}
                    onChange={e => setEntityId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Entity Type
                  </label>
                  <div className="relative">
                    <select 
                      value={entityType}
                      onChange={e => setEntityType(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                    >
                      <option>Customer</option>
                      <option>Vendor</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Date
                  </label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-[14px] font-medium text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                    />
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="flex-1 flex flex-col mb-8">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Interaction Text
                </label>
                <div className="relative flex-1">
                  <textarea 
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter interaction notes here..."
                    className="w-full h-[280px] resize-none bg-white border border-gray-200 rounded-xl p-5 text-[14px] leading-relaxed font-medium text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <div className="absolute bottom-4 right-5 text-[11px] font-medium text-gray-400">
                    {text.length} / 2000
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleIngest}
                  disabled={ingesting}
                  className="bg-[#0A3020] hover:bg-[#072418] text-white px-6 py-3 rounded-xl text-[14px] font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {ingesting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {ingesting ? "Ingesting..." : "Ingest"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* CSV Upload UI */}
              <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-12 text-center hover:bg-gray-100 hover:border-gray-300 transition-all duration-300">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-2 text-[#1E3A2F]">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-lg font-bold text-[#111111]">
                    {file ? file.name : "Click or drag CSV file to upload"}
                  </span>
                  <span className="text-sm font-medium text-gray-400">
                    Expected columns: <span className="font-mono text-gray-500">entity_id, entity_type, date, text</span>
                  </span>
                </label>
              </div>

              {file && (
                <div className="mt-6 flex items-center justify-between bg-white shadow-[0_12px_28px_rgba(17,17,17,0.06)] p-5 rounded-xl border border-gray-100 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-[#1E3A2F]" />
                    <div className="text-gray-600 text-sm font-medium">
                      Ready to import <span className="font-bold text-[#111111] bg-gray-100 px-2 py-0.5 rounded ml-1">{previewRows} rows</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="bg-[#1E3A2F] hover:bg-[#152a22] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-[0_8px_20px_rgba(30,58,47,0.3)] transition-all duration-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                  >
                    {uploading ? "Importing..." : "Start Import"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column - Results Panels */}
        <div className="flex-1 flex flex-col gap-6 max-w-[440px]">
          
          {activeTab === "paste" && ingestResult && (
            <div className="bg-[#F8FDF9] rounded-[20px] p-8 border border-[#E5F5EF] flex-1 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative animate-fade-in">
              <div className="flex justify-between items-start mb-6">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Success State
                </div>
                <div className="bg-[#E5F5EF] text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold border border-[#DCFCE7]">
                  Auto-revealed
                </div>
              </div>

              <h2 className="text-[22px] font-bold text-gray-900 mb-8 flex items-center gap-2">
                Stored in Cognee Cloud <Check className="w-6 h-6 text-gray-900" strokeWidth={3} />
              </h2>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Event Type</div>
                  <div className="text-[14px] font-bold text-gray-900 capitalize">{ingestResult.event_type || "Note"}</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sentiment</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[78%] h-full bg-emerald-500 rounded-full" />
                    </div>
                    <div className="text-[14px] font-bold text-gray-900">{ingestResult.sentiment_intensity || "0.0"}</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Promises Found</div>
                  <div className="text-[14px] font-bold text-gray-900">{ingestResult.promises_found || "0"}</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Relationship State</div>
                  <div className={`border px-2.5 py-0.5 rounded-full text-[11px] font-bold w-fit ${
                    ingestResult.relationship_state === 'AT_RISK' ? 'bg-[#FFF8F1] border-[#FFEDD5] text-orange-600' : 'bg-[#F0FDF4] border-[#DCFCE7] text-green-600'
                  }`}>
                    {ingestResult.relationship_state || "ENGAGED"}
                  </div>
                </div>
              </div>

              {/* ERP Tags */}
              {ingestResult.erp_tags && ingestResult.erp_tags.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">ERP Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {ingestResult.erp_tags.map((tag: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-[12px] font-medium text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "csv" && csvResults && (
            <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex-1 overflow-auto animate-fade-in">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-5">
                Import Results
              </div>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <div className="text-xl font-black text-gray-900">{csvResults.total_rows}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Total</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <div className="text-xl font-black text-emerald-700">{csvResults.imported}</div>
                  <div className="text-[9px] font-bold text-emerald-600 uppercase">Ingested</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <div className="text-xl font-black text-red-600">{csvResults.errors}</div>
                  <div className="text-[9px] font-bold text-red-500 uppercase">Errors</div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold">Row</th>
                      <th className="px-4 py-3 text-[9px] uppercase tracking-widest font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {csvResults.results.slice(0, 10).map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.row}</td>
                        <td className="px-4 py-3">
                          {r.status === "ingested" ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Ingested
                            </span>
                          ) : r.status === "skipped" ? (
                            <span className="text-amber-700 font-bold text-[10px] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">Skipped</span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                              <AlertTriangle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "paste" && !ingestResult && (
            <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-5">
                Live Motion Notes
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[#F8FDF9] rounded-xl px-4 py-3 border border-emerald-50/50">
                  <span className="text-[13px] font-medium text-gray-500">Field focus</span>
                  <span className="text-[12px] font-bold text-emerald-700">Responsive</span>
                </div>
                <div className="flex items-center justify-between bg-blue-50/50 rounded-xl px-4 py-3 border border-blue-50/50">
                  <span className="text-[13px] font-medium text-gray-500">Ingest button</span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full text-[11px] font-bold">Pulsing</span>
                </div>
                <div className="flex items-center justify-between bg-purple-50/50 rounded-xl px-4 py-3 border border-purple-50/50">
                  <span className="text-[13px] font-medium text-gray-500">Result metrics</span>
                  <span className="bg-purple-100 text-purple-700 px-3 py-0.5 rounded-full text-[11px] font-bold">Animated</span>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Floating Action Button */}
      <button onClick={() => setActiveTab("paste")} className="absolute bottom-10 right-10 w-12 h-12 bg-[#0A3020] rounded-full shadow-[0_8px_30px_rgba(10,48,32,0.3)] flex items-center justify-center hover:scale-105 transition-transform" title="Switch to paste">
        <MessageSquare className="w-5 h-5 text-white" />
      </button>

    </div>
  );
}
