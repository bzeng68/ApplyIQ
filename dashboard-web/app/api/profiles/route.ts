import { NextResponse } from 'next/server';
import { listProfiles } from '../../../lib/data';

export async function GET() {
  return NextResponse.json(listProfiles());
}
