import { NextRequest, NextResponse } from 'next/server';
import { loadDashboardOffers } from '../../../lib/data';

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') ?? '';
  if (!profile) return NextResponse.json([]);
  return NextResponse.json(loadDashboardOffers(profile));
}
