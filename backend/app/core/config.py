
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _int(name: str, default: int) -> int:
    value = os.getenv(name)
    return int(value) if value else default


def _list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "")

    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = _int("ACCESS_TOKEN_MINUTES", 60)
    reset_token_minutes: int = _int("RESET_TOKEN_MINUTES", 10)

    # "smtp" sends real email. "console" prints the email to the server log and
    # is only meant for local development without SMTP credentials.
    email_backend: str = os.getenv("EMAIL_BACKEND", "smtp").lower()
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = _int("SMTP_PORT", 587)
    smtp_email: str = os.getenv("SMTP_EMAIL", "").strip()
    # Gmail shows App Passwords as "abcd efgh ijkl mnop"; the spaces are not part of it.
    smtp_password: str = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    smtp_from_name: str = os.getenv("SMTP_FROM_NAME", "TapCard")

    # Reject sign-ups whose email domain has no mail servers (typos like gfmail.com).
    email_domain_check: bool = os.getenv("EMAIL_DOMAIN_CHECK", "true").lower() != "false"

    otp_expire_minutes: int = _int("OTP_EXPIRE_MINUTES", 5)
    otp_max_attempts: int = _int("OTP_MAX_ATTEMPTS", 5)
    otp_resend_cooldown_seconds: int = _int("OTP_RESEND_COOLDOWN_SECONDS", 60)
    otp_max_sends_per_hour: int = _int("OTP_MAX_SENDS_PER_HOUR", 5)

    # "development" or "production". Development-only shortcuts below are ignored otherwise.
    app_env: str = os.getenv("APP_ENV", "production").strip().lower()
    # One demo NFC activation code for testing the activation flow without a
    # registered card. Stored normalised (letters/digits, upper case). Only
    # honoured when APP_ENV=development; always None otherwise.
    dev_demo_activation_code: str | None = (
        "".join(ch for ch in os.getenv("DEV_DEMO_ACTIVATION_CODE", "").upper() if ch.isalnum()) or None
        if os.getenv("APP_ENV", "production").strip().lower() == "development"
        else None
    )

    # Public address of the frontend; card links and QR codes are built from it.
    # Set this to the real domain in production (never localhost).
    public_app_url: str = os.getenv("PUBLIC_APP_URL", "http://localhost:5173").rstrip("/")

    frontend_origins: list[str] = field(
        default_factory=lambda: _list("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:4173")
    )


settings = Settings()

if len(settings.jwt_secret) < 32:
    raise RuntimeError(
        "JWT_SECRET must be set in backend/.env and be at least 32 characters. "
        'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
    )
