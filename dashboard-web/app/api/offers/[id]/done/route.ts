import { NextRequest, NextResponse } from 'next/server';
import { updateDoneState } from '../../../../lib/data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { done, profile = 'default' } = body as { done?: boolean; profile?: string };

  try {
    const updated = updateDoneState(id, profile, done);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update done state' },
      { status: 500 }
    );
  }
}
