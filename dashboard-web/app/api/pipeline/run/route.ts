import { NextResponse } from 'next/server';

// Stub endpoint for triggering pipeline runs
export async function POST() {
  return NextResponse.json(
    { error: 'Pipeline execution not configured' },
    { status: 501 }
  );
}
