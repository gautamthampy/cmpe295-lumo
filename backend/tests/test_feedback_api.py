"""Tests for Feedback Agent API endpoints."""
from __future__ import annotations


def test_generate_hint_returns_hint_text(client):
    payload = {
        "question_id": "test-q-1",
        "question_text": "What is 2 + 2?",
        "user_id": "test-user",
        "session_id": "test-session",
        "hint_level": 1,
    }
    response = client.post("/api/v1/feedback/hint", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "hint_text" in data
    assert data["hint_level"] == 1
    assert data["question_id"] == "test-q-1"
    assert isinstance(data["hint_text"], str)
    assert len(data["hint_text"]) > 0


def test_generate_hint_level_2(client):
    payload = {
        "question_id": "test-q-1",
        "question_text": "What is the capital of France?",
        "user_id": "test-user",
        "session_id": "test-session",
        "hint_level": 2,
    }
    response = client.post("/api/v1/feedback/hint", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["hint_level"] == 2


def test_generate_hint_level_3(client):
    payload = {
        "question_id": "test-q-1",
        "question_text": "What is the capital of France?",
        "user_id": "test-user",
        "session_id": "test-session",
        "hint_level": 3,
    }
    response = client.post("/api/v1/feedback/hint", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["hint_level"] == 3


def test_generate_hint_with_misconception(client):
    payload = {
        "question_id": "test-q-2",
        "question_text": "What fraction is shaded?",
        "user_id": "test-user",
        "session_id": "test-session",
        "hint_level": 1,
        "misconception_type": "part-whole",
    }
    response = client.post("/api/v1/feedback/hint", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["question_id"] == "test-q-2"


def test_generate_hint_rejects_invalid_level(client):
    payload = {
        "question_id": "test-q-1",
        "question_text": "What is 2 + 2?",
        "user_id": "test-user",
        "session_id": "test-session",
        "hint_level": 5,  # Invalid: max is 3
    }
    response = client.post("/api/v1/feedback/hint", json=payload)

    assert response.status_code == 422  # Pydantic validation error


def test_generate_explanation_returns_explanation_and_motivation(client):
    payload = {
        "question_id": "test-q-1",
        "question_text": "What is 2 + 2?",
        "user_answer": "5",
        "correct_answer": "4",
        "user_id": "test-user",
        "session_id": "test-session",
    }
    response = client.post("/api/v1/feedback/explanation", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "motivational_message" in data
    assert data["question_id"] == "test-q-1"
    assert isinstance(data["explanation"], str)
    assert len(data["explanation"]) > 0


def test_generate_explanation_with_misconception(client):
    payload = {
        "question_id": "test-q-3",
        "question_text": "Which fraction is larger: 1/3 or 1/4?",
        "user_answer": "1/4",
        "correct_answer": "1/3",
        "user_id": "test-user",
        "misconception_type": "fraction-size",
    }
    response = client.post("/api/v1/feedback/explanation", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "motivational_message" in data


def test_generate_motivation_returns_message(client):
    payload = {
        "user_id": "test-user",
        "session_id": "test-session",
        "error_count": 3,
        "question_context": "fractions",
    }
    response = client.post("/api/v1/feedback/motivation", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["error_count"] == 3
    assert isinstance(data["message"], str)
    assert len(data["message"]) > 0


def test_generate_motivation_single_error(client):
    payload = {
        "user_id": "test-user",
        "error_count": 1,
    }
    response = client.post("/api/v1/feedback/motivation", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["error_count"] == 1


def test_re_quiz_trigger(client):
    payload = {
        "quiz_id": "test-quiz-1",
        "user_id": "test-user",
    }
    response = client.post("/api/v1/feedback/re-quiz", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["re_quiz_triggered"] is True
    assert data["reason"] == "mastery_gap_detected"
    assert "suggested_quiz_params" in data
    assert isinstance(data["suggested_quiz_params"], dict)
