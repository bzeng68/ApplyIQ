import { NextResponse } from 'next/server';
import { updateDoneState } from '../../../../lib/data';

export async function POST(request: Request, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: { done?: boolean } = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const nextState = updateDoneState(id, body.done);
  return NextResponse.json(nextState);
}
