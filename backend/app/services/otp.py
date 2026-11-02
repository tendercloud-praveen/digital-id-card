
import logging
from datetime import datetime, timedelta, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_otp, hash_otp, otp_matches
from app.models.models import EmailOTP, User
from app.services.email import EmailDeliveryError, send_otp_email

logger = logging.getLogger("tapcard.otp")

VERIFY_EMAIL = "verify_email"
PASSWORD_RESET = "password_reset"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def api_error(status_code: int, code: str, message: str, **extra) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message, **extra})


def resend_available_in(db: Session, user: User, purpose: str) -> int:
    last = db.scalar(
        select(func.max(EmailOTP.created_at)).where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose)
    )
    if last is None:
        return 0
    remaining = settings.otp_resend_cooldown_seconds - (_now() - last).total_seconds()
    return max(0, ceil(remaining))


def issue_otp(db: Session, user: User, purpose: str) -> int:
    """Create, store and email a new code. Returns the resend cooldown in seconds."""
    wait = resend_available_in(db, user, purpose)
    if wait > 0:
        raise api_error(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "otp_cooldown",
            f"Please wait {wait} seconds before requesting another code.",
            retry_after=wait,
        )

    hour_ago = _now() - timedelta(hours=1)
    sent_last_hour = db.scalar(
        select(func.count(EmailOTP.id)).where(
            EmailOTP.user_id == user.id, EmailOTP.purpose == purpose, EmailOTP.created_at > hour_ago
        )
    )
    if sent_last_hour >= settings.otp_max_sends_per_hour:
        raise api_error(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "otp_rate_limited",
            "Too many codes requested. Please try again in an hour.",
            retry_after=3600,
        )

    # Only the newest code is valid.
    db.execute(
        update(EmailOTP)
        .where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose, EmailOTP.consumed_at.is_(None))
        .values(consumed_at=_now())
    )
    code = generate_otp()
    otp = EmailOTP(
        user_id=user.id,
        purpose=purpose,
        code_hash=hash_otp(code),
        expires_at=_now() + timedelta(minutes=settings.otp_expire_minutes),
        created_at=_now(),
    )
    db.add(otp)
    db.flush()

    try:
        send_otp_email(user.email, user.full_name, code, purpose)
    except EmailDeliveryError as error:
        logger.error("Could not deliver %s code to user %s (reason: %s)", purpose, user.id, error.reason)
        # Do not count a code the user never received against their limits.
        db.delete(otp)
        db.commit()
        raise api_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "email_failed",
            "We could not send the email right now. Please try again shortly.",
        )

    db.commit()
    return settings.otp_resend_cooldown_seconds


def verify_otp(db: Session, user: User | None, purpose: str, code: str) -> None:
    """Consume a valid code or raise. Unknown users get the same error as a wrong code."""
    otp = None
    if user is not None:
        otp = db.scalar(
            select(EmailOTP)
            .where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose, EmailOTP.consumed_at.is_(None))
            .order_by(EmailOTP.created_at.desc())
            .limit(1)
            .with_for_update()
        )

    if otp is None:
        raise api_error(
            status.HTTP_400_BAD_REQUEST, "otp_invalid", "This code is not valid. Request a new code and try again."
        )

    if otp.expires_at <= _now():
        otp.consumed_at = _now()
        db.commit()
        raise api_error(status.HTTP_400_BAD_REQUEST, "otp_expired", "This code has expired. Request a new code.")

    if not otp_matches(code, otp.code_hash):
        otp.attempts += 1
        attempts_left = settings.otp_max_attempts - otp.attempts
        if attempts_left <= 0:
            otp.consumed_at = _now()
            db.commit()
            raise api_error(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "otp_locked",
                "Too many incorrect attempts. Request a new code.",
            )
        db.commit()
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "otp_incorrect",
            f"Incorrect code. {attempts_left} attempt{'s' if attempts_left != 1 else ''} left.",
            attempts_left=attempts_left,
        )

    otp.consumed_at = _now()
