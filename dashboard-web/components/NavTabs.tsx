'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Pending' },
  { href: '/skipped', label: 'Skipped' },
  { href: '/completed', label: 'Completed' },
  { href: '/tokens', label: 'Tokens' }
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 border-b border-border">
      <div className="flex gap-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium ${active ? 'text-ink border-b-2 border-accent' : 'text-muted'}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
