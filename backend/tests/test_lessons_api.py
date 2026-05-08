from __future__ import annotations

import uuid


def test_list_lessons_returns_seeded_catalog(client):
    response = client.get("/api/v1/lessons")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 5
    assert {"lesson_id", "title", "subject", "grade_level", "status"}.issubset(payload[0])


def test_list_lessons_filters_by_subject(client):
    response = client.get("/api/v1/lessons", params={"subject": "math"})

    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert all(lesson["subject"] == "math" for lesson in payload)


def test_render_lesson_returns_html_and_activities(client):
    lessons_response = client.get("/api/v1/lessons")
    lesson_id = lessons_response.json()[0]["lesson_id"]

    response = client.get(f"/api/v1/lessons/{lesson_id}/render")

    assert response.status_code == 200
    payload = response.json()
    assert payload["lesson_id"] == lesson_id
    assert "<h2>Warm Up</h2>" in payload["html_content"]
    assert len(payload["interactive_activities"]) >= 2
    assert payload["quiz_context"]["subject"]


def test_lesson_analytics_summary_returns_metrics(client):
    response = client.get("/api/v1/lessons/analytics/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_lessons"] >= 5
    assert payload["avg_accessibility"] >= 0
    assert payload["avg_quiz_pass"] >= 0
    assert len(payload["lessons"]) >= 5


def test_lesson_analytics_summary_student_without_events_returns_empty(client):
    student_id = str(uuid.uuid4())

    response = client.get("/api/v1/lessons/analytics/summary", params={"student_id": student_id})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_lessons"] == 0
    assert payload["avg_accessibility"] == 0
    assert payload["avg_quiz_pass"] == 0
    assert payload["lessons"] == []