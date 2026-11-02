
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.security import (
    ACCESS_PURPOSE,
    RESET_PURPOSE,
    create_token,
    decode_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.schemas import (
    EmailRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    ResetTokenResponse,
    TokenResponse,
    UserResponse,
    VerifyOtpRequest,
)
from app.services.email_domain import domain_accepts_email
from app.services.otp import PASSWORD_RESET, VERIFY_EMAIL, api_error, issue_otp, verify_otp

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GENERIC_CODE_SENT = "If an account matches that email, a code has been sent to it."
# Hash compared against when the email is unknown, so login takes the same time either way.
DUMMY_HASH = hash_password("dummy-password-for-timing-1")


def normalize_email(email: str) -> str:
    return str(email).strip().lower()


def find_user(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == normalize_email(email)).first()


def token_response(user: User) -> TokenResponse:
    token = create_token(user.id, user.hashed_password, ACCESS_PURPOSE, settings.access_token_minutes)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = normalize_email(data.email)
    phone = data.phone.strip()

    domain = email.rpartition("@")[2]
    if settings.email_domain_check and not domain_accepts_email(domain):
        raise api_error(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "email_undeliverable",
            f"{domain} cannot receive email. Check the spelling of your email address.",
            field="email",
        )

    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise api_error(
            status.HTTP_409_CONFLICT,
            "email_taken",
            "Email is already registered. Log in instead.",
            field="email",
        )

    existing_phone = db.query(User).filter(User.phone == phone).first()
    if existing_phone:
        raise api_error(
            status.HTTP_409_CONFLICT,
            "phone_taken",
            "Phone number is already registered",
            field="phone",
        )

    user = User(
        full_name=data.full_name,
        email=email,
        phone=phone,
        hashed_password=hash_password(data.password),
        is_verified=False,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise api_error(
            status.HTTP_409_CONFLICT,
            "account_exists",
            "Email or phone number is already registered",
        )

    try:
        cooldown = issue_otp(db, user, VERIFY_EMAIL)
    except HTTPException:
        # The account exists; the user can request a new code from the verify page.
        return RegisterResponse(
            message="Account created, but we could not send the verification email. Request a new code.",
            email=email,
            otp_sent=False,
            resend_available_in=0,
        )

    return RegisterResponse(
        message="Account created. Enter the code we emailed you to verify your address.",
        email=email,
        otp_sent=True,
        resend_available_in=cooldown,
    )


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(data: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = find_user(db, data.email)
    if user is not None and user.is_verified:
        raise api_error(status.HTTP_409_CONFLICT, "already_verified", "This email is already verified. Log in instead.")

    verify_otp(db, user, VERIFY_EMAIL, data.code)
    user.is_verified = True
    db.commit()
    db.refresh(user)
    return token_response(user)


@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(data: ResendOtpRequest, db: Session = Depends(get_db)):
    user = find_user(db, data.email)
    eligible = user is not None and user.is_active
    if data.purpose == VERIFY_EMAIL:
        eligible = eligible and not user.is_verified
    else:
        eligible = eligible and user.is_verified

    if not eligible:
        return MessageResponse(message=GENERIC_CODE_SENT, resend_available_in=settings.otp_resend_cooldown_seconds)

    cooldown = issue_otp(db, user, data.purpose)
    return MessageResponse(message="A new code has been sent to your email.", resend_available_in=cooldown)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = find_user(db, data.email)
    password_ok = verify_password(data.password, user.hashed_password if user else DUMMY_HASH)
    if user is None or not password_ok:
        raise api_error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Incorrect email or password.")

    if not user.is_active:
        raise api_error(status.HTTP_403_FORBIDDEN, "account_disabled", "This account has been disabled.")

    if not user.is_verified:
        raise api_error(
            status.HTTP_403_FORBIDDEN,
            "email_not_verified",
            "Your email is not verified yet. Request a new code to verify it.",
            email=user.email,
        )

    return token_response(user)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: EmailRequest, db: Session = Depends(get_db)):
    user = find_user(db, data.email)
    if user is None or not user.is_active or not user.is_verified:
        # Same answer whether or not the account exists.
        return MessageResponse(message=GENERIC_CODE_SENT, resend_available_in=settings.otp_resend_cooldown_seconds)

    cooldown = issue_otp(db, user, PASSWORD_RESET)
    return MessageResponse(message=GENERIC_CODE_SENT, resend_available_in=cooldown)


@router.post("/verify-reset-otp", response_model=ResetTokenResponse)
def verify_reset_otp(data: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = find_user(db, data.email)
    verify_otp(db, user, PASSWORD_RESET, data.code)
    db.commit()
    token = create_token(user.id, user.hashed_password, RESET_PURPOSE, settings.reset_token_minutes)
    return ResetTokenResponse(reset_token=token)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    invalid = api_error(
        status.HTTP_400_BAD_REQUEST,
        "reset_token_invalid",
        "This reset session has expired or was already used. Start again.",
    )
    payload = decode_token(data.reset_token, RESET_PURPOSE)
    if payload is None:
        raise invalid

    user = db.get(User, int(payload["sub"]))
    # The fingerprint changes when the password does, so the token works only once.
    if user is None or not user.is_active or payload.get("pfp") != password_fingerprint(user.hashed_password):
        raise invalid

    user.hashed_password = hash_password(data.password)
    db.commit()
    return MessageResponse(message="Your password has been updated. Log in with your new password.")
