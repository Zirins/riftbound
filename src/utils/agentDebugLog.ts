// Debug logging for agent sessions — fetch ingest + in-memory buffer.

interface AgentDebugPayload {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
}

declare global {
  interface Window {
    __agentDebugLogs?: Array<AgentDebugPayload & { timestamp: number }>;
  }
}

const INGEST_URL = 'http://127.0.0.1:7764/ingest/39ea4d96-09a5-471d-9f43-5260085e1ae8';
const SESSION_ID = 'd07587';

export function agentDebugLog(payload: AgentDebugPayload): void {
  const entry = { ...payload, timestamp: Date.now() };

  fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_ID,
    },
    body: JSON.stringify({ sessionId: SESSION_ID, ...entry }),
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    const logs = window.__agentDebugLogs ?? [];
    logs.push(entry);
    window.__agentDebugLogs = logs.slice(-100);
  }
}
