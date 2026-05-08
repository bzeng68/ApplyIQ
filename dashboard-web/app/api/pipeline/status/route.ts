import { NextRequest, NextResponse } from 'next/server';

// Stub endpoint for pipeline status monitoring
export async function GET(req: NextRequest) {
  const latest = req.nextUrl.searchParams.get('latest');
  const executionName = req.nextUrl.searchParams.get('executionName');

  if (latest === 'true' || !executionName) {
    return NextResponse.json({
      state: 'UNKNOWN',
      completedAt: null,
      startTime: null,
    });
  }

  return NextResponse.json({
    state: 'UNKNOWN',
    completedAt: null,
    startTime: null,
  });
}
