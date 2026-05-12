import { NextRequest, NextResponse } from 'next/server';
import { loadDashboardOffers } from '../../../lib/data';
import { readFromGCS } from '../../../lib/gcs';

// Disable Next.js fetch cache — GCS SDK uses fetch internally and would get stale data otherwise
export const dynamic = 'force-dynamic';

async function fetchOffersFromGCS(profile: string): Promise<unknown[]> {
  const gcsPath = `profiles/${profile}/data/dashboard-offers.json`;
  const content = await readFromGCS(gcsPath);
  if (!content) return [];
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') || 'bryan';

  // Try GCS first
  try {
    const offers = await fetchOffersFromGCS(profile);
    if (offers.length > 0) {
      return NextResponse.json(offers);
    }
  } catch {
    // Fall through
  }

  // Fallback: local filesystem (dev)
  try {
    const offers = loadDashboardOffers(profile);
    if (offers.length > 0) return NextResponse.json(offers);
  } catch {
    // Fall through
  }

  // Last resort: bundled static file
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require('../../../public/dashboard-offers.json');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
