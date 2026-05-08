import { NextResponse } from 'next/server';
import { listProfiles } from '../../../lib/data';

export async function GET() {
  const profiles = listProfiles();
  return NextResponse.json(profiles);
}
