import { NextResponse } from 'next/server';
import { loadDashboardOffers } from '../../../lib/data';

export async function GET() {
  const offers = loadDashboardOffers();
  return NextResponse.json(offers);
}
