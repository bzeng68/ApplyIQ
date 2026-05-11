import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(process.cwd(), '..');

const PREFERENCES_FILE = path.join(BASE_ROOT, 'data', 'preferences.json');

function ensurePreferencesDir() {
  const dir = path.dirname(PREFERENCES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadPreferences() {
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      return JSON.parse(fs.readFileSync(PREFERENCES_FILE, 'utf8'));
    }
  } catch {
    // Ignore parse errors
  }
  return { selectedProfile: '', pipelineLastRun: null };
}

function savePreferences(prefs: any) {
  ensurePreferencesDir();
  fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2), 'utf8');
}

// GET: Load user preferences
export async function GET() {
  try {
    const prefs = loadPreferences();
    return NextResponse.json(prefs);
  } catch (err) {
    console.error('Failed to load preferences:', err);
    return NextResponse.json({ selectedProfile: '', pipelineLastRun: null });
  }
}

// POST: Save user preferences
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prefs = loadPreferences();

    if (body.selectedProfile !== undefined) {
      prefs.selectedProfile = body.selectedProfile;
    }
    if (body.pipelineLastRun !== undefined) {
      prefs.pipelineLastRun = body.pipelineLastRun;
    }

    savePreferences(prefs);
    return NextResponse.json(prefs);
  } catch (err) {
    console.error('Failed to save preferences:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
