
import re
import secrets
import unicodedata
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.cards.fields import FONTS, PROFESSIONS, TEMPLATES, THEMES
from app.cards.validation import clean_values, missing_required, public_values
from app.core.config import settings
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.models import Card, User
from app.schemas.schemas import (
    CardCreate,
    CardDesignUpdate,
    CardOut,
    CardUpdate,
    MyCardResponse,
    PublicCardOut,
    PublishRequest,
)
from app.services.otp import api_error

router = APIRouter(tags=["Cards"])

SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def validation_failed(fields: dict[str, str], message: str = "Please fix the highlighted fields."):
    return api_error(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "validation_error",
        message,
        fields=fields,
    )


def get_user_card(db: Session, user: User) -> Card | None:
    return db.query(Card).filter(Card.user_id == user.id).first()


def make_slug(db: Session, name: str, preferred: str | None = None) -> str:
    if preferred and not db.query(Card.id).filter(Card.slug == preferred).first():
        return preferred
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")[:30] or "card"
    while True:
        slug = f"{base}-{''.join(secrets.choice(SLUG_ALPHABET) for _ in range(6))}"
        if not db.query(Card.id).filter(Card.slug == slug).first():
            return slug


def canonical_url(slug: str) -> str:
    return f"{settings.public_app_url}/card/{slug}"


def design_errors(template: str | None, theme: str | None, font: str | None) -> dict[str, str]:
    errors: dict[str, str] = {}
    if template is not None and template not in TEMPLATES:
        errors["design_id"] = "Choose one of the available designs."
    if theme is not None and theme not in THEMES:
        errors["theme"] = "Choose one of the available colour themes."
    if font is not None and font not in FONTS:
        errors["font"] = "Choose one of the available fonts."
    return errors


def validated_card_input(data: CardCreate) -> dict[str, str]:
    """Full validation for a complete card. Returns the cleaned values or raises 422."""
    errors = design_errors(data.design_id, data.theme, data.font)
    if data.profession not in PROFESSIONS:
        errors["profession"] = "Choose a profession from the list."
    values, value_errors = clean_values(data.values)
    errors.update(value_errors)
    if "profession" not in errors:
        errors.update({k: v for k, v in missing_required(data.profession, values).items() if k not in errors})
    if errors:
        raise validation_failed(errors)
    return values


def apply_card_input(card: Card, data: CardCreate, values: dict[str, str]) -> None:
    card.profession = data.profession
    card.template = data.design_id
    card.theme = data.theme
    card.font = data.font
    card.animated = data.animated
    card.values = values


def owned_card(db: Session, user: User, card_id: str, lock: bool = False) -> Card:
    query = db.query(Card).filter(Card.slug == card_id)
    card = (query.with_for_update() if lock else query).first()
    if card is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "card_not_found", "Card not found.")
    if card.user_id != user.id:
        raise api_error(status.HTTP_403_FORBIDDEN, "not_card_owner", "You can only manage your own card.")
    return card


def ensure_public_url(db: Session, card: Card | None) -> Card | None:
    # Cards published before public_url existed get it once; after that it never changes.
    if card is not None and card.slug and card.status == "published" and not card.public_url:
        card.public_url = canonical_url(card.slug)
        db.commit()
        db.refresh(card)
    return card


# ---------------- Current user's card ----------------

