"use client";
import { useState, useCallback } from "react";
import { OfferData } from "@/lib/parsers";
import ScoreBadge from "./ScoreBadge";
import LegitimacyBadge from "./LegitimacyBadge";
import RemoteBadge from "./RemoteBadge";
import JDModal from "./JDModal";
import ReportPanel from "./ReportPanel";
import { relativeTime } from "@/lib/relative-time";
import { toggleDone } from "@/lib/data";

interface OffersTableProps {
  offers: OfferData[];
  showCompleted?: boolean;
  onOffersChange?: () => void;
}

export default function OffersTable({ offers, showCompleted = false, onOffersChange }: OffersTableProps) {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedReportNum, setSelectedReportNum] = useState<string | null>(null);
  const [selectedJDId, setSelectedJDId] = useState<number | null>(null);

  const filtered = offers
    .filter((o) => showCompleted ? o.done : !o.done)
    .filter((o) => !filter || o.company.toLowerCase().includes(filter.toLowerCase()) || o.role.toLowerCase().includes(filter.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any = a[sortBy as keyof OfferData] || "";
    let bVal: any = b[sortBy as keyof OfferData] || "";
    if (sortBy === "score") {
      aVal = a.score ?? 0;
      bVal = b.score ?? 0;
    }
    const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return sortDesc ? -cmp : cmp;
  });

  const handleCheckbox = useCallback(async (id: number, done: boolean) => {
    await toggleDone(id, !done);
    onOffersChange?.();
  }, [onOffersChange]);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>{showCompleted ? "No completed offers yet." : "No evaluated offers yet. Run `bash batch/batch-runner.sh` to evaluate."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by company or role..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="table-header w-8 p-3 text-left">✓</th>
              <th className="table-header p-3 text-left cursor-pointer" onClick={() => setSortBy("score"); setSortDesc(!sortDesc)}>Score</th>
              <th className="table-header p-3 text-left cursor-pointer" onClick={() => setSortBy("company"); setSortDesc(!sortDesc)}>Company</th>
              <th className="table-header p-3 text-left">Role</th>
              <th className="table-header p-3 text-left">Archetype</th>
              <th className="table-header p-3 text-left">Legitimacy</th>
              <th className="table-header p-3 text-left">Remote</th>
              <th className="table-header p-3 text-left">Scanned</th>
              <th className="table-header p-3 text-left">Evaluated</th>
              <th className="table-header p-3 text-center">JD</th>
              <th className="table-header p-3 text-center">Link</th>
              <th className="table-header p-3 text-center">Report</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((offer) => (
              <tr key={offer.id} className="row-hover border-b border-border">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={offer.done}
                    onChange={() => handleCheckbox(offer.id, offer.done)}
                    className="w-4 h-4 rounded"
                  />
                </td>
                <td className="p-3"><ScoreBadge score={offer.score} /></td>
                <td className="p-3 font-medium">{offer.company}</td>
                <td className="p-3 text-muted">{offer.role}</td>
                <td className="p-3">{offer.archetype}</td>
                <td className="p-3"><LegitimacyBadge tier={offer.legitimacy} /></td>
                <td className="p-3"><RemoteBadge remote={offer.remote} /></td>
                <td className="p-3 text-xs text-muted">{relativeTime(offer.scanned_at)}</td>
                <td className="p-3 text-xs text-muted">{relativeTime(offer.evaluated_at)}</td>
                <td className="p-3 text-center">
                  <button onClick={() => setSelectedJDId(offer.id)} className="text-accent hover:underline text-xs">View</button>
                </td>
                <td className="p-3 text-center">
                  <a href={offer.url} target="_blank" rel="noopener" className="text-accent hover:underline">→</a>
                </td>
                <td className="p-3 text-center">
                  {offer.report_num && (
                    <button onClick={() => setSelectedReportNum(offer.report_num)} className="text-accent hover:underline text-xs">
                      #{offer.report_num}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JDModal id={selectedJDId || 0} isOpen={selectedJDId !== null} onClose={() => setSelectedJDId(null)} />
      <ReportPanel reportNum={selectedReportNum || ""} isOpen={selectedReportNum !== null} onClose={() => setSelectedReportNum(null)} />
    </>
  );
}
