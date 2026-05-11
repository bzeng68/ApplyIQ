import { NextRequest, NextResponse } from 'next/server';
import { updateDoneStateAsync } from '../../../../../lib/data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { done = true, profile = 'default' } = body as { done?: boolean; profile?: string };

  try {
    const nextState = await updateDoneStateAsync(id, profile, done);
    return NextResponse.json(nextState);
  } catch (err) {
    console.error('Failed to persist done state:', err);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}
