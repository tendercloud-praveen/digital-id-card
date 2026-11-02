
import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, ConfigDict, computed_field, field_validator, model_validator


def _check_password_strength(value: str) -> str:
    if not re.search(r"[A-Za-z]", value):
        raise ValueError("Password must contain a letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must contain a number")
    return value


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Full name is required")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        value = value.strip()
        if not re.fullmatch(r"\+?[0-9 ()-]{7,30}", value):
            raise ValueError("Enter a valid phone number")
        digits = sum(c.isdigit() for c in value)
        if digits < 7 or digits > 15:
            raise ValueError("Phone number must contain 7 to 15 digits")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        return _check_password_strength(value)

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)


class RegisterResponse(BaseModel):
    message: str
    email: EmailStr
    otp_sent: bool
    resend_available_in: int


OtpCode = Field(pattern=r"^\d{6}$")


class EmailRequest(BaseModel):
    email: EmailStr


class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: Literal["verify_email", "password_reset"] = "verify_email"


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = OtpCode


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str
    resend_available_in: int | None = None


class ResetTokenResponse(BaseModel):
    reset_token: str


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        return _check_password_strength(value)

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ---------------- Cards ----------------

class CardUpdate(BaseModel):
    """Partial update: only the fields sent are changed."""

    profession: str | None = None
    template: str | None = None
    theme: str | None = None
    font: str | None = None
    animated: bool | None = None
    values: dict[str, str] | None = None


class CardOut(BaseModel):
    profession: str | None
    template: str
    theme: str
    font: str
    animated: bool
    values: dict[str, str]
    status: str
    slug: str | None
    public_url: str | None = None
    published_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def card_id(self) -> str | None:
        return self.slug

    @computed_field
    @property
    def design_id(self) -> str:
        return self.template


class CardDesignIn(BaseModel):
    design_id: str = Field(max_length=20)
    theme: str = Field(default="aurora", max_length=20)
    font: str = Field(default="sans", max_length=20)
    animated: bool = True


class CardCreate(CardDesignIn):
    """Everything the wizard collected. Used by POST /api/cards and PUT /api/cards/{card_id}."""

    profession: str = Field(max_length=30)
    values: dict[str, str]


class CardDesignUpdate(BaseModel):
    design_id: str = Field(max_length=20)
    theme: str | None = Field(default=None, max_length=20)
    font: str | None = Field(default=None, max_length=20)
    animated: bool | None = None


class MyCardResponse(BaseModel):
    card: CardOut | None


class PublishRequest(BaseModel):
    # Lets a card moved from browser storage keep its old link when it is free.
    preferred_slug: str | None = Field(default=None, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=60)


class PublicCardOut(BaseModel):
    """Only what the owner chose to show. No user id, account email or internal ids."""

    profession: str
    template: str
    theme: str
    font: str
    animated: bool
    values: dict[str, str]
    slug: str
    public_url: str


# ---------------- Printed cards ----------------

class ValidateCardRequest(BaseModel):
    # Length/format is checked in the route, so production and the development
    # test mode can give their own clear messages.
    code: str = Field(min_length=1, max_length=40)


class ActivateCardRequest(ValidateCardRequest):
    # Optional profile from the activation wizard. When present, the digital
    # card is saved and the physical card is linked to it in one transaction.
    card: CardCreate | None = None


class PhysicalCardOut(BaseModel):
    public_id: str
    activated_at: datetime | None
    # ID (slug) of the linked digital card, when there is one.
    digital_card_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ValidateCardResponse(BaseModel):
    public_id: str
    status: str  # "available" or "yours"
    message: str
    # True only for a development test code: no physical card was found or checked.
    dev_test: bool = False


class ActivateCardResponse(BaseModel):
    message: str
    card: PhysicalCardOut
    already_yours: bool = False
    digital_card: CardOut | None = None
    # True only for a development test code: no physical card was activated.
    dev_test: bool = False


class PhysicalCardStatus(BaseModel):
    status: str  # "unactivated" | "activated"
    slug: str | None = None
