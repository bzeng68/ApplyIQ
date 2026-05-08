import { NextResponse } from 'next/server';
import { listProfiles } from '../../../lib/data';

export async function GET() {
  const profiles = listProfiles();
  // Always return at least one default profile to prevent empty list
  return NextResponse.json(profiles.length > 0 ? profiles : ['default']);
}
