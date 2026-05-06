type Props = {
  tier?: string | null;
};

function getTone(tier?: string | null) {
  if (!tier) return 'border-border text-muted';
  const normalized = tier.toLowerCase();
  if (normalized.includes('high')) return 'border-score-high text-score-high bg-[#E7F0EA]';
  if (normalized.includes('caution')) return 'border-score-mid text-score-mid bg-[#F3ECE0]';
  if (normalized.includes('suspicious')) return 'border-score-low text-score-low bg-[#F4E4E4]';
  return 'border-border text-muted';
}

export default function LegitimacyBadge({ tier }: Props) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${getTone(tier)}`}>
      {tier || '-'}
    </span>
  );
}
