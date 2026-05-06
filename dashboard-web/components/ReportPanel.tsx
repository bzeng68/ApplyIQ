'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  open: boolean;
  reportNum: string | null;
  onClose: () => void;
};

export default function ReportPanel({ open, reportNum, onClose }: Props) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reportNum) return;
    setLoading(true);
    fetch(`/api/reports/${reportNum}`)
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((text) => setContent(text))
      .catch(() => setContent('No report found.'))
      .finally(() => setLoading(false));
  }, [open, reportNum]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="card h-full w-full max-w-xl overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-semibold">Report {reportNum}</h3>
          <button className="text-sm text-muted" onClick={onClose}>Close</button>
        </div>
        <div className="markdown pt-4 text-sm">
          {loading ? 'Loading...' : <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
}
