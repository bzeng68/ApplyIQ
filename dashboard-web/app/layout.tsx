import type { Metadata } from 'next';
import './globals.css';
import NavTabs from '../components/NavTabs';

export const metadata: Metadata = {
  title: 'ApplyIQ Dashboard',
  description: 'Batch evaluation dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen px-6 py-6 md:px-10">
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">ApplyIQ Dashboard</h1>
                <p className="text-sm text-muted">Review evaluated offers from the batch pipeline.</p>
              </div>
            </div>
            <NavTabs />
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
