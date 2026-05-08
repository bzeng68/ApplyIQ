import { NextRequest, NextResponse } from 'next/server';

interface UIState {
  done: number[];
  skipped: number[];
}

// GET: Load ui-state for a profile
export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') || 'default';

  // In deployed Cloud Run, ui-state lives at /mnt/data/profiles/{profile}/data/ui-state.json
  // For local dev, it's at profiles/{profile}/data/ui-state.json
  // Since we can't access file system reliably in Cloud Run without GCS integration,
  // return empty state and let frontend use localStorage as fallback
  
  return NextResponse.json({
    done: [],
    skipped: [],
  });
}

// POST: Save ui-state for a profile (future: implement GCS write)
export async function POST(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') || 'default';
  const body = await req.json().catch(() => ({ done: [], skipped: [] }));

  // TODO: Implement GCS write when Cloud Run has writable access
  // For now, acknowledge the save (frontend uses localStorage as primary storage)
  
  return NextResponse.json({
    success: true,
    done: body.done || [],
    skipped: body.skipped || [],
  });
}
