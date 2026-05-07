'use client';

import { useProfile } from '../lib/profile-context';

export default function ProfileSelector() {
  const { profiles, activeProfile, setActiveProfile } = useProfile();

  if (profiles.length <= 1) return null;

  return (
    <select
      value={activeProfile}
      onChange={(e) => setActiveProfile(e.target.value)}
      className="mt-1 rounded border border-border bg-base px-2 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
    >
      {profiles.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
