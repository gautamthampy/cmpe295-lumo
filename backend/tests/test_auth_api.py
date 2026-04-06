from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth import EmailVerificationToken, ParentUser, PasswordResetToken, Student
from app.services.auth_service import get_auth_service
from app.services.notifications import EmailDeliveryError


def sign_up(client, email: str = "parent@example.com", password: str = "Password123"):
    return client.post(
        "/api/v1/auth/sign-up",
        json={"email": email, "password": password},
    )


def verify_with_token(client, token: str):
    return client.post("/api/v1/auth/verify-email", json={"token": token})


def sign_in(client, email: str = "parent@example.com", password: str = "Password123", remember_me: bool = False):
    return client.post(
        "/api/v1/auth/sign-in",
        json={"email": email, "password": password, "rememberMe": remember_me},
    )


def forgot_password(client, email: str):
    return client.post("/api/v1/auth/forgot-password", json={"email": email})


def reset_password(client, token: str, password: str = "NewPassword123"):
    return client.post("/api/v1/auth/reset-password", json={"token": token, "password": password})


def create_verified_parent(client, db_session: Session, email: str = "family@example.com") -> ParentUser:
    response = sign_up(client, email=email)
    verify_with_token(client, response.json()["verificationToken"])
    parent = db_session.scalar(select(ParentUser).where(ParentUser.email == email))
    assert parent is not None
    return parent


