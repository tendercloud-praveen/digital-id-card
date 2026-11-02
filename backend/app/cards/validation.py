
import re
from urllib.parse import urlparse

from email_validator import EmailNotValidError, validate_email

from app.cards.fields import FIELD_LABELS, FIELD_TYPES, MAX_IMAGE_CHARS, MAX_LENGTH, PROFESSIONS

IMAGE_PATTERN = re.compile(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")


def normalize_url(value: str) -> str:
    return value if re.match(r"^https?://", value, re.IGNORECASE) else f"https://{value}"


def clean_values(values: dict) -> tuple[dict[str, str], dict[str, str]]:
    """Validate the format of every provided value. Returns (cleaned, errors)."""
    cleaned: dict[str, str] = {}
    errors: dict[str, str] = {}
    for key, raw in values.items():
        field_type = FIELD_TYPES.get(key)
        if field_type is None:
            continue  # unknown keys are ignored
        if not isinstance(raw, str):
            errors[key] = "Must be text."
            continue
        value = raw.strip()
        if not value:
            continue

        if field_type == "image":
            if len(value) > MAX_IMAGE_CHARS or not IMAGE_PATTERN.match(value):
                errors[key] = "Upload a JPG, PNG or WebP image under 400 KB."
                continue
        elif len(value) > MAX_LENGTH[field_type]:
            errors[key] = f"Use at most {MAX_LENGTH[field_type]} characters."
            continue
        elif field_type == "email":
            try:
                value = validate_email(value, check_deliverability=False).normalized
            except EmailNotValidError:
                errors[key] = "Enter a valid email address."
                continue
        elif field_type == "tel":
            digits = sum(c.isdigit() for c in value)
            if not re.fullmatch(r"\+?[0-9 ()-]+", value) or not 7 <= digits <= 15:
                errors[key] = "Enter a valid phone number."
                continue
        elif field_type == "url":
            value = normalize_url(value)
            parsed = urlparse(value)
            if parsed.scheme not in ("http", "https") or "." not in (parsed.hostname or ""):
                errors[key] = "Enter a valid web address, such as example.com."
                continue
        cleaned[key] = value
    return cleaned, errors


def missing_required(profession: str | None, values: dict[str, str]) -> dict[str, str]:
    if profession not in PROFESSIONS:
        return {"profession": "Choose a profession."}
    return {
        key: f"{FIELD_LABELS.get(key, key.title())} is required."
        for key in PROFESSIONS[profession]["required"]
        if not values.get(key)
    }


def public_values(profession: str, values: dict[str, str]) -> dict[str, str]:
    allowed = set(PROFESSIONS.get(profession, {}).get("fields", []))
    return {key: value for key, value in values.items() if key in allowed}
