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
    <div className="min-h-screen text-stone-900 font-sans">
      <main className="w-full">
        <section className="bg-white border border-stone-200 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-amber-950 mb-6">Bulk Import Interactions</h2>
          
          <div className="border-2 border-dashed border-stone-300 rounded-lg p-10 text-center hover:border-amber-600 transition">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="hidden" 
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
              <svg className="w-10 h-10 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <span className="text-lg font-medium text-stone-800">
                {file ? file.name : "Click or drag CSV file to upload"}
              </span>
              <span className="text-sm text-stone-500">
                Expected columns: entity_id, entity_type, date, text
              </span>
            </label>
          </div>

          {file && (
            <div className="mt-6 flex items-center justify-between bg-stone-50 p-4 rounded-lg border border-stone-200">
              <div className="text-stone-800 text-sm">
                Ready to import <span className="font-bold text-amber-950">{previewRows}</span> rows
              </div>
              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className="bg-amber-800 hover:bg-amber-700 disabled:bg-amber-800/50 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {uploading ? "Importing..." : "Start Import"}
              </button>
            </div>
          )}
        </section>

        {results && (
          <section>
            <h2 className="text-xl font-semibold text-amber-950 mb-4">Import Results</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border border-stone-200 text-center">
                <div className="text-3xl font-bold text-amber-950 mb-1">{results.total_rows}</div>
                <div className="text-sm text-stone-600 uppercase tracking-wide">Total Rows</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-stone-200 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">{results.imported}</div>
                <div className="text-sm text-stone-600 uppercase tracking-wide">Ingested</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-stone-200 text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">{results.errors}</div>
                <div className="text-sm text-stone-600 uppercase tracking-wide">Errors</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50/50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="p-3 font-medium">Row</th>
                    <th className="p-3 font-medium">Entity ID</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Promises Found</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {results.results.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-stone-100 transition">
                      <td className="p-3 text-stone-600">{r.row}</td>
                      <td className="p-3 font-medium text-amber-950">{r.entity_id || "-"}</td>
                      <td className="p-3">
                        {r.status === "ingested" ? (
                          <span className="text-green-600 font-medium">Ingested</span>
                        ) : r.status === "skipped" ? (
                          <span className="text-yellow-600 font-medium">Skipped</span>
                        ) : (
                          <span className="text-red-600 font-medium">Error: {r.error}</span>
                        )}
                      </td>
                      <td className="p-3 text-stone-800">{r.promises_found ?? "-"}</td>
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
