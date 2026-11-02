
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_activation_code, normalize_activation_code
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.models import Card, PhysicalCard, User
from app.routes.cards import save_card_for_user, validated_card_input
from app.schemas.schemas import (
    ActivateCardRequest,
    ActivateCardResponse,
    CardOut,
    PhysicalCardOut,
    PhysicalCardStatus,
    ValidateCardRequest,
    ValidateCardResponse,
)
from app.services.otp import api_error

router = APIRouter(tags=["Printed cards"])

# Failed activation attempts per user, to stop code guessing. Codes have ~59
# bits of entropy, so this is defence in depth. In-process only: with several
# server workers each keeps its own count.
MAX_FAILED_ATTEMPTS = 10
FAILED_WINDOW_SECONDS = 15 * 60
_failed_attempts: dict[int, deque] = defaultdict(deque)
_lock = threading.Lock()


def _recent_failures(user_id: int) -> deque:
    attempts = _failed_attempts[user_id]
    cutoff = time.monotonic() - FAILED_WINDOW_SECONDS
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    return attempts


def find_card_for_user(db: Session, user: User, code: str, lock: bool) -> PhysicalCard:
    """Look up a physical card by activation code and check the user may activate it.

    Shared by validation and activation so both apply exactly the same rules.
    Returns a card that is either unclaimed or already this user's.
    """
    with _lock:
        failures = _recent_failures(user.id)
        if len(failures) >= MAX_FAILED_ATTEMPTS:
            wait = int(FAILED_WINDOW_SECONDS - (time.monotonic() - failures[0])) + 1
            raise api_error(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "too_many_attempts",
                f"Too many incorrect codes. Try again in {max(1, wait // 60)} minutes.",
                retry_after=wait,
            )

    if len(normalize_activation_code(code)) != 12:
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "invalid_code",
            "Activation codes have 12 letters and numbers, like ABCD-EFGH-JKMN.",
        )

    query = db.query(PhysicalCard).filter(PhysicalCard.code_hash == hash_activation_code(code))
    card = (query.with_for_update() if lock else query).first()

    if card is None:
        with _lock:
            _recent_failures(user.id).append(time.monotonic())
        raise api_error(
            status.HTTP_404_NOT_FOUND,
            "invalid_code",
            "This activation code is not valid. Check the code printed on your card insert.",
        )
    if card.is_disabled:
        raise api_error(status.HTTP_403_FORBIDDEN, "card_disabled", "This card has been disabled. Contact support.")
    if card.user_id is not None and card.user_id != user.id:
        # Never reveal who owns it.
        raise api_error(
            status.HTTP_409_CONFLICT,
            "already_activated",
            "This card has already been activated by another account.",
        )
    return card


DEV_TEST_PUBLIC_ID = "dev-test"


def is_dev_test_code(db: Session, code: str) -> bool:
    """Development only: the one configured demo code (DEV_DEMO_ACTIVATION_CODE).

    Compared after the same normalisation as real codes (case, spaces and
    dashes ignored). Any other code, and the demo code if it is ever issued as
    a real card, goes through the normal registered-card checks.
    """
    demo = settings.dev_demo_activation_code
    if not demo or normalize_activation_code(code) != demo:
        return False
    registered = db.query(PhysicalCard.id).filter(PhysicalCard.code_hash == hash_activation_code(code)).first()
    return registered is None


def require_code(code: str) -> None:
    if not code.strip():
        raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_code", "Enter your activation code.")


def physical_card_out(db: Session, card: PhysicalCard) -> PhysicalCardOut:
    linked = db.get(Card, card.digital_card_id) if card.digital_card_id else None
    return PhysicalCardOut(public_id=card.public_id, activated_at=card.activated_at, digital_card_id=linked.slug if linked else None)


