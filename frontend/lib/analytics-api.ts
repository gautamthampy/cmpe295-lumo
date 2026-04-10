/**
 * Canonical browser client for analytics and attention APIs (proxied via `authRequest` / `/api/backend`).
 * Prefer this module over ad-hoc `fetch` to localhost so auth and API prefixes stay consistent.
 */
import { authRequest } from "@/lib/auth";

// ---- Analytics & Attention API ----

export type AttentionSnapshot = {
  recorded_at: string;
  session_id: string | null;
  lesson_id: string | null;
  attention_score: number | null;
  avg_response_latency_ms: number | null;
  error_rate: number | null;
};

export type AttentionSummaryResponse = {
  user_id: string;
  recent: AttentionSnapshot[];
  drift: boolean;
  recommended_action: string;
};

export type AttentionCurrentResponse = {
  user_id: string;
  session_id: string;
  attention_score: number;
  drift: boolean;
  recommended_action: string;
  rationale: string;
};

export type AttentionDailySummary = {
  user_id: string;
  range_days: number;
  daily_avg: { date: string; score: number }[];
  drift_count: number;
};

export type AttentionPeakWindow = {
  day_of_week: number;
  hour_of_day: number;
  score: number;
  samples: number;
};

export type AttentionPeaksResponse = {
  user_id: string;
  windows: AttentionPeakWindow[];
};

export type TimePerConceptRow = {
  module_id: string;
  module_title: string;
  minutes: number;
};

export type DashboardResponse = {
  user_id: string;
  lessons_completed: number;
  quizzes_taken: number;
  overall_mastery: number;
  strengths: string[];
  weaknesses: string[];
  time_spent_minutes: number;
  /** Minutes aggregated by curriculum module (Phase 2). */
  time_per_concept?: TimePerConceptRow[];
  attention_summary: {
    average_attention_score: number;
    peak_focus_time: string;
    drift_count: number;
  };
};

export type EventPayload = {
  event_type: string;
  timestamp: string;
  user_id: string;
  session_id: string;
  data: Record<string, unknown>;
};

export type SessionCreateResponse = {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  device_type: string | null;
  user_agent: string | null;
};

// ---- Sessions API ----

export async function createLearningSession(userId: string): Promise<SessionCreateResponse> {
  return authRequest<SessionCreateResponse>("/sessions/", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      device_type: "web",
      user_agent: "lumo-frontend",
    }),
  });
}

export async function endLearningSession(sessionId: string): Promise<SessionCreateResponse> {
  return authRequest<SessionCreateResponse>(`/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

// ---- Analytics Event Ingestion ----

export async function ingestAnalyticsEvent(event: EventPayload): Promise<Record<string, unknown>> {
  return authRequest<Record<string, unknown>>("/analytics/events", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

// ---- Attention Queries ----

export async function fetchAttentionCurrent(
  userId: string,
  sessionId: string,
): Promise<AttentionCurrentResponse> {
  return authRequest<AttentionCurrentResponse>(
    `/analytics/attention/current/?user_id=${userId}&session_id=${sessionId}`,
    { method: "GET" },
  );
}

export async function fetchAttentionMetrics(userId: string): Promise<AttentionSummaryResponse> {
  return authRequest<AttentionSummaryResponse>(`/analytics/attention/${userId}`, {
    method: "GET",
  });
}

export async function fetchAttentionSummary(
  userId: string,
  rangeDays?: number,
): Promise<AttentionDailySummary> {
  const params = new URLSearchParams({ user_id: userId });
  if (rangeDays !== undefined) params.set("range_days", String(rangeDays));
  return authRequest<AttentionDailySummary>(`/analytics/attention/summary/?${params}`, {
    method: "GET",
  });
}

export async function fetchAttentionPeaks(
  userId: string,
  opts?: { windowDays?: number; minSamples?: number; topK?: number },
): Promise<AttentionPeaksResponse> {
  const params = new URLSearchParams({ user_id: userId });
  if (opts?.windowDays !== undefined) params.set("window_days", String(opts.windowDays));
  if (opts?.minSamples !== undefined) params.set("min_samples", String(opts.minSamples));
  if (opts?.topK !== undefined) params.set("top_k", String(opts.topK));
  return authRequest<AttentionPeaksResponse>(`/analytics/attention/peaks/?${params}`, {
    method: "GET",
  });
}

export async function fetchDashboard(userId: string): Promise<DashboardResponse> {
  return authRequest<DashboardResponse>(`/analytics/dashboard/${userId}`, {
    method: "GET",
  });
}
