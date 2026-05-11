import { NextRequest, NextResponse } from 'next/server';
import { updateSkipStateAsync } from '../../../../../lib/data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { skipped = true, profile = 'default' } = body as { skipped?: boolean; profile?: string };

  try {
    const nextState = await updateSkipStateAsync(id, profile, skipped);
    return NextResponse.json(nextState);
  } catch (err) {
    console.error('Failed to persist skip state:', err);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}
