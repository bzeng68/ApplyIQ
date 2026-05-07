'use client';

import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  offerId: number | null;
  profile: string;
  onClose: () => void;
};

export default function JDModal({ open, offerId, profile, onClose }: Props) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || offerId === null || !profile) return;
    setLoading(true);
    fetch(`/api/jds/${offerId}?profile=${encodeURIComponent(profile)}`)
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((text) => setContent(text))
      .catch(() => setContent('No JD text available.'))
      .finally(() => setLoading(false));
  }, [open, offerId, profile]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="card max-h-[80vh] w-full max-w-3xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-lg font-semibold">Job Description</h3>
          <button className="text-sm text-muted" onClick={onClose}>Close</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 text-sm text-ink">
          {loading ? 'Loading...' : content}
        </div>
      </div>
    </div>
  );
}
