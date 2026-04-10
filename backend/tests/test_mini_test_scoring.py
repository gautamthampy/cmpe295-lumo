import pytest

from app.services.mini_test_scoring import mini_test_score_to_action


@pytest.mark.parametrize(
    "score,expected_action",
    [
        (1.0, "continue"),
        (0.75, "continue"),
        (0.74, "recap"),
        (0.45, "recap"),
        (0.44, "break"),
        (0.0, "break"),
    ],
)
def test_mini_test_score_to_action(score: float, expected_action: str) -> None:
    attn, action = mini_test_score_to_action(score)
    assert action == expected_action
    assert 0.0 <= attn <= 1.0


def test_mini_test_score_clamped() -> None:
    attn, _ = mini_test_score_to_action(2.0)
    assert attn == 1.0
    attn2, _ = mini_test_score_to_action(-1.0)
    assert attn2 == 0.0
