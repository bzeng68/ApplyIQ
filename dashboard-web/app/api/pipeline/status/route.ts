import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION ?? 'us-east1';
const JOB_NAME = process.env.PIPELINE_JOB_NAME ?? 'applyiq-pipeline';

type ExecutionState = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'UNKNOWN';

function parseState(execution: Record<string, unknown>): ExecutionState {
  const status = execution.status as Record<string, unknown> | undefined;
  const conditions = (status?.conditions as Array<Record<string, string>>) ?? [];
  const completed = conditions.find((c) => c.type === 'Completed');
  if (!completed) return 'RUNNING';
  if (completed.status === 'True') return 'SUCCEEDED';
  if (completed.status === 'False') return 'FAILED';
  return 'RUNNING';
}

async function getToken() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

export async function GET(req: NextRequest) {
  if (!PROJECT_ID) {
    return NextResponse.json({ error: 'GCP_PROJECT_ID not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const executionName = searchParams.get('executionName');
  const latest = searchParams.get('latest') === 'true';

  try {
    const token = await getToken();

    if (executionName) {
      // Poll a specific execution by name
      const url = `https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/executions/${executionName}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.text();
        return NextResponse.json({ error: body }, { status: res.status });
      }
      const execution = await res.json();
      return NextResponse.json({
        executionName: execution.metadata?.name,
        state: parseState(execution),
        startTime: execution.metadata?.creationTimestamp,
        completedAt: execution.status?.completionTime ?? null,
      });
    }

    if (latest) {
      // Get the most recently started execution for this job
      const url = `https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/executions?labelSelector=run.googleapis.com%2Fjob%3D${JOB_NAME}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.text();
        return NextResponse.json({ error: body }, { status: res.status });
      }
      const data = await res.json();
      const items: Array<Record<string, unknown>> = data.items ?? [];
      if (items.length === 0) {
        return NextResponse.json({ executionName: null, state: 'UNKNOWN', startTime: null, completedAt: null });
      }
      // Sort descending by creationTimestamp
      items.sort((a, b) => {
        const ta = (a.metadata as Record<string, string>)?.creationTimestamp ?? '';
        const tb = (b.metadata as Record<string, string>)?.creationTimestamp ?? '';
        return tb.localeCompare(ta);
      });
      const latest = items[0];
      return NextResponse.json({
        executionName: (latest.metadata as Record<string, string>)?.name,
        state: parseState(latest),
        startTime: (latest.metadata as Record<string, string>)?.creationTimestamp ?? null,
        completedAt: (latest.status as Record<string, string>)?.completionTime ?? null,
      });
    }

    return NextResponse.json({ error: 'Provide executionName or latest=true' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
