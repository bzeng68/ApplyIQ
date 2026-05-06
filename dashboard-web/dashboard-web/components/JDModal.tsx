"use client";
import { useEffect, useState } from "react";

interface JDModalProps {
  id: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function JDModal({ id, isOpen, onClose }: JDModalProps) {
  const [jdContent, setJdContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && id) {
      setLoading(true);
      fetch(`/api/jds/${id}`)
        .then((r) => r.text())
        .then(setJdContent)
        .finally(() => setLoading(false));
    }
  }, [isOpen, id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-96 overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="font-semibold">Job Description</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <div className="p-4 text-sm whitespace-pre-wrap">
          {loading ? <span className="text-muted">Loading...</span> : jdContent || "No JD available"}
        </div>
      </div>
    </div>
  );
}
