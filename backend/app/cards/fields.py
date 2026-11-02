
"""Card field rules used for server-side validation.

Keep in sync with FIELDS in frontend/src/lib/card.ts. A key has the same type
in every profession, so values are kept when the profession changes.
"""

FIELD_TYPES: dict[str, str] = {
    "name": "text",
    "title": "text",
    "designation": "text",
    "organization": "text",
    "category": "text",
    "image": "image",
    "phone": "tel",
    "email": "email",
    "address": "text",
    "description": "textarea",
    "services": "textarea",
    "website": "url",
    "portfolio": "url",
    "appointment": "url",
    "github": "url",
    "linkedin": "url",
    "instagram": "url",
    "facebook": "url",
    "twitter": "url",
}

FIELD_LABELS: dict[str, str] = {
    "name": "Full name",
    "title": "Title",
    "organization": "Organization",
    "phone": "Phone number",
    "email": "Email address",
}

PROFESSIONS: dict[str, dict[str, list[str]]] = {
    # Shown in the creation wizard.
    "developer": {
        "fields": ["name", "title", "organization", "image", "email", "phone", "website", "linkedin", "github", "portfolio", "address", "description"],
        "required": ["name", "title", "email", "phone"],
    },
    "business": {
        "fields": ["name", "organization", "category", "title", "image", "email", "phone", "website", "address", "description", "instagram", "linkedin", "facebook", "twitter"],
        "required": ["name", "organization", "title", "email", "phone"],
    },
    "freelancer": {
        "fields": ["name", "title", "services", "image", "email", "phone", "portfolio", "linkedin", "website", "instagram", "organization", "address", "description"],
        "required": ["name", "title", "email", "phone"],
    },
    "designer": {
        "fields": ["name", "title", "organization", "image", "email", "phone", "portfolio", "website", "linkedin", "instagram", "address", "description"],
        "required": ["name", "title", "email", "phone"],
    },
    "consultant": {
        "fields": ["name", "title", "organization", "services", "image", "email", "phone", "website", "appointment", "linkedin", "address", "description"],
        "required": ["name", "title", "email", "phone"],
    },
    "student": {
        "fields": ["name", "title", "organization", "image", "email", "phone", "linkedin", "github", "portfolio", "description"],
        "required": ["name", "title", "organization", "email"],
    },
    "other": {
        "fields": ["name", "title", "organization", "image", "email", "phone", "website", "linkedin", "address", "description"],
        "required": ["name", "title", "email", "phone"],
    },
    # Earlier professions: no longer offered for new cards, still supported for existing ones.
    "doctor": {
        "fields": ["name", "title", "designation", "organization", "image", "phone", "email", "address", "description", "appointment", "website"],
        "required": ["name", "title", "phone", "email"],
    },
    "lawyer": {
        "fields": ["name", "title", "designation", "organization", "image", "phone", "email", "address", "description", "appointment", "website", "linkedin"],
        "required": ["name", "title", "phone", "email"],
    },
    "realtor": {
        "fields": ["name", "title", "organization", "image", "phone", "email", "address", "description", "website", "instagram", "linkedin"],
        "required": ["name", "title", "organization", "phone", "email"],
    },
    "educator": {
        "fields": ["name", "title", "organization", "image", "phone", "email", "address", "description", "appointment", "website", "linkedin"],
        "required": ["name", "title", "phone", "email"],
    },
}

TEMPLATES = {"classic", "modern", "elegant", "bold"}
THEMES = {"aurora", "ocean", "sunset", "emerald", "midnight", "gold", "rose", "graphite"}
FONTS = {"sans", "serif"}

MAX_LENGTH = {"text": 120, "textarea": 1000, "tel": 30, "email": 255, "url": 300}
MAX_IMAGE_CHARS = 500_000  # data URL of a resized photo is typically 20-60 KB
