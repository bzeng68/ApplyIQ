type Props = {
  score?: number | null;
};

export default function ScoreBadge({ score }: Props) {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">-</span>;
  }

  const tone = score >= 4.0 ? 'bg-score-high' : score >= 3.5 ? 'bg-score-mid' : 'bg-score-low';

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${tone}`}>
      {score.toFixed(1)}
    </span>
  );
}
