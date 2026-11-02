
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hasher = PasswordHash.recommended()

ACCESS_PURPOSE = "access"
RESET_PURPOSE = "password_reset"


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hasher.verify(password, hashed_password)


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str) -> str:
    # Keyed hash: a leaked database row cannot be brute-forced back to the
    # six-digit code without the server secret.
    return hmac.new(settings.jwt_secret.encode(), f"otp:{code}".encode(), hashlib.sha256).hexdigest()


def otp_matches(code: str, code_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(code), code_hash)


def password_fingerprint(hashed_password: str) -> str:
    # Embedded in tokens so that changing the password invalidates every
    # previously issued access token and makes a reset token single-use.
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:16]


def create_token(user_id: int, hashed_password: str, purpose: str, minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "purpose": purpose,
        "pfp": password_fingerprint(hashed_password),
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, purpose: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != purpose or not str(payload.get("sub", "")).isdigit():
        return None
    return payload


# ---- Printed card identifiers ----
# Unambiguous alphabet: no 0/O, 1/I/L.
CARD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _random_chars(length: int) -> str:
    return "".join(secrets.choice(CARD_ALPHABET) for _ in range(length))


def generate_card_public_id() -> str:
    return _random_chars(8).lower()


def generate_activation_code() -> str:
    """12 characters (~59 bits), shown to the buyer as XXXX-XXXX-XXXX."""
    raw = _random_chars(12)
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


def normalize_activation_code(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def hash_activation_code(code: str) -> str:
    normalized = normalize_activation_code(code)
    return hmac.new(settings.jwt_secret.encode(), f"card:{normalized}".encode(), hashlib.sha256).hexdigest()
