'use client';

import { useEffect, useMemo, useState } from 'react';
import JDModal from './JDModal';
import ReportPanel from './ReportPanel';
import ScoreBadge from './ScoreBadge';
import LegitimacyBadge from './LegitimacyBadge';
import RemoteBadge from './RemoteBadge';
import { formatRelativeTime } from '../lib/relative-time';
import { useProfile } from '../lib/profile-context';

export type Offer = {
  id: number;
  url: string;
  company: string | null;
  role: string | null;
  score: number | null;
  status: string | null;
  report_num: string | null;
  report_file: string | null;
  archetype: string | null;
  legitimacy: string | null;
  remote: string | null;
  scanned_at: string | null;
  evaluated_at: string | null;
  done: boolean;
  skipped?: boolean;
};

type SortKey = 'score' | 'company' | 'role' | 'archetype' | 'legitimacy' | 'remote' | 'scanned_at' | 'evaluated_at';

type Props = {
  mode: 'pending' | 'completed' | 'skipped';
  minScore?: number;
  maxScore?: number;
};

const STORAGE_KEY_DONE = 'applyiq_done_ids';
const STORAGE_KEY_SKIPPED = 'applyiq_skipped_ids';

export default function OffersTable({ mode, minScore = 0, maxScore = 5 }: Props) {
  const { activeProfile } = useProfile();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedJd, setSelectedJd] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());

  // Load done/skipped state from localStorage
  useEffect(() => {
    const storedDone = localStorage.getItem(STORAGE_KEY_DONE);
    const storedSkipped = localStorage.getItem(STORAGE_KEY_SKIPPED);
    if (storedDone) setDoneIds(new Set(JSON.parse(storedDone)));
    if (storedSkipped) setSkippedIds(new Set(JSON.parse(storedSkipped)));
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    fetch(`/api/offers?profile=${encodeURIComponent(activeProfile)}`)
      .then((res) => res.json())
      .then((data) => {
        // Apply localStorage state to loaded offers
        const withState = data.map((offer: Offer) => ({
          ...offer,
          done: doneIds.has(offer.id),
          skipped: skippedIds.has(offer.id),
        }));
        setOffers(withState);
      })
      .catch(() => setOffers([]));
  }, [activeProfile, doneIds, skippedIds]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    let base = offers;

    // Filter by mode (done/pending/skipped)
    if (mode === 'completed') {
      base = base.filter((offer) => offer.done);
    } else if (mode === 'pending') {
      base = base.filter((offer) => !offer.done && !offer.skipped);
      // For pending, apply score range filter
      base = base.filter((offer) => {
        const score = offer.score ?? 0;
        return score >= minScore && score <= maxScore;
      });
    } else if (mode === 'skipped') {
      // Show offers that are either manually skipped OR below threshold
      base = base.filter((offer) => !offer.done && (offer.skipped || (offer.score ?? 0) < 3.5));
    }

    if (!trimmed) return base;
    return base.filter((offer) =>
      `${offer.company ?? ''} ${offer.role ?? ''}`.toLowerCase().includes(trimmed)
    );
  }, [offers, mode, query, minScore, maxScore]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (sortKey === 'score') {
        return ((Number(aValue) || 0) - (Number(bValue) || 0)) * dir;
      }
      const aText = (aValue ?? '').toString().toLowerCase();
      const bText = (bValue ?? '').toString().toLowerCase();
      if (aText < bText) return -1 * dir;
      if (aText > bText) return 1 * dir;
      return 0;
    });
    return copy;
  }, [filtered, sortDir, sortKey]);

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDir('desc');
    }
  }

  function toggleDone(id: number, done: boolean) {
    setOffers((prev) => prev.map((offer) => (offer.id === id ? { ...offer, done } : offer)));
    // Persist to localStorage
    const updated = new Set(doneIds);
    if (done) updated.add(id);
    else updated.delete(id);
    setDoneIds(updated);
    localStorage.setItem(STORAGE_KEY_DONE, JSON.stringify(Array.from(updated)));
    // Notify backend (non-critical)
    fetch(`/api/offers/${id}/done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done, profile: activeProfile }),
    }).catch(() => null);
  }

  function toggleSkip(id: number, skipped: boolean) {
    setOffers((prev) => prev.map((offer) => (offer.id === id ? { ...offer, skipped } : offer)));
    // Persist to localStorage
    const updated = new Set(skippedIds);
    if (skipped) updated.add(id);
    else updated.delete(id);
    setSkippedIds(updated);
    localStorage.setItem(STORAGE_KEY_SKIPPED, JSON.stringify(Array.from(updated)));
    // Notify backend (non-critical)
    fetch(`/api/offers/${id}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipped, profile: activeProfile }),
    }).catch(() => null);
  }

  if (offers.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-muted">No evaluated offers yet. Run `bash batch/batch-runner.sh` to evaluate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {mode === 'completed' ? 'Completed offers' : mode === 'skipped' ? 'Evaluated Out (< 3.5)' : 'Pending offers'}
              </h2>
              <span className="inline-block rounded-full bg-border px-2.5 py-1 text-xs font-medium text-secondary">
                {filtered.length}
              </span>
            </div>
            <p className="text-sm text-muted">
              {mode === 'completed'
                ? 'Offers you have already reviewed.'
                : mode === 'skipped'
                ? 'Offers below 3.5/5 threshold – not recommended to pursue.'
                : 'Offers 3.5+ not yet marked as done.'}
            </p>
          </div>
          <input
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm md:w-72"
            placeholder="Search company or role"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="table-header">
              {mode === 'pending' && <th className="px-3 py-3 text-left">Skip</th>}
              {mode !== 'skipped' && <th className="px-3 py-3 text-left">Done</th>}
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('score')}>Score</th>
              {mode === 'completed' && (
                <th className="px-3 py-3 text-left">Status</th>
              )}
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('company')}>Company</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('role')}>Role</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('archetype')}>Archetype</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('legitimacy')}>Legitimacy</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('remote')}>Remote</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('scanned_at')}>Scanned</th>
              <th className="px-3 py-3 text-left cursor-pointer" onClick={() => handleSort('evaluated_at')}>Evaluated</th>
              <th className="px-3 py-3 text-left">JD</th>
              <th className="px-3 py-3 text-left">Link</th>
              <th className="px-3 py-3 text-left">Report</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={mode === 'completed' ? 13 : mode === 'pending' ? 14 : mode === 'skipped' ? 13 : 13}>
                  No offers match your filters.
                </td>
              </tr>
            ) : (
              sorted.map((offer) => (
                <tr key={offer.id} className="border-t border-border row-hover">
                  {mode === 'pending' && (
                    <td className="px-3 py-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        onClick={() => toggleSkip(offer.id, true)}
                      >
                        Skip
                      </button>
                    </td>
                  )}
                  {mode !== 'skipped' && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={offer.done}
                        onChange={(event) => toggleDone(offer.id, event.target.checked)}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2"><ScoreBadge score={offer.score ?? null} /></td>
                  {mode === 'completed' && (
                    <td className="px-3 py-2">{offer.status ?? '-'}</td>
                  )}
                  <td className="px-3 py-2">{offer.company ?? '-'}</td>
                  <td className="px-3 py-2">{offer.role ?? '-'}</td>
                  <td className="px-3 py-2">{offer.archetype ?? '-'}</td>
                  <td className="px-3 py-2"><LegitimacyBadge tier={offer.legitimacy} /></td>
                  <td className="px-3 py-2"><RemoteBadge value={offer.remote} /></td>
                  <td className="px-3 py-2">{formatRelativeTime(offer.scanned_at)}</td>
                  <td className="px-3 py-2">{formatRelativeTime(offer.evaluated_at)}</td>
                  <td className="px-3 py-2">
                    <button
                      className="text-sm text-accent"
                      onClick={() => setSelectedJd(offer.id)}
                    >
                      View
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <a href={offer.url} target="_blank" rel="noreferrer" className="text-sm text-accent">
                      Open
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      className="text-sm text-accent"
                      onClick={() => setSelectedReport(offer.report_num)}
                      disabled={!offer.report_num}
                    >
                      {offer.report_num ? 'Open' : '-'}
                    </button>
                  </td>
                  {mode === 'skipped' && (
                    <td className="px-3 py-2">
                      <button
                        className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                        onClick={() => toggleSkip(offer.id, false)}
                      >
                        Unskip
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <JDModal open={selectedJd !== null} offerId={selectedJd} profile={activeProfile} onClose={() => setSelectedJd(null)} />
      <ReportPanel open={selectedReport !== null} reportNum={selectedReport} profile={activeProfile} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
