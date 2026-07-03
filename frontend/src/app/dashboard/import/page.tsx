"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Papa from "papaparse";
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState(0);
  const [results, setResults] = useState<any | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Client-side parse for preview
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
    setResults(null);
    try {
      const res = await api.importCsv(file);
      setResults(res);
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
      setFile(null);
      setPreviewRows(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#111111]">
      <div className="border-b border-gray-200 px-8 pt-8 pb-6">
        <h1 className="font-bold text-2xl leading-8">
          Bulk Import Interactions
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload historical data to prime the Mnemos graph.
        </p>
      </div>

      <div className="px-8 py-8 space-y-10">
        
        <section>
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
                {uploading ? (
                  <>
                    <span className="relative w-3 h-3 flex">
                      <span className="inline-flex animate-ping opacity-70 rounded-full bg-white absolute w-full h-full" />
                      <span className="relative inline-flex w-3 h-3 rounded-full bg-white" />
                    </span>
                    Importing...
                  </>
                ) : "Start Import"}
              </button>
            </div>
          )}
        </section>

        {results && (
          <section className="animate-slide-up">
            <h2 className="font-bold text-lg tracking-tight text-[#111111] mb-4">Import Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="shadow-[0_12px_28px_rgba(17,17,17,0.04)] bg-white border border-gray-100 p-6 rounded-2xl text-center">
                <div className="text-4xl font-black text-[#111111] mb-1">{results.total_rows}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Total Rows</div>
              </div>
              <div className="shadow-[0_12px_28px_rgba(17,17,17,0.04)] bg-white border border-green-100 border-b-4 border-b-emerald-500 p-6 rounded-2xl text-center">
                <div className="text-4xl font-black text-emerald-600 mb-1">{results.imported}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Ingested</div>
              </div>
              <div className="shadow-[0_12px_28px_rgba(17,17,17,0.04)] bg-white border border-red-100 border-b-4 border-b-red-500 p-6 rounded-2xl text-center">
                <div className="text-4xl font-black text-red-600 mb-1">{results.errors}</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Errors</div>
              </div>
            </div>

            <div className="shadow-[0_12px_28px_rgba(17,17,17,0.05)] rounded-2xl bg-white border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold">Row</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold">Entity ID</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold">Promises Found</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.results.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{r.row}</td>
                      <td className="px-6 py-4 font-bold text-[#111111]">{r.entity_id || "-"}</td>
                      <td className="px-6 py-4">
                        {r.status === "ingested" ? (
                          <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Ingested
                          </span>
                        ) : r.status === "skipped" ? (
                          <span className="text-amber-700 font-bold text-[10px] bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Skipped</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                            <AlertTriangle className="w-3 h-3" /> Error: {r.error}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs font-bold">{r.promises_found ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