def create_student(db_session: Session, parent: ParentUser, display_name: str = "Alex", grade_level: int = 3) -> Student:
    student = Student(
        parent_user_id=parent.id,
        display_name=display_name,
        grade_level=grade_level,
        avatar_id="owl",
        consent_given=True,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student


def test_signup_success_returns_verification_token(client):
    response = sign_up(client)

    assert response.status_code == 201
    payload = response.json()
    assert payload["message"] == "Account created. Check your email to verify your account."
    assert payload["verificationToken"]


def test_signup_rolls_back_when_verification_email_delivery_fails(client, db_session: Session, monkeypatch):
    def fail_delivery(*args, **kwargs):
        raise EmailDeliveryError("SMTP unavailable")

    monkeypatch.setattr("app.api.routes.auth.send_verification_email", fail_delivery)

    response = sign_up(client, email="mailfail@example.com")

    assert response.status_code == 503
    assert response.json()["detail"] == "Unable to send verification email right now."
    assert db_session.scalar(select(ParentUser).where(ParentUser.email == "mailfail@example.com")) is None


def test_signup_rejects_duplicate_email(client):
    first = sign_up(client)
    second = sign_up(client)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "An account with that email already exists."


def test_signup_validates_email_and_password(client):
    invalid_email = client.post("/api/v1/auth/sign-up", json={"email": "not-an-email", "password": "Password123"})
    short_password = client.post("/api/v1/auth/sign-up", json={"email": "parent@example.com", "password": "short"})

    assert invalid_email.status_code == 422
    assert short_password.status_code == 422


def test_verify_email_success_and_reuse_failure(client):
    sign_up_response = sign_up(client)
    token = sign_up_response.json()["verificationToken"]

    first = verify_with_token(client, token)
    second = verify_with_token(client, token)

    assert first.status_code == 200
    assert first.json()["message"] == "Email verified. You can now sign in."
    assert second.status_code == 400
    assert second.json()["detail"] == "This verification link is invalid or expired."


def test_verify_email_rejects_expired_token(client, db_session: Session):
    sign_up_response = sign_up(client, email="expired@example.com")
    token = sign_up_response.json()["verificationToken"]
    record = db_session.scalar(select(EmailVerificationToken).where(EmailVerificationToken.token_hash.is_not(None)))
    assert record is not None
    record.expires_at = record.expires_at - timedelta(days=3)
    db_session.commit()

    response = verify_with_token(client, token)

    assert response.status_code == 400
    assert response.json()["detail"] == "This verification link is invalid or expired."


def test_resend_verification_replaces_old_token(client):
    original = sign_up(client, email="resend@example.com")
    original_token = original.json()["verificationToken"]

    resend = client.post("/api/v1/auth/resend-verification", json={"email": "resend@example.com"})
    new_token = resend.json()["verificationToken"]

    old_token_response = verify_with_token(client, original_token)
    new_token_response = verify_with_token(client, new_token)

    assert resend.status_code == 200
    assert new_token != original_token
    assert old_token_response.status_code == 400
    assert new_token_response.status_code == 200


def test_resend_verification_is_generic_for_verified_or_missing_accounts(client):
    sign_up_response = sign_up(client, email="verified@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])

    verified = client.post("/api/v1/auth/resend-verification", json={"email": "verified@example.com"})
    missing = client.post("/api/v1/auth/resend-verification", json={"email": "missing@example.com"})

    assert verified.status_code == 200
    assert missing.status_code == 200
    assert verified.json()["message"] == missing.json()["message"]
    assert verified.json()["verificationToken"] is None
    assert missing.json()["verificationToken"] is None


def test_signin_blocks_unverified_accounts(client):
    sign_up(client, email="blocked@example.com")

    response = sign_in(client, email="blocked@example.com")

    assert response.status_code == 403
    assert response.json()["detail"] == "Email verification required before sign-in."


def test_signin_rejects_invalid_credentials(client):
    sign_up_response = sign_up(client, email="verifiedsignin@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])

    response = sign_in(client, email="verifiedsignin@example.com", password="WrongPassword123")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


def test_signin_success_sets_cookie_and_session_endpoint(client):
    sign_up_response = sign_up(client, email="session@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])

    response = sign_in(client, email="session@example.com")
    session_response = client.get("/api/v1/auth/session")

    assert response.status_code == 200
    assert response.json()["nextPath"] == "/portal"
    assert "lumo_session=" in response.headers["set-cookie"]
    assert session_response.status_code == 200
    assert session_response.json() == {
        "authenticated": True,
        "emailVerified": True,
        "email": "session@example.com",
    }


def test_signin_remember_me_sets_longer_cookie(client):
    sign_up_response = sign_up(client, email="remember@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])

    response = sign_in(client, email="remember@example.com", remember_me=True)

    assert response.status_code == 200
    assert "Max-Age=2592000" in response.headers["set-cookie"]


def test_session_endpoint_is_anonymous_without_cookie(client):
    response = client.get("/api/v1/auth/session")

    assert response.status_code == 200
    assert response.json() == {
        "authenticated": False,
        "emailVerified": False,
        "email": None,
    }


def test_logout_revokes_session_and_clears_cookie(client):
    sign_up_response = sign_up(client, email="logout@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])
    sign_in(client, email="logout@example.com")

    logout_response = client.post("/api/v1/auth/logout")
    session_response = client.get("/api/v1/auth/session")

    assert logout_response.status_code == 200
    assert "Max-Age=0" in logout_response.headers["set-cookie"]
    assert session_response.json()["authenticated"] is False


def test_forgot_password_is_generic_for_existing_and_missing_accounts(client):
    sign_up(client, email="forgot@example.com")

    existing = forgot_password(client, "forgot@example.com")
    missing = forgot_password(client, "absent@example.com")

    assert existing.status_code == 200
    assert missing.status_code == 200
    assert existing.json()["message"] == missing.json()["message"]
    assert existing.json()["resetToken"]
    assert missing.json()["resetToken"] is None


def test_reset_password_rejects_invalid_and_expired_tokens(client, db_session: Session):
    invalid = reset_password(client, token="invalid-token", password="UpdatedPassword123")

    sign_up_response = sign_up(client, email="resetexpired@example.com")
    reset_response = forgot_password(client, "resetexpired@example.com")
    token = reset_response.json()["resetToken"]
    record = db_session.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash.is_not(None)))
    assert record is not None
    record.expires_at = record.expires_at - timedelta(days=2)
    db_session.commit()
    expired = reset_password(client, token=token, password="UpdatedPassword123")

    assert invalid.status_code == 400
    assert invalid.json()["detail"] == "This reset link is invalid or expired."
    assert expired.status_code == 400
    assert expired.json()["detail"] == "This reset link is invalid or expired."


def test_reset_password_updates_credentials_revokes_sessions_and_disallows_reuse(client):
    sign_up_response = sign_up(client, email="resetsuccess@example.com")
    verify_with_token(client, sign_up_response.json()["verificationToken"])
    sign_in(client, email="resetsuccess@example.com")
    reset_response = forgot_password(client, "resetsuccess@example.com")
    token = reset_response.json()["resetToken"]

    update = reset_password(client, token=token, password="UpdatedPassword123")
    old_session = client.get("/api/v1/auth/session")
    old_password_sign_in = sign_in(client, email="resetsuccess@example.com", password="Password123")
    new_password_sign_in = sign_in(client, email="resetsuccess@example.com", password="UpdatedPassword123")
    reused = reset_password(client, token=token, password="AnotherPassword123")

    assert update.status_code == 200
    assert update.json()["message"] == "Password updated. Sign in with your new password."
    assert old_session.json()["authenticated"] is False
    assert old_password_sign_in.status_code == 401
    assert new_password_sign_in.status_code == 200
    assert reused.status_code == 400


def test_reset_password_changes_stored_hash(client, db_session: Session):
    sign_up(client, email="hashcheck@example.com")
    original_user = db_session.scalar(select(ParentUser).where(ParentUser.email == "hashcheck@example.com"))
    assert original_user is not None
    original_hash = original_user.password_hash
    token = forgot_password(client, "hashcheck@example.com").json()["resetToken"]

    reset_password(client, token=token, password="BrandNewPassword123")
    updated_user = db_session.scalar(select(ParentUser).where(ParentUser.email == "hashcheck@example.com"))
    assert updated_user is not None

    assert updated_user.password_hash != original_hash


def test_student_login_code_request_is_generic_for_existing_and_missing_accounts(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="studentfamily@example.com")
    create_student(db_session, parent)

    existing = client.post("/api/v1/auth/student-login/request-code", json={"email": "studentfamily@example.com"})
    missing = client.post("/api/v1/auth/student-login/request-code", json={"email": "missingfamily@example.com"})

    assert existing.status_code == 200
    assert missing.status_code == 200
    assert existing.json()["message"] == missing.json()["message"]
    assert len(existing.json()["loginCode"]) == 4
    assert missing.json()["loginCode"] is None


def test_student_login_code_verification_signs_in_single_student_household(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="singlehouse@example.com")
    student = create_student(db_session, parent, display_name="Maya")

    request_code = client.post("/api/v1/auth/student-login/request-code", json={"email": "singlehouse@example.com"})
    verify_code = client.post("/api/v1/auth/student-login/verify-code", json={"code": request_code.json()["loginCode"]})

    assert verify_code.status_code == 200
    assert verify_code.json()["authenticated"] is True
    assert verify_code.json()["student"]["student_id"] == student.student_id
    assert verify_code.json()["accessToken"]


def test_student_login_code_verification_requires_student_selection_for_multi_student_household(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="multihouse@example.com")
    first_student = create_student(db_session, parent, display_name="Alex")
    second_student = create_student(db_session, parent, display_name="Sam")

    request_code = client.post("/api/v1/auth/student-login/request-code", json={"email": "multihouse@example.com"})
    verify_code = client.post("/api/v1/auth/student-login/verify-code", json={"code": request_code.json()["loginCode"]})

    assert verify_code.status_code == 200
    assert verify_code.json()["authenticated"] is False
    assert verify_code.json()["requiresStudentSelection"] is True
    assert len(verify_code.json()["students"]) == 2
    assert verify_code.json()["selectionToken"]

    select_student_response = client.post(
        "/api/v1/auth/student-login/select-student",
        json={
            "selectionToken": verify_code.json()["selectionToken"],
            "studentId": second_student.student_id,
        },
    )

    assert select_student_response.status_code == 200
    assert select_student_response.json()["authenticated"] is True
    assert select_student_response.json()["student"]["student_id"] == second_student.student_id
    assert select_student_response.json()["student"]["student_id"] != first_student.student_id


def test_student_login_code_rejects_invalid_or_reused_codes(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="reusedcode@example.com")
    create_student(db_session, parent)

    invalid = client.post("/api/v1/auth/student-login/verify-code", json={"code": "9999"})
    request_code = client.post("/api/v1/auth/student-login/request-code", json={"email": "reusedcode@example.com"})
    first_use = client.post("/api/v1/auth/student-login/verify-code", json={"code": request_code.json()["loginCode"]})
    reused = client.post("/api/v1/auth/student-login/verify-code", json={"code": request_code.json()["loginCode"]})

    assert invalid.status_code == 400
    assert first_use.status_code == 200
    assert reused.status_code == 400


def test_parent_portal_can_generate_child_specific_student_login_code(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="portalcode@example.com")
    student = create_student(db_session, parent, display_name="Nina")
    sign_in(client, email="portalcode@example.com")

    generate_code = client.post(f"/api/v1/auth/students/{student.student_id}/login-code")
    verify_code = client.post("/api/v1/auth/student-login/verify-code", json={"code": generate_code.json()["loginCode"]})

    assert generate_code.status_code == 200
    assert generate_code.json()["loginCode"]
    assert verify_code.status_code == 200
    assert verify_code.json()["authenticated"] is True
    assert verify_code.json()["student"]["student_id"] == student.student_id


def test_parent_dashboard_lists_students_for_authenticated_parent(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="dashboard@example.com")
    create_student(db_session, parent, display_name="Jordan")
    sign_in(client, email="dashboard@example.com")

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "dashboard@example.com"
    assert response.json()["students"][0]["display_name"] == "Jordan"


def test_authenticated_parent_can_create_student_profile(client, db_session: Session):
    create_verified_parent(client, db_session, email="createchild@example.com")
    sign_in(client, email="createchild@example.com")

    response = client.post(
        "/api/v1/auth/students",
        json={
            "displayName": "Avery",
            "gradeLevel": 4,
            "avatarId": "otter",
            "consentGiven": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["display_name"] == "Avery"
    assert response.json()["grade_level"] == 4


def test_subject_catalog_returns_default_subjects(client):
    response = client.get("/api/v1/auth/subjects")

    assert response.status_code == 200
    assert response.json() == [
        {"subject_id": "math", "name": "Mathematics", "slug": "math"},
        {"subject_id": "science", "name": "Science", "slug": "science"},
        {"subject_id": "language-arts-writing", "name": "Language Arts - Writing", "slug": "language-arts-writing"},
        {"subject_id": "social-studies", "name": "Social Studies", "slug": "social-studies"},
    ]


def test_subject_catalog_can_filter_by_grade_level(client):
    response = client.get("/api/v1/auth/subjects", params={"grade_level": 2})

    assert response.status_code == 200
    assert [item["slug"] for item in response.json()] == ["math", "science", "language-arts-writing", "social-studies"]


def test_grade_curriculum_catalog_returns_seeded_grade_two_tree(client):
    response = client.get("/api/v1/auth/catalog", params={"grade_level": 2})

    assert response.status_code == 200
    payload = response.json()
    assert payload["grade_level"] == 2
    assert [subject["subject_slug"] for subject in payload["subjects"]] == ["math", "science", "language-arts-writing", "social-studies"]
    assert payload["subjects"][0]["curriculum_provider"] == "Origo Stepping Stones 2.0"
    assert payload["subjects"][0]["modules"][0]["module_id"] == "MATH_G2_M1"
    assert payload["subjects"][0]["modules"][0]["lessons"][0]["lesson_id"] == "MATH_G2_M1_L1"


def test_grade_curriculum_catalog_rejects_unseeded_grade(client):
    response = client.get("/api/v1/auth/catalog", params={"grade_level": 5})

    assert response.status_code == 404
    assert response.json()["detail"] == "No curriculum catalog is available for that grade level yet."


def test_student_session_reports_unauthenticated_without_bearer_token(client):
    response = client.get("/api/v1/auth/student-session")

    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "student": None}


def test_student_session_returns_student_summary_for_valid_student_token(client, db_session: Session):
    parent = create_verified_parent(client, db_session, email="studentsession@example.com")
    student = create_student(db_session, parent, display_name="Maya", grade_level=4)
    token = get_auth_service().create_student_token(
        student.student_id,
        parent.id,
        display_name=student.display_name,
        grade_level=student.grade_level,
    )

    response = client.get(
        "/api/v1/auth/student-session",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "authenticated": True,
        "student": {
            "student_id": student.student_id,
            "display_name": "Maya",
            "grade_level": 4,
            "avatar_id": "owl",
        },
    }