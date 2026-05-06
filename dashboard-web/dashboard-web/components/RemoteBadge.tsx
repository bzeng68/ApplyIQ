interface RemoteBadgeProps {
  remote: string;
}

export default function RemoteBadge({ remote }: RemoteBadgeProps) {
  if (!remote || remote === "Unknown") return <span className="text-xs text-muted">—</span>;
  return <span className="text-xs text-ink">{remote}</span>;
}
