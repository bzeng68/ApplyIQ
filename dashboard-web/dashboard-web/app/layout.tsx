import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ApplyIQ Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <nav className="bg-white border-b border-border sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 py-4 flex gap-8">
              <h1 className="font-semibold text-ink">ApplyIQ</h1>
              <div className="flex gap-6">
                <Link href="/" className="text-sm text-muted hover:text-ink border-b-2 border-transparent hover:border-accent pb-1">Pending</Link>
                <Link href="/completed" className="text-sm text-muted hover:text-ink border-b-2 border-transparent hover:border-accent pb-1">Completed</Link>
                <Link href="/tokens" className="text-sm text-muted hover:text-ink border-b-2 border-transparent hover:border-accent pb-1">Tokens</Link>
              </div>
            </div>
          </nav>
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
