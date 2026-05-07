import { NextResponse } from 'next/server';
import { updateSkipState } from '../../../../../lib/data';

export async function POST(request: Request, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: { skipped?: boolean } = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const nextState = updateSkipState(id, body.skipped);
  return NextResponse.json(nextState);
}
