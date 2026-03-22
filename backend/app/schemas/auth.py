from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class SignUpResponse(MessageResponse):
    model_config = ConfigDict(populate_by_name=True)

    verification_token: str | None = Field(default=None, serialization_alias="verificationToken")


class SignInRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = Field(default=False, alias="rememberMe")


class SignInResponse(MessageResponse):
    model_config = ConfigDict(populate_by_name=True)

    email_verified: bool = Field(default=False, serialization_alias="emailVerified")
    next_path: str | None = Field(default=None, serialization_alias="nextPath")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(MessageResponse):
    model_config = ConfigDict(populate_by_name=True)

    reset_token: str | None = Field(default=None, serialization_alias="resetToken")


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    authenticated: bool
    email_verified: bool = Field(serialization_alias="emailVerified")
    email: str | None = None


class StudentSummaryResponse(BaseModel):
    student_id: str
    display_name: str
    grade_level: int
    avatar_id: str


class StudentCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    display_name: str = Field(min_length=1, max_length=100, alias="displayName")
    grade_level: int = Field(ge=1, le=12, alias="gradeLevel")
    avatar_id: str = Field(default="owl", alias="avatarId")
    consent_given: bool = Field(default=True, alias="consentGiven")


class ParentDashboardResponse(BaseModel):
    parent_id: str
    email: str
    students: list[StudentSummaryResponse] = Field(default_factory=list)


class StudentLoginCodeRequest(BaseModel):
    email: EmailStr


class StudentLoginCodeIssueResponse(MessageResponse):
    model_config = ConfigDict(populate_by_name=True)

    login_code: str | None = Field(default=None, serialization_alias="loginCode")
    expires_in: int | None = Field(default=None, serialization_alias="expiresIn")


class StudentLoginCodeVerifyRequest(BaseModel):
    code: str = Field(min_length=4, max_length=4)


class StudentSelectionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    selection_token: str = Field(alias="selectionToken")
    student_id: str = Field(alias="studentId")


class StudentAuthResponse(MessageResponse):
    model_config = ConfigDict(populate_by_name=True)

    authenticated: bool = False
    requires_student_selection: bool = Field(default=False, serialization_alias="requiresStudentSelection")
    access_token: str | None = Field(default=None, serialization_alias="accessToken")
    expires_in: int | None = Field(default=None, serialization_alias="expiresIn")
    selection_token: str | None = Field(default=None, serialization_alias="selectionToken")
    student: StudentSummaryResponse | None = None
    students: list[StudentSummaryResponse] = Field(default_factory=list)
