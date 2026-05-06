interface LegitimacyBadgeProps {
  tier: string;
}

export default function LegitimacyBadge({ tier }: LegitimacyBadgeProps) {
  let colors = "bg-gray-50 text-gray-700";

  if (tier.includes("High")) colors = "bg-green-50 text-green-700";
  else if (tier.includes("Proceed")) colors = "bg-amber-50 text-amber-700";
  else if (tier.includes("Suspicious")) colors = "bg-red-50 text-red-700";

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${colors}`}>
      {tier}
    </span>
  );
}