@router.get("/api/cards/me", response_model=MyCardResponse)
def get_my_card(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The user's card, or {"card": null}. A card with status "draft" is not saved yet."""
    return MyCardResponse(card=ensure_public_url(db, get_user_card(db, user)))


@router.post("/api/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED)
def create_card(data: CardCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save the wizard's card, generate its ID and public URL. One card per user."""
    values = validated_card_input(data)

    existing = db.query(Card).filter(Card.user_id == user.id).with_for_update().first()
    if existing is not None and existing.status == "published":
        raise api_error(
            status.HTTP_409_CONFLICT,
            "card_exists",
            "You already have a digital card.",
            card_id=existing.slug,
        )

    # An unfinished draft from the earlier step-by-step flow becomes the saved card.
    card = existing or Card(user_id=user.id)
    apply_card_input(card, data, values)
    card.slug = card.slug or make_slug(db, values["name"])
    card.public_url = canonical_url(card.slug)
    card.status = "published"
    card.published_at = datetime.now(timezone.utc)
    db.add(card)
    try:
        db.commit()
    except IntegrityError:
        # A parallel request for the same user won (users have one card), or an ID collided.
        db.rollback()
        winner = get_user_card(db, user)
        if winner is not None and winner.status == "published":
            raise api_error(status.HTTP_409_CONFLICT, "card_exists", "You already have a digital card.", card_id=winner.slug)
        raise api_error(status.HTTP_409_CONFLICT, "save_conflict", "Your card could not be saved. Please try again.")
    db.refresh(card)
    return card


@router.get("/api/cards/{card_id}", response_model=CardOut)
def get_card(card_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ensure_public_url(db, owned_card(db, user, card_id))


@router.put("/api/cards/{card_id}", response_model=CardOut)
def replace_card(card_id: str, data: CardCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner edits the profession, details and design. The card ID and URL stay the same."""
    values = validated_card_input(data)
    card = owned_card(db, user, card_id, lock=True)
    apply_card_input(card, data, values)
    db.commit()
    db.refresh(card)
    return card


@router.patch("/api/cards/{card_id}/design", response_model=CardOut)
def change_design(card_id: str, data: CardDesignUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    errors = design_errors(data.design_id, data.theme, data.font)
    if errors:
        raise validation_failed(errors)
    card = owned_card(db, user, card_id, lock=True)
    card.template = data.design_id
    for attr in ("theme", "font", "animated"):
        value = getattr(data, attr)
        if value is not None:
            setattr(card, attr, value)
    db.commit()
    db.refresh(card)
    return card


# ---------------- Step-by-step draft API (used to move browser-saved cards to the account) ----------------

@router.patch("/api/cards/me", response_model=CardOut)
def update_my_card(data: CardUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    errors = design_errors(data.template, data.theme, data.font)
    if "design_id" in errors:
        errors["template"] = errors.pop("design_id")
    if data.profession is not None and data.profession not in PROFESSIONS:
        errors["profession"] = "Choose a profession from the list."

    values = None
    if data.values is not None:
        values, value_errors = clean_values(data.values)
        errors.update(value_errors)
    if errors:
        raise validation_failed(errors)

    card = get_user_card(db, user) or Card(user_id=user.id, values={})
    for attr in ("profession", "template", "theme", "font", "animated"):
        value = getattr(data, attr)
        if value is not None:
            setattr(card, attr, value)
    if values is not None:
        card.values = values

    # A live card must stay complete: edits cannot remove required information.
    if card.status == "published":
        missing = missing_required(card.profession, card.values)
        if missing:
            db.rollback()
            raise validation_failed(missing, "Your card is live, so required fields cannot be left empty.")

    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.post("/api/cards/me/publish", response_model=CardOut)
def publish_my_card(
    data: PublishRequest | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = get_user_card(db, user)
    if card is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "no_card", "Create your card before publishing it.")

    missing = missing_required(card.profession, card.values)
    if missing:
        raise validation_failed(missing, "Add the required details before publishing.")

    if not card.slug:
        card.slug = make_slug(db, card.values.get("name", ""), data.preferred_slug if data else None)
    card.public_url = card.public_url or canonical_url(card.slug)
    if card.status != "published":
        card.status = "published"
        card.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(card)
    return card


# ---------------- Public ----------------

@router.get("/api/public/cards/{slug}", response_model=PublicCardOut)
def get_public_card(slug: str, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.slug == slug, Card.status == "published").first()
    if card is None:
        raise api_error(status.HTTP_404_NOT_FOUND, "card_not_found", "This card does not exist or is not published.")
    return PublicCardOut(
        profession=card.profession,
        template=card.template,
        theme=card.theme,
        font=card.font,
        animated=card.animated,
        values=public_values(card.profession, card.values),
        slug=card.slug,
        public_url=card.public_url or canonical_url(card.slug),
    )


def save_card_for_user(db: Session, user: User, data: CardCreate, values: dict[str, str]) -> Card:
    """Create the user's card, or update the one they have, without committing.

    Used by NFC activation so saving the profile and linking the physical card
    happen in one transaction. An existing card keeps its ID and public URL.
    """
    card = db.query(Card).filter(Card.user_id == user.id).with_for_update().first() or Card(user_id=user.id)
    apply_card_input(card, data, values)
    card.slug = card.slug or make_slug(db, values["name"])
    card.public_url = card.public_url or canonical_url(card.slug)
    if card.status != "published":
        card.status = "published"
        card.published_at = datetime.now(timezone.utc)
    db.add(card)
    db.flush()
    return card
