
import logging
import smtplib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, update

from app.core.config import settings
from app.database.database import SessionLocal
from app.main import app
from app.models.models import EmailOTP, User
from app.routes import auth as auth_routes
from app.services import email as email_service
from app.services import otp as otp_service

PASSWORD = "secret123"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def all_domains_accept_email(monkeypatch):
    # Tests use example.com, which deliberately has no mail servers.
    monkeypatch.setattr(auth_routes, "domain_accepts_email", lambda domain: True)


@pytest.fixture
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(
        otp_service,
        "send_otp_email",
        lambda to, name, code, purpose: sent.append({"to": to, "code": code, "purpose": purpose}),
    )
    return sent


@pytest.fixture
def identity():
    tag = uuid.uuid4().hex[:10]
    data = {
        "full_name": "Test User",
        "email": f"tapcard-test-{tag}@example.com",
        "phone": f"+91 9{int(tag, 16) % 10**9:09d}",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    yield data
    with SessionLocal() as db:
        db.execute(delete(User).where(User.email == data["email"]))
        db.commit()


def last_code(outbox, purpose="verify_email"):
    return [m for m in outbox if m["purpose"] == purpose][-1]["code"]


def skip_cooldown(email, purpose):
    """Pretend the last code was sent long enough ago to allow a resend."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        db.execute(
            update(EmailOTP)
            .where(EmailOTP.user_id == user.id, EmailOTP.purpose == purpose)
            .values(created_at=EmailOTP.created_at - timedelta(seconds=settings.otp_resend_cooldown_seconds + 1))
        )
        db.commit()


def register_and_verify(client, outbox, identity):
    assert client.post("/api/auth/register", json=identity).status_code == 201
    response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": last_code(outbox)})
    assert response.status_code == 200
    return response.json()["access_token"]


def error_code(response):
    return response.json()["detail"]["code"]


# ---------------- Registration ----------------

def test_register_sends_otp_and_stores_hashes(client, outbox, identity):
    response = client.post("/api/auth/register", json=identity)
    assert response.status_code == 201
    body = response.json()
    assert body["otp_sent"] is True and body["resend_available_in"] == settings.otp_resend_cooldown_seconds
    assert len(outbox) == 1 and outbox[0]["to"] == identity["email"]
    assert outbox[0]["code"] not in response.text  # the OTP is never returned to the client

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == identity["email"]).one()
        assert user.is_verified is False
        assert user.hashed_password.startswith("$argon2") and PASSWORD not in user.hashed_password
        otp = db.query(EmailOTP).filter(EmailOTP.user_id == user.id).one()
        assert otp.code_hash != outbox[0]["code"] and len(otp.code_hash) == 64
        lifetime = (otp.expires_at - otp.created_at).total_seconds()
        assert abs(lifetime - settings.otp_expire_minutes * 60) < 2


def test_register_validation_errors(client, outbox, identity):
    bad = {**identity, "confirm_password": "different1"}
    response = client.post("/api/auth/register", json=bad)
    assert response.status_code == 422 and response.json()["detail"]["message"] == "Passwords do not match"

    weak = {**identity, "password": "abcdefgh", "confirm_password": "abcdefgh"}
    response = client.post("/api/auth/register", json=weak)
    assert response.status_code == 422 and response.json()["detail"]["fields"]["password"] == "Password must contain a number"

    response = client.post("/api/auth/register", json={**identity, "email": "not-an-email"})
    assert response.status_code == 422 and "email" in response.json()["detail"]["fields"]


def test_register_rejects_domain_without_mail_servers(client, monkeypatch, outbox, identity):
    monkeypatch.setattr(auth_routes, "domain_accepts_email", lambda domain: False)
    response = client.post("/api/auth/register", json=identity)
    assert response.status_code == 422 and error_code(response) == "email_undeliverable"
    assert response.json()["detail"]["field"] == "email" and outbox == []
    with SessionLocal() as db:
        assert db.query(User).filter(User.email == identity["email"]).count() == 0


def test_duplicate_email_and_phone(client, outbox, identity):
    assert client.post("/api/auth/register", json=identity).status_code == 201

    same_email = {**identity, "email": identity["email"].upper(), "phone": "+1 555 000 1111"}
    response = client.post("/api/auth/register", json=same_email)
    assert response.status_code == 409 and error_code(response) == "email_taken"

    same_phone = {**identity, "email": f"tapcard-test-other-{uuid.uuid4().hex[:6]}@example.com"}
    response = client.post("/api/auth/register", json=same_phone)
    assert response.status_code == 409 and error_code(response) == "phone_taken"


# ---------------- Email verification ----------------

def test_login_blocked_until_verified_then_verify(client, outbox, identity):
    client.post("/api/auth/register", json=identity)
    response = client.post("/api/auth/login", json={"email": identity["email"], "password": PASSWORD})
    assert response.status_code == 403 and error_code(response) == "email_not_verified"

    response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": last_code(outbox)})
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert response.json()["user"]["is_verified"] is True

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["email"] == identity["email"]

    # A used code cannot be used again.
    again = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": last_code(outbox)})
    assert again.status_code == 409 and error_code(again) == "already_verified"


def test_wrong_code_attempt_limit(client, outbox, identity):
    client.post("/api/auth/register", json=identity)
    good = last_code(outbox)
    wrong = "000000" if good != "000000" else "111111"

    for left in range(settings.otp_max_attempts - 1, 0, -1):
        response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": wrong})
        assert response.status_code == 400 and response.json()["detail"]["attempts_left"] == left

    response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": wrong})
    assert response.status_code == 429 and error_code(response) == "otp_locked"

    # Even the correct code no longer works once locked.
    response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": good})
    assert response.status_code == 400 and error_code(response) == "otp_invalid"


def test_expired_code(client, outbox, identity):
    client.post("/api/auth/register", json=identity)
    with SessionLocal() as db:
        db.execute(
            update(EmailOTP)
            .where(EmailOTP.user_id == db.query(User.id).filter(User.email == identity["email"]).scalar_subquery())
            .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
        )
        db.commit()
    response = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": last_code(outbox)})
    assert response.status_code == 400 and error_code(response) == "otp_expired"


def test_resend_cooldown_replaces_old_code_and_hourly_limit(client, outbox, identity):
    client.post("/api/auth/register", json=identity)
    first = last_code(outbox)

    response = client.post("/api/auth/resend-otp", json={"email": identity["email"]})
    assert response.status_code == 429 and error_code(response) == "otp_cooldown"
    assert 0 < response.json()["detail"]["retry_after"] <= settings.otp_resend_cooldown_seconds

    skip_cooldown(identity["email"], "verify_email")
    response = client.post("/api/auth/resend-otp", json={"email": identity["email"]})
    assert response.status_code == 200 and len(outbox) == 2
    second = last_code(outbox)

    if first != second:
        old = client.post("/api/auth/verify-email", json={"email": identity["email"], "code": first})
        assert old.status_code == 400  # replaced codes are no longer valid

    for _ in range(settings.otp_max_sends_per_hour - 2):
        skip_cooldown(identity["email"], "verify_email")
        assert client.post("/api/auth/resend-otp", json={"email": identity["email"]}).status_code == 200
    skip_cooldown(identity["email"], "verify_email")
    response = client.post("/api/auth/resend-otp", json={"email": identity["email"]})
    assert response.status_code == 429 and error_code(response) == "otp_rate_limited"


def test_resend_for_unknown_email_is_generic(client, outbox):
    response = client.post("/api/auth/resend-otp", json={"email": "tapcard-test-nobody@example.com"})
    assert response.status_code == 200 and outbox == []


def test_email_failure_does_not_burn_cooldown(client, monkeypatch, identity):
    def fail(*_):
        raise email_service.EmailDeliveryError("auth_failed", "smtp down")

    monkeypatch.setattr(otp_service, "send_otp_email", fail)
    response = client.post("/api/auth/register", json=identity)
    assert response.status_code == 201 and response.json()["otp_sent"] is False

    response = client.post("/api/auth/resend-otp", json={"email": identity["email"]})
    assert response.status_code == 503 and error_code(response) == "email_failed"
    assert "smtp down" not in response.text  # internal details stay in the server log


def test_resend_after_failed_email_reuses_the_same_account(client, monkeypatch, outbox, identity):
    def fail(*_):
        raise email_service.EmailDeliveryError("not_configured", "missing")

    with monkeypatch.context() as patch:
        patch.setattr(otp_service, "send_otp_email", fail)
        assert client.post("/api/auth/register", json=identity).json()["otp_sent"] is False

    # Email works again: resend immediately (no cooldown was used up) and verify.
    response = client.post("/api/auth/resend-otp", json={"email": identity["email"]})
    assert response.status_code == 200 and len(outbox) == 1
    assert client.post("/api/auth/verify-email", json={"email": identity["email"], "code": outbox[0]["code"]}).status_code == 200

    # Registering again does not create a second account.
    assert client.post("/api/auth/register", json=identity).status_code == 409
    with SessionLocal() as db:
        assert db.query(User).filter(User.email == identity["email"]).count() == 1


# ---------------- Login and protected routes ----------------

def test_login_success_and_invalid_credentials(client, outbox, identity):
    register_and_verify(client, outbox, identity)

    response = client.post("/api/auth/login", json={"email": identity["email"].upper(), "password": PASSWORD})
    assert response.status_code == 200 and response.json()["token_type"] == "bearer"

    response = client.post("/api/auth/login", json={"email": identity["email"], "password": "wrong-pass1"})
    assert response.status_code == 401 and error_code(response) == "invalid_credentials"

    response = client.post("/api/auth/login", json={"email": "tapcard-test-nobody@example.com", "password": PASSWORD})
    assert response.status_code == 401 and error_code(response) == "invalid_credentials"


def test_protected_route_requires_valid_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_disabled_account_cannot_log_in(client, outbox, identity):
    token = register_and_verify(client, outbox, identity)
    with SessionLocal() as db:
        db.execute(update(User).where(User.email == identity["email"]).values(is_active=False))
        db.commit()
    response = client.post("/api/auth/login", json={"email": identity["email"], "password": PASSWORD})
    assert response.status_code == 403 and error_code(response) == "account_disabled"
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# ---------------- Forgot password ----------------

def test_forgot_password_full_flow(client, outbox, identity):
    old_token = register_and_verify(client, outbox, identity)
    email = identity["email"]

    response = client.post("/api/auth/forgot-password", json={"email": email})
    assert response.status_code == 200 and outbox[-1]["purpose"] == "password_reset"

    wrong = client.post("/api/auth/verify-reset-otp", json={"email": email, "code": "12345"})
    assert wrong.status_code == 422

    response = client.post("/api/auth/verify-reset-otp", json={"email": email, "code": last_code(outbox, "password_reset")})
    assert response.status_code == 200
    reset_token = response.json()["reset_token"]

    mismatch = client.post(
        "/api/auth/reset-password",
        json={"reset_token": reset_token, "password": "newpass123", "confirm_password": "newpass124"},
    )
    assert mismatch.status_code == 422

    new_password = {"reset_token": reset_token, "password": "newpass123", "confirm_password": "newpass123"}
    assert client.post("/api/auth/reset-password", json=new_password).status_code == 200

    # Reset token is single-use, old sessions are signed out, old password no longer works.
    reuse = client.post("/api/auth/reset-password", json={**new_password, "password": "another123", "confirm_password": "another123"})
    assert reuse.status_code == 400 and error_code(reuse) == "reset_token_invalid"
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "newpass123"}).status_code == 200


def test_forgot_password_unknown_email_is_generic(client, outbox):
    response = client.post("/api/auth/forgot-password", json={"email": "tapcard-test-nobody@example.com"})
    assert response.status_code == 200 and outbox == []


def test_reset_rejects_access_token(client, outbox, identity):
    access_token = register_and_verify(client, outbox, identity)
    response = client.post(
        "/api/auth/reset-password",
        json={"reset_token": access_token, "password": "newpass123", "confirm_password": "newpass123"},
    )
    assert response.status_code == 400


# ---------------- SMTP delivery ----------------

def test_smtp_uses_starttls_and_credentials(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def ehlo(self):
            calls.append(("ehlo",))

        def starttls(self, context):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user, password))

        def send_message(self, message):
            calls.append(("send", message["To"], message["Subject"], message.get_body(("plain",)).get_content()))

    fake_settings = type(settings)(
        email_backend="smtp", smtp_email="sender@gmail.com", smtp_password="app-pass", smtp_host="smtp.gmail.com", smtp_port=587
    )
    monkeypatch.setattr(email_service, "settings", fake_settings)
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    email_service.send_otp_email("user@example.com", "Asha", "482913", "verify_email")

    assert [c[0] for c in calls] == ["connect", "ehlo", "starttls", "ehlo", "login", "send"]
    assert calls[0][1:] == ("smtp.gmail.com", 587)
    assert calls[4][1:] == ("sender@gmail.com", "app-pass")
    assert calls[5][1] == "user@example.com" and "482913" in calls[5][3]


def test_auth_failure_is_classified_and_logged_without_secrets(monkeypatch, caplog):
    closed = []

    class RejectingSMTP:
        def __init__(self, *_, **__):
            pass

        def ehlo(self):
            pass

        def starttls(self, context):
            pass

        def login(self, user, password):
            raise smtplib.SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted.")

        def close(self):
            closed.append(True)

    fake_settings = type(settings)(
        email_backend="smtp", smtp_email="sender@gmail.com", smtp_password="supersecretapppw"
    )
    monkeypatch.setattr(email_service, "settings", fake_settings)
    monkeypatch.setattr(email_service.smtplib, "SMTP", RejectingSMTP)

    tapcard_logger = logging.getLogger("tapcard")
    monkeypatch.setattr(tapcard_logger, "propagate", True)  # let caplog see it
    with caplog.at_level(logging.ERROR, logger="tapcard"):
        with pytest.raises(email_service.EmailDeliveryError) as raised:
            email_service.send_otp_email("user@example.com", "Asha", "482913", "verify_email")

    assert raised.value.reason == "auth_failed" and "App Password" in raised.value.detail
    assert closed == [True]  # the connection is closed when login fails
    assert "auth_failed" in caplog.text and "535" in caplog.text
    for secret in ("supersecretapppw", "482913", "user@example.com", "sender@gmail.com"):
        assert secret not in caplog.text


def test_email_template_has_code_branding_and_expiry():
    message = email_service.build_otp_email("user@example.com", "<Asha>", "482913", "verify_email")
    html_body = message.get_body(("html",)).get_content()
    plain = message.get_body(("plain",)).get_content()
    assert "482913" in html_body and "482913" in plain
    assert "TapCard" in html_body and f"{settings.otp_expire_minutes} minutes" in html_body
    assert "&lt;Asha&gt;" in html_body and "<Asha>" not in html_body
    assert message["Subject"] == "Your TapCard verification code"


def test_smtp_not_configured_raises(monkeypatch):
    monkeypatch.setattr(email_service, "settings", type(settings)(email_backend="smtp", smtp_email="", smtp_password=""))
    with pytest.raises(email_service.EmailDeliveryError):
        email_service.send_otp_email("user@example.com", "Asha", "482913", "verify_email")
