import { NextResponse } from 'next/server';
import { listProfiles } from '../../../lib/data';
import { listGCSProfiles } from '../../../lib/gcs';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Try GCS first (source of truth in deployed env)
  try {
    const gcsProfiles = await listGCSProfiles();
    if (gcsProfiles.length > 0) return NextResponse.json(gcsProfiles);
  } catch {
    // Fall through
  }

  // Fallback to local filesystem (dev)
  const profiles = listProfiles();
  return NextResponse.json(profiles.length > 0 ? profiles : ['default']);
}
