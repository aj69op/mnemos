"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import Papa from "papaparse";

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
    <div className="min-h-screen text-slate-200 font-sans">
      <main className="w-full">
        <section className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 tracking-tight">Bulk Import Interactions</h2>
          
          <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-electric-500/50 hover:bg-white/5 transition-all duration-300">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="hidden" 
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-electric-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <span className="text-lg font-medium text-white">
                {file ? file.name : "Click or drag CSV file to upload"}
              </span>
              <span className="text-sm text-slate-400">
                Expected columns: entity_id, entity_type, date, text
              </span>
            </label>
          </div>

          {file && (
            <div className="mt-6 flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 animate-fade-in">
              <div className="text-slate-300 text-sm">
                Ready to import <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded ml-1">{previewRows} rows</span>
              </div>
              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </span>
                ) : "Start Import"}
              </button>
            </div>
          )}
        </section>

        {results && (
          <section className="mt-8 animate-slide-up">
            <h2 className="text-xl font-semibold text-white mb-4 tracking-tight">Import Results</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-panel p-5 text-center">
                <div className="text-3xl font-bold text-white mb-1">{results.total_rows}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Total Rows</div>
              </div>
              <div className="glass-panel p-5 text-center border-b-2 border-b-emerald-500">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{results.imported}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Ingested</div>
              </div>
              <div className="glass-panel p-5 text-center border-b-2 border-b-red-500">
                <div className="text-3xl font-bold text-red-400 mb-1">{results.errors}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Errors</div>
              </div>
            </div>

            <div className="glass-panel overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-4 text-[10px] uppercase tracking-widest font-semibold">Row</th>
                    <th className="px-5 py-4 text-[10px] uppercase tracking-widest font-semibold">Entity ID</th>
                    <th className="px-5 py-4 text-[10px] uppercase tracking-widest font-semibold">Status</th>
                    <th className="px-5 py-4 text-[10px] uppercase tracking-widest font-semibold">Promises Found</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {results.results.map((r: any, i: number) => (
                    <tr key={i} className="table-row-hover transition-colors">
                      <td className="px-5 py-4 text-slate-400 font-mono text-xs">{r.row}</td>
                      <td className="px-5 py-4 font-semibold text-white">{r.entity_id || "-"}</td>
                      <td className="px-5 py-4">
                        {r.status === "ingested" ? (
                          <span className="text-emerald-400 font-medium text-xs bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">Ingested</span>
                        ) : r.status === "skipped" ? (
                          <span className="text-yellow-400 font-medium text-xs bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">Skipped</span>
                        ) : (
                          <span className="text-red-400 font-medium text-xs bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">Error: {r.error}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-mono text-xs">{r.promises_found ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
