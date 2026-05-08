import { NextRequest, NextResponse } from 'next/server';
import { updateSkipState } from '../../../../lib/data';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { skipped, profile = 'default' } = body as { skipped?: boolean; profile?: string };

  try {
    const updated = updateSkipState(id, profile, skipped);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update skip state' },
      { status: 500 }
    );
  }
}
