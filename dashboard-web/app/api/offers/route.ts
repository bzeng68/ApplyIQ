import { NextRequest, NextResponse } from 'next/server';
import { loadDashboardOffers } from '../../../lib/data';
import { readFromGCS } from '../../../lib/gcs';

const GCS_BUCKET = process.env.GCS_BUCKET || 'applyiq-data-apply-iq-495519';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache: Record<string, { data: unknown[]; expiresAt: number }> = {};

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

  // Check cache
  const cached = cache[profile];
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  // Try GCS first
  try {
    const offers = await fetchOffersFromGCS(profile);
    if (offers.length > 0) {
      cache[profile] = { data: offers, expiresAt: Date.now() + CACHE_TTL_MS };
      return NextResponse.json(offers);
    }
  } catch {
    // Fall through
  }

  // Fallback: local filesystem (dev) or static file (image)
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
