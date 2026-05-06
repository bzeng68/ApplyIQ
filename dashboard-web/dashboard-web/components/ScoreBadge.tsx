interface ScoreBadgeProps {
  score: number | null;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) return <span className="text-muted">—</span>;

  let bgColor = "bg-red-50 text-red-700";
  if (score >= 4.0) bgColor = "bg-green-50 text-green-700";
  else if (score >= 3.5) bgColor = "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${bgColor}`}>
      {score.toFixed(1)}/5
    </span>
  );
}
