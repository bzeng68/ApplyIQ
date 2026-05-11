import { NextRequest, NextResponse } from 'next/server';
import { loadUiStateForProfileAsync } from '../../../lib/data';

// GET: Load ui-state for a profile
export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') || 'default';
  try {
    const state = await loadUiStateForProfileAsync(profile);
    return NextResponse.json(state);
  } catch (err) {
    console.error('Failed to load ui-state:', err);
    return NextResponse.json({ done: [], skipped: [] });
  }
}
