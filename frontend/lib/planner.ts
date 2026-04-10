import { authRequest } from "@/lib/auth";

export type PlannerRecommendation = {
  action: string;
  reason: string;
  priority: number;
};

export type PlannerRecommendResponse = {
  student_id: string;
  recommendations: PlannerRecommendation[];
};

export async function fetchPlannerRecommendations(
  studentId: string,
  options?: { sessionId?: string; limit?: number }
): Promise<PlannerRecommendResponse> {
  const params = new URLSearchParams();
  if (options?.sessionId) params.set("session_id", options.sessionId);
  if (options?.limit != null) params.set("limit", String(options.limit));
  const qs = params.toString();
  return authRequest<PlannerRecommendResponse>(`/planner/recommend/${studentId}${qs ? `?${qs}` : ""}`, {
    method: "GET",
    cache: "no-store",
  });
}
