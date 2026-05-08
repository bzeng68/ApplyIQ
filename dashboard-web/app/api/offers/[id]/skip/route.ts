import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (!id) return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { skipped = false, profile = 'default' } = body as { skipped?: boolean; profile?: string };

  // Note: In Cloud Run, ui-state is ephemeral (not persisted to GCS).
  // For local development, ui-state.json is managed by dashboard-web itself via localStorage.
  // This endpoint returns success so the UI updates immediately.
  return NextResponse.json({
    done: [],
    skipped: [id], // Return minimal state for UI consistency
  });
}
