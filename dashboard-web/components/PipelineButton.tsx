'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type RunState = 'idle' | 'triggering' | 'running' | 'succeeded' | 'failed';

const POLL_INTERVAL_MS = 5000;

function saveExecutionToServer(executionName: string, startTime: string) {
  return fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipelineExecution: { executionName, startTime } }),
  }).catch((err) => console.error('Failed to persist execution state:', err));
}

function clearExecutionFromServer() {
  return fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipelineExecution: null }),
  }).catch((err) => console.error('Failed to clear execution state:', err));
}

function elapsedSeconds(startTime: string | null): number {
  if (!startTime) return 0;
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
}

function phase(elapsed: number): string {
  if (elapsed < 30) return 'Scanning...';
  if (elapsed < 300) return 'Evaluating...';
  return 'Formatting...';
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const secs = elapsedSeconds(iso);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function runningFor(startTime: string | null): string {
  if (!startTime) return '';
  const secs = elapsedSeconds(startTime);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function PipelineButton() {
  const router = useRouter();
  const [runState, setRunState] = useState<RunState>('idle');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const executionNameRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (executionName: string, start: string) => {
      executionNameRef.current = executionName;
      setRunState('running');
      setStartTime(start);

      pollTimerRef.current = setInterval(async () => {
        setElapsed(elapsedSeconds(start));
        try {
          const res = await fetch(`/api/pipeline/status?executionName=${encodeURIComponent(executionName)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.state === 'SUCCEEDED') {
            stopPolling();
            const completedAt = data.completedAt ?? new Date().toISOString();
            setRunState('succeeded');
            setLastCompleted(completedAt);
            setLastFailed(false);
            clearExecutionFromServer();
            fetch('/api/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pipelineLastRun: { completedAt, failed: false } }),
            }).catch((err) => console.error('Failed to persist pipeline state:', err));
            router.refresh();
          } else if (data.state === 'FAILED') {
            stopPolling();
            const completedAt = data.completedAt ?? new Date().toISOString();
            setRunState('failed');
            setLastFailed(true);
            setLastCompleted(completedAt);
            clearExecutionFromServer();
            fetch('/api/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pipelineLastRun: { completedAt, failed: true } }),
            }).catch((err) => console.error('Failed to persist pipeline state:', err));
          }
        } catch {
          // ignore transient errors — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, router],
  );

  // On mount: resume in-progress execution or load last run time from server
  useEffect(() => {
    Promise.all([
      fetch('/api/pipeline/status?latest=true').then((r) => r.json()).catch(() => ({})),
      fetch('/api/preferences').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([pipelineData, prefs]: [any, any]) => {
        // Resume in-progress execution if persisted
        if (prefs.pipelineExecution?.executionName) {
          startPolling(prefs.pipelineExecution.executionName, prefs.pipelineExecution.startTime);
          return;
        }
        // Load last run state
        if (prefs.pipelineLastRun) {
          setLastCompleted(prefs.pipelineLastRun.completedAt);
          setLastFailed(prefs.pipelineLastRun.failed ?? false);
        } else if (pipelineData.completedAt) {
          setLastCompleted(pipelineData.completedAt);
          setLastFailed(pipelineData.state === 'FAILED');
        } else if (pipelineData.startTime && pipelineData.state !== 'UNKNOWN') {
          setLastCompleted(pipelineData.startTime);
        }
      })
      .catch(() => {});

    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Tick elapsed counter while running
  useEffect(() => {
    if (runState !== 'running' || !startTime) return;
    const ticker = setInterval(() => setElapsed(elapsedSeconds(startTime)), 1000);
    return () => clearInterval(ticker);
  }, [runState, startTime]);

  async function handleRun() {
    setRunState('triggering');
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        console.error('Pipeline trigger failed:', data.error);
        setRunState('failed');
        setLastFailed(true);
        return;
      }
      const { executionName, startTime: start } = data as { executionName: string; startTime: string };
      saveExecutionToServer(executionName, start);
      startPolling(executionName, start);
    } catch (err) {
      console.error('Pipeline trigger error:', err);
      setRunState('failed');
      setLastFailed(true);
    }
  }

  const isActive = runState === 'triggering' || runState === 'running';

  const buttonLabel = () => {
    if (runState === 'triggering') return 'Starting...';
    if (runState === 'running') return phase(elapsed);
    return '▶ Run Pipeline';
  };

  const subtitle = () => {
    if (runState === 'running') return `Running for ${runningFor(startTime)}`;
    if (lastFailed && lastCompleted) return `Last run failed — ${relativeTime(lastCompleted)}`;
    if (lastCompleted) return `Last run: ${relativeTime(lastCompleted)}`;
    return null;
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRun}
        disabled={isActive}
        className={[
          'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'cursor-not-allowed bg-muted text-muted opacity-70'
            : 'bg-accent text-white hover:opacity-90',
        ].join(' ')}
      >
        {isActive && (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        )}
        {buttonLabel()}
      </button>
      {subtitle() && (
        <span className={`text-xs ${lastFailed && runState !== 'running' ? 'text-red-400' : 'text-muted'}`}>
          {subtitle()}
        </span>
      )}
    </div>
  );
}
