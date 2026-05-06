"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportPanelProps {
  reportNum: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportPanel({ reportNum, isOpen, onClose }: ReportPanelProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reportNum) {
      setLoading(true);
      fetch(`/api/reports/${reportNum}`)
        .then((r) => r.text())
        .then(setContent)
        .finally(() => setLoading(false));
    }
  }, [isOpen, reportNum]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex z-50" onClick={onClose}>
      <div className="ml-auto w-full max-w-xl bg-white shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="font-semibold">Report #{reportNum}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <span className="text-muted">Loading...</span>
          ) : (
            <div className="markdown prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
