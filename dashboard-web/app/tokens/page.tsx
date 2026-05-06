'use client';

import { useEffect, useMemo, useState } from 'react';
import TokenCharts from '../../components/TokenCharts';

type TokenLogRow = {
  offer_id?: number;
  date?: string;
  timestamp?: string;
  mode?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type TokenSummary = {
  offers: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_sonnet: number;
};

type TokenPayload = {
  summary: TokenSummary;
  daily: Array<Record<string, number | string>>;
  log: TokenLogRow[];
};

const pageSize = 20;

export default function TokensPage() {
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    fetch('/api/tokens')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setPayload(data);
      })
      .catch(() => {
        if (mounted) setPayload(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const totalPages = useMemo(() => {
    if (!payload?.log?.length) return 1;
    return Math.ceil(payload.log.length / pageSize);
  }, [payload]);

  const pagedRows = useMemo(() => {
    if (!payload?.log?.length) return [];
    const start = (page - 1) * pageSize;
    return payload.log.slice(start, start + pageSize);
  }, [payload, page]);

  if (!payload) {
    return (
      <div className="card p-6">
        <p className="text-muted">No token data yet. Token logging activates when evaluations run.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Total offers</p>
          <p className="text-2xl font-semibold">{payload.summary.offers}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Input tokens</p>
          <p className="text-2xl font-semibold">{payload.summary.input_tokens.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Output tokens</p>
          <p className="text-2xl font-semibold">{payload.summary.output_tokens.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted uppercase tracking-wide">Estimated cost</p>
          <p className="text-2xl font-semibold">${payload.summary.estimated_cost_sonnet.toFixed(2)}</p>
        </div>
      </div>

      <TokenCharts daily={payload.daily} />

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Per-offer tokens</h2>
          <div className="text-xs text-muted">Page {page} of {totalPages}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2 text-left">Offer</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-right">Input</th>
                <th className="px-3 py-2 text-right">Output</th>
                <th className="px-3 py-2 text-right">Cache write</th>
                <th className="px-3 py-2 text-right">Cache read</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={7}>
                    No token data yet. Token logging activates when evaluations run.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={`${row.offer_id}-${index}`} className="border-t border-border row-hover">
                    <td className="px-3 py-2">{row.offer_id ?? '-'}</td>
                    <td className="px-3 py-2">{row.mode ?? '-'}</td>
                    <td className="px-3 py-2">{(row.timestamp || row.date || '-').toString().slice(0, 10)}</td>
                    <td className="px-3 py-2 text-right">{(row.input_tokens ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{(row.output_tokens ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{(row.cache_creation_input_tokens ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{(row.cache_read_input_tokens ?? 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <button
            className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
