import { NextResponse } from 'next/server';
import { updateDoneState } from '../../../../../lib/data';

export async function POST(request: Request, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: { done?: boolean; profile?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const profile = body.profile ?? '';
  if (!profile) return NextResponse.json({ error: 'profile required' }, { status: 400 });

  const nextState = updateDoneState(id, profile, body.done);
  return NextResponse.json(nextState);
}
