
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class EmailOTP(Base):
    """One row per code sent. Only the keyed hash of the code is stored."""

    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    purpose = Column(String(20), nullable=False)  # "verify_email" or "password_reset"
    code_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    # Set when the code is used successfully, replaced by a newer code, or locked.
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_email_otps_user_purpose_created", "user_id", "purpose", "created_at"),)


class Card(Base):
    """A user's digital visiting card. One per user; a draft until published."""

    __tablename__ = "cards"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    profession = Column(String(30), nullable=True)
    template = Column(String(20), nullable=False, default="classic", server_default="classic")
    theme = Column(String(20), nullable=False, default="aurora", server_default="aurora")
    font = Column(String(20), nullable=False, default="sans", server_default="sans")
    animated = Column(Boolean, nullable=False, default=True, server_default="true")
    values = Column(JSONB, nullable=False, default=dict, server_default="{}")
    status = Column(String(20), nullable=False, default="draft", server_default="draft")  # draft | published
    # The card ID: generated on the server, unique, never changes once set.
    slug = Column(String(60), unique=True, nullable=True)
    # Canonical public link (PUBLIC_APP_URL + /card/<slug>), fixed when the card is saved.
    public_url = Column(String(300), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PhysicalCard(Base):
    """A printed NFC/QR card. Its public_id is printed or written to NFC; the
    activation code is given to the buyer and stored only as a keyed hash."""

    __tablename__ = "physical_cards"

    id = Column(Integer, primary_key=True)
    public_id = Column(String(16), unique=True, nullable=False, index=True)
    code_hash = Column(String(64), unique=True, nullable=False)
    batch = Column(String(60), nullable=True)
    is_disabled = Column(Boolean, nullable=False, default=False, server_default="false")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    # The digital card this physical card opens, recorded at activation.
    digital_card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
