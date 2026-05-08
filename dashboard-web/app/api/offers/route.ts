import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Serve pre-built dashboard data from public/ (built during docker build)
  // This avoids file system access issues on Cloud Run
  try {
    const data = require('../../../public/dashboard-offers.json');
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
