type Props = {
  value?: string | null;
};

function getTone(value?: string | null) {
  if (!value) return 'border-border text-muted';
  const normalized = value.toLowerCase();
  if (normalized.includes('remote')) return 'border-score-high text-score-high bg-[#E7F0EA]';
  if (normalized.includes('hybrid')) return 'border-score-mid text-score-mid bg-[#F3ECE0]';
  if (normalized.includes('on-site') || normalized.includes('onsite')) return 'border-score-low text-score-low bg-[#F4E4E4]';
  return 'border-border text-muted';
}

export default function RemoteBadge({ value }: Props) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${getTone(value)}`}>
      {value || '-'}
    </span>
  );
}
