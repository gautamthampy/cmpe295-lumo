const BASE_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_BASE_URL ?? "http://localhost:8000";

export type AnalyticsEventPayload = {
  userId: string;
  sessionId: string;
  timestamp: string;
  eventType:
    | "answer_submitted"
    | "ui_focus"
    | "break_accepted"
    | "break_declined"
    | "idle";
  latencyMs?: number;
  correct?: boolean;
  itemId?: string;
  metadata?: Record<string, unknown>;
};

export async function postAnalyticsEvent(
  payload: AnalyticsEventPayload,
): Promise<void> {
  const body = {
    user_id: payload.userId,
    session_id: payload.sessionId,
    timestamp: payload.timestamp,
    event_type: payload.eventType,
    latency_ms: payload.latencyMs,
    correct: payload.correct,
    item_id: payload.itemId,
    metadata: payload.metadata ?? {},
  };

  const res = await fetch(`${BASE_URL}/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 202) {
    throw new Error(`Failed to post analytics event (${res.status})`);
  }
}

export type AttentionCurrent = {
  attention_score: number;
  drift: boolean;
  rationale: string;
  recommended_action: string;
};

export async function getCurrentAttention(
  userId: string,
  sessionId: string,
): Promise<AttentionCurrent> {
  const url = new URL(`${BASE_URL}/analytics/attention/current`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("session_id", sessionId);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch current attention (${res.status})`);
  }
  return (await res.json()) as AttentionCurrent;
}

export type PeakWindow = {
  day_of_week: number;
  hour_of_day: number;
  score: number;
};

export type PeaksResponse = {
  windows: PeakWindow[];
  updated_at: string;
};

export async function getAttentionPeaks(
  userId: string,
): Promise<PeaksResponse> {
  const url = new URL(`${BASE_URL}/analytics/attention/peaks`);
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch attention peaks (${res.status})`);
  }
  return (await res.json()) as PeaksResponse;
}

export type DailyAverage = {
  date: string;
  score: number;
};

export type AttentionSummary = {
  daily_avg: DailyAverage[];
  corr_attention_mastery: number;
};

export async function getAttentionSummary(
  userId: string,
  range: string = "28d",
): Promise<AttentionSummary> {
  const url = new URL(`${BASE_URL}/analytics/attention/summary`);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("range", range);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch attention summary (${res.status})`);
  }
  return (await res.json()) as AttentionSummary;
}