@router.post("/api/physical-cards/validate", response_model=ValidateCardResponse)
def validate_card(data: ValidateCardRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Check a scanned or typed activation code without activating anything."""
    require_code(data.code)
    if is_dev_test_code(db, data.code):
        return ValidateCardResponse(
            public_id=DEV_TEST_PUBLIC_ID,
            status="available",
            message="Demo activation code accepted (development test). No physical card was checked.",
            dev_test=True,
        )
    card = find_card_for_user(db, user, data.code, lock=False)
    if card.user_id == user.id:
        return ValidateCardResponse(public_id=card.public_id, status="yours", message="This card is already activated on your account.")
    return ValidateCardResponse(public_id=card.public_id, status="available", message="This card is ready to activate.")


@router.post("/api/physical-cards/activate", response_model=ActivateCardResponse)
def activate_card(data: ActivateCardRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Link a physical card to the user. With `card`, also save the digital card in the same transaction."""
    require_code(data.code)
    # Validate the profile first so a bad form never claims the physical card.
    values = validated_card_input(data.card) if data.card is not None else None

    if is_dev_test_code(db, data.code):
        # Demo test: save the digital card from the wizard, but no physical
        # card exists, so nothing is activated or linked.
        if data.card is None:
            raise api_error(status.HTTP_400_BAD_REQUEST, "invalid_code", "Test codes need the card details from the activation steps.")
        test_card = save_card_for_user(db, user, data.card, values)
        db.commit()
        db.refresh(test_card)
        return ActivateCardResponse(
            message="Demo test complete. Your digital card was saved. No physical NFC card was activated.",
            card=PhysicalCardOut(public_id=DEV_TEST_PUBLIC_ID, activated_at=None, digital_card_id=test_card.slug),
            digital_card=CardOut.model_validate(test_card),
            dev_test=True,
        )

    card = find_card_for_user(db, user, data.code, lock=True)
    already_yours = card.user_id == user.id

    digital: Card | None
    if data.card is not None:
        digital = save_card_for_user(db, user, data.card, values)
    else:
        digital = db.query(Card).filter(Card.user_id == user.id, Card.status == "published").first()

    if not already_yours:
        card.user_id = user.id
        card.activated_at = datetime.now(timezone.utc)
    if digital is not None:
        card.digital_card_id = digital.id

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error(status.HTTP_409_CONFLICT, "save_conflict", "Your card could not be activated. Please try again.")
    db.refresh(card)
    if digital is not None:
        db.refresh(digital)

    return ActivateCardResponse(
        message="This card is already activated on your account." if already_yours else "Your card is activated.",
        card=physical_card_out(db, card),
        already_yours=already_yours,
        digital_card=CardOut.model_validate(digital) if digital is not None and digital.status == "published" else None,
    )


@router.get("/api/physical-cards/me", response_model=list[PhysicalCardOut])
def my_physical_cards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cards = (
        db.query(PhysicalCard)
        .filter(PhysicalCard.user_id == user.id)
        .order_by(PhysicalCard.activated_at.desc())
        .all()
    )
    return [physical_card_out(db, card) for card in cards]


@router.get("/api/public/physical-cards/{public_id}", response_model=PhysicalCardStatus)
def physical_card_status(public_id: str, db: Session = Depends(get_db)):
    """What a tap (NFC) or scan of the card's own QR code should open."""
    card = db.query(PhysicalCard).filter(PhysicalCard.public_id == public_id.lower()).first()
    if card is None or card.is_disabled:
        raise api_error(status.HTTP_404_NOT_FOUND, "card_not_found", "This TapCard does not exist.")
    if card.user_id is None:
        return PhysicalCardStatus(status="unactivated")
    linked = db.get(Card, card.digital_card_id) if card.digital_card_id else None
    if linked is None or linked.status != "published" or linked.user_id != card.user_id:
        linked = db.query(Card).filter(Card.user_id == card.user_id, Card.status == "published").first()
    return PhysicalCardStatus(status="activated", slug=linked.slug if linked else None)
