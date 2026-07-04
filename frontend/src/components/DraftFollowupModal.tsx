"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";

interface DraftFollowupModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  draft: string;
  isLoading: boolean;
}

export default function DraftFollowupModal({ isOpen, onClose, entityId, draft, isLoading }: DraftFollowupModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement('textarea');
      textarea.value = draft;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-[16px]">Draft Follow-up</h3>
            <p className="text-gray-500 text-[12px] font-medium mt-0.5">
              AI-generated message for {entityId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-[#0A3020] animate-spin" />
              <p className="text-gray-500 text-[13px] font-medium">Generating follow-up message...</p>
            </div>
          ) : (
            <textarea
              readOnly
              value={draft}
              className="w-full h-40 resize-none bg-gray-50 border border-gray-200 rounded-xl p-4 text-[14px] leading-relaxed font-medium text-gray-700 focus:outline-none"
            />
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-[#0A3020] text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-sm hover:bg-[#072418] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
