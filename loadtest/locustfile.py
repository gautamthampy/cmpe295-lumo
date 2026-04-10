import os
import uuid

from locust import HttpUser, between, task


API_PREFIX = os.getenv("API_PREFIX", "/api/v1")
DASHBOARD_BEARER_TOKEN = os.getenv("DASHBOARD_BEARER_TOKEN", "").strip()


class AnalyticsUser(HttpUser):
    wait_time = between(0.2, 1.0)

    def on_start(self):
        self.user_id = str(uuid.uuid4())
        res = self.client.post(
            f"{API_PREFIX}/sessions/",
            json={"user_id": self.user_id, "device_type": "web", "user_agent": "locust"},
        )
        self.session_id = res.json().get("session_id")

    @task(5)
    def ingest_question_answered(self):
        if not self.session_id:
            return
        # Ensure temporal baseline.
        self.client.post(
            f"{API_PREFIX}/analytics/events",
            json={
                "event_type": "lesson_started",
                "timestamp": "2025-10-25T19:10:00Z",
                "user_id": self.user_id,
                "session_id": self.session_id,
                "data": {"lesson_id": "MATH_G2_M1_L1", "lesson_title": "Seeded lesson", "grade_level": 2},
            },
        )
        self.client.post(
            f"{API_PREFIX}/analytics/events",
            json={
                "event_type": "question_answered",
                "timestamp": "2025-10-25T19:11:00Z",
                "user_id": self.user_id,
                "session_id": self.session_id,
                "data": {
                    "question_id": "q1",
                    "answer": "a",
                    "is_correct": True,
                    "response_latency_ms": 1200,
                    "lesson_id": "MATH_G2_M1_L1",
                },
            },
        )

    @task(1)
    def dashboard(self):
        if not self.session_id:
            return
        # Dashboard endpoint is RBAC-gated.
        # If token is not provided, skip this task to avoid false load-test failures.
        if not DASHBOARD_BEARER_TOKEN:
            return
        self.client.get(
            f"{API_PREFIX}/analytics/dashboard/{self.user_id}",
            headers={"Authorization": f"Bearer {DASHBOARD_BEARER_TOKEN}"},
        )

