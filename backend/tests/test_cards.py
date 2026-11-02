
import uuid

import pytest
from sqlalchemy import delete

from app.core.security import generate_activation_code, generate_card_public_id, hash_activation_code
from app.database.database import SessionLocal
from app.models.models import PhysicalCard, User
from app.routes import physical_cards as physical_routes
from tests.test_auth import (  # noqa: F401  (fixtures)
    PASSWORD,
    all_domains_accept_email,
    client,
    identity,
    outbox,
    register_and_verify,
)

VALUES = {"name": "Asha Verma", "title": "Engineer", "phone": "+91 98765 43210", "email": "asha@example.com"}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def production_card_rules(monkeypatch):
    # Tests use production activation rules regardless of the local .env;
    # the dev_mode fixture switches the development test mode on explicitly.
    from app.core.config import settings as real_settings

    monkeypatch.setattr(physical_routes, "settings", type(real_settings)(app_env="production", dev_demo_activation_code=None))


@pytest.fixture
def token(client, outbox, identity):
    return register_and_verify(client, outbox, identity)


@pytest.fixture
def second_user(client, outbox):
    tag = uuid.uuid4().hex[:10]
    data = {
        "full_name": "Second User",
        "email": f"tapcard-test-second-{tag}@example.com",
        "phone": f"+44 7{int(tag, 16) % 10**9:09d}",
        "password": PASSWORD,
        "confirm_password": PASSWORD,
    }
    yield register_and_verify(client, outbox, data)
    with SessionLocal() as db:
        db.execute(delete(User).where(User.email == data["email"]))
        db.commit()


@pytest.fixture
def printed_card():
    code, public_id = generate_activation_code(), generate_card_public_id()
    with SessionLocal() as db:
        db.add(PhysicalCard(public_id=public_id, code_hash=hash_activation_code(code), batch="pytest"))
        db.commit()
    physical_routes._failed_attempts.clear()
    yield {"code": code, "public_id": public_id}
    with SessionLocal() as db:
        db.execute(delete(PhysicalCard).where(PhysicalCard.public_id == public_id))
        db.commit()


# ---------------- Digital card ----------------

def test_card_endpoints_require_login(client):
    assert client.get("/api/cards/me").status_code == 401
    assert client.patch("/api/cards/me", json={"profession": "doctor"}).status_code == 401
    assert client.post("/api/cards/me/publish").status_code == 401
    assert client.post("/api/physical-cards/activate", json={"code": "ABCD-EFGH-JKMN"}).status_code == 401


def test_draft_steps_publish_and_public_view(client, token):
    assert client.get("/api/cards/me", headers=auth(token)).json() == {"card": None}

    card = client.patch("/api/cards/me", json={"profession": "freelancer"}, headers=auth(token)).json()
    assert card["status"] == "draft" and card["template"] == "classic" and card["theme"] == "aurora"

    response = client.patch("/api/cards/me", json={"values": {**VALUES, "website": "asha.dev"}}, headers=auth(token))
    assert response.status_code == 200 and response.json()["values"]["website"] == "https://asha.dev"

    design = {"template": "modern", "theme": "ocean", "font": "serif", "animated": False}
    card = client.patch("/api/cards/me", json=design, headers=auth(token)).json()
    assert {k: card[k] for k in design} == design and card["values"]["name"] == "Asha Verma"

    published = client.post("/api/cards/me/publish", headers=auth(token)).json()
    assert published["status"] == "published" and published["slug"].startswith("asha-verma-")

    public = client.get(f"/api/public/cards/{published['slug']}")
    assert public.status_code == 200 and public.json()["values"]["name"] == "Asha Verma"
    assert "user_id" not in public.text

    # Publishing again keeps the same link.
    assert client.post("/api/cards/me/publish", headers=auth(token)).json()["slug"] == published["slug"]


def test_publish_requires_required_fields(client, token):
    client.patch("/api/cards/me", json={"profession": "business", "values": {"name": "Asha"}}, headers=auth(token))
    response = client.post("/api/cards/me/publish", headers=auth(token))
    assert response.status_code == 422
    fields = response.json()["detail"]["fields"]
    assert set(fields) == {"title", "organization", "phone", "email"}


def test_invalid_values_and_options_rejected(client, token):
    bad = {"profession": "astronaut", "theme": "neon", "values": {"email": "nope", "website": "not a url", "image": "data:text/html;base64,AA=="}}
    response = client.patch("/api/cards/me", json=bad, headers=auth(token))
    assert response.status_code == 422
    assert {"profession", "theme", "email", "website", "image"} <= set(response.json()["detail"]["fields"])


def test_live_card_cannot_lose_required_fields(client, token):
    client.patch("/api/cards/me", json={"profession": "developer", "values": VALUES}, headers=auth(token))
    client.post("/api/cards/me/publish", headers=auth(token))
    response = client.patch("/api/cards/me", json={"values": {**VALUES, "phone": ""}}, headers=auth(token))
    assert response.status_code == 422 and "phone" in response.json()["detail"]["fields"]
    assert client.get("/api/cards/me", headers=auth(token)).json()["card"]["values"]["phone"] == VALUES["phone"]


def test_preferred_slug_used_only_when_free(client, token, second_user):
    for t in (token, second_user):
        client.patch("/api/cards/me", json={"profession": "developer", "values": VALUES}, headers=auth(t))
    wanted = f"asha-legacy-{uuid.uuid4().hex[:6]}"
    first = client.post("/api/cards/me/publish", json={"preferred_slug": wanted}, headers=auth(token)).json()
    second = client.post("/api/cards/me/publish", json={"preferred_slug": wanted}, headers=auth(second_user)).json()
    assert first["slug"] == wanted and second["slug"] != wanted


def test_unpublished_card_is_not_public(client, token):
    client.patch("/api/cards/me", json={"profession": "developer", "values": VALUES}, headers=auth(token))
    assert client.get("/api/public/cards/does-not-exist").status_code == 404


# ---------------- Printed card activation ----------------

def test_activate_printed_card(client, token, printed_card):
    status_before = client.get(f"/api/public/physical-cards/{printed_card['public_id']}").json()
    assert status_before == {"status": "unactivated", "slug": None}

    # Codes are accepted with any case, spaces or dashes.
    messy = printed_card["code"].lower().replace("-", " ")
    response = client.post("/api/physical-cards/activate", json={"code": messy}, headers=auth(token))
    assert response.status_code == 200 and response.json()["card"]["public_id"] == printed_card["public_id"]

    again = client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(token))
    assert again.status_code == 200 and again.json()["already_yours"] is True

    mine = client.get("/api/physical-cards/me", headers=auth(token)).json()
    assert [c["public_id"] for c in mine] == [printed_card["public_id"]]

    # Activated but no published digital card yet.
    assert client.get(f"/api/public/physical-cards/{printed_card['public_id']}").json() == {"status": "activated", "slug": None}

    client.patch("/api/cards/me", json={"profession": "developer", "values": VALUES}, headers=auth(token))
    slug = client.post("/api/cards/me/publish", headers=auth(token)).json()["slug"]
    assert client.get(f"/api/public/physical-cards/{printed_card['public_id']}").json() == {"status": "activated", "slug": slug}


def test_card_cannot_be_claimed_twice(client, token, second_user, printed_card):
    assert client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(token)).status_code == 200
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(second_user))
    assert response.status_code == 409 and response.json()["detail"]["code"] == "already_activated"


def test_invalid_codes_and_attempt_limit(client, token, printed_card):
    short = client.post("/api/physical-cards/activate", json={"code": "ABCD"}, headers=auth(token))
    assert short.status_code == 400

    for _ in range(physical_routes.MAX_FAILED_ATTEMPTS):
        wrong = client.post("/api/physical-cards/activate", json={"code": "ZZZZ-ZZZZ-ZZZZ"}, headers=auth(token))
        assert wrong.status_code == 404 and wrong.json()["detail"]["code"] == "invalid_code"

    # Even the right code is refused while locked out.
    locked = client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(token))
    assert locked.status_code == 429 and locked.json()["detail"]["code"] == "too_many_attempts"


def test_disabled_and_unknown_printed_cards(client, token, printed_card):
    assert client.get("/api/public/physical-cards/nosuchid").status_code == 404
    with SessionLocal() as db:
        db.query(PhysicalCard).filter(PhysicalCard.public_id == printed_card["public_id"]).update({"is_disabled": True})
        db.commit()
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(token))
    assert response.status_code == 403


def test_code_is_stored_only_as_hash(printed_card):
    with SessionLocal() as db:
        row = db.query(PhysicalCard).filter(PhysicalCard.public_id == printed_card["public_id"]).one()
        assert printed_card["code"] not in row.code_hash and len(row.code_hash) == 64


# ---------------- Wizard save: POST /api/cards and owner endpoints ----------------

from sqlalchemy.exc import IntegrityError  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models.models import Card  # noqa: E402

NEW_CARD = {
    "profession": "freelancer",
    "design_id": "modern",
    "theme": "ocean",
    "font": "serif",
    "animated": False,
    "values": {**VALUES, "services": "Copywriting, editing", "portfolio": "asha.dev/work"},
}


def card_count(email):
    with SessionLocal() as db:
        return db.query(Card).join(User, Card.user_id == User.id).filter(User.email == email).count()


def test_create_card_generates_id_url_and_public_view(client, token, identity):
    response = client.post("/api/cards", json=NEW_CARD, headers=auth(token))
    assert response.status_code == 201
    card = response.json()
    assert card["status"] == "published" and card["card_id"] == card["slug"] and card["design_id"] == "modern"
    assert card["card_id"].startswith("asha-verma-") and len(card["card_id"]) == len("asha-verma-") + 6
    assert card["public_url"] == f"{settings.public_app_url}/card/{card['card_id']}"
    assert card["values"]["portfolio"] == "https://asha.dev/work"

    public = client.get(f"/api/public/cards/{card['card_id']}").json()
    assert set(public) == {"profession", "template", "theme", "font", "animated", "values", "slug", "public_url"}
    assert public["public_url"] == card["public_url"] and identity["email"] not in str(public)

    # Reloading never creates a new card or changes its ID/URL.
    for _ in range(2):
        again = client.get("/api/cards/me", headers=auth(token)).json()["card"]
        assert (again["card_id"], again["public_url"]) == (card["card_id"], card["public_url"])
    assert card_count(identity["email"]) == 1


def test_create_card_validation_saves_nothing(client, token):
    bad = {**NEW_CARD, "design_id": "neon", "values": {"name": "A", "email": "nope", "website": "bad url"}}
    response = client.post("/api/cards", json=bad, headers=auth(token))
    assert response.status_code == 422
    assert {"design_id", "email", "website", "title", "phone"} <= set(response.json()["detail"]["fields"])
    assert client.post("/api/cards", json={**NEW_CARD, "profession": "astronaut"}, headers=auth(token)).status_code == 422
    assert client.get("/api/cards/me", headers=auth(token)).json() == {"card": None}


def test_student_phone_is_optional(client, token):
    student = {"profession": "student", "design_id": "classic", "values": {"name": "Ravi", "title": "B.Tech CSE", "organization": "IIT Madras", "email": "ravi@example.com"}}
    assert client.post("/api/cards", json=student, headers=auth(token)).status_code == 201


def test_repeated_save_does_not_duplicate(client, token, identity):
    first = client.post("/api/cards", json=NEW_CARD, headers=auth(token))
    second = client.post("/api/cards", json=NEW_CARD, headers=auth(token))
    assert first.status_code == 201 and second.status_code == 409
    assert second.json()["detail"] == {"code": "card_exists", "message": "You already have a digital card.", "card_id": first.json()["card_id"]}
    assert card_count(identity["email"]) == 1


def test_database_allows_one_card_per_user(client, token, identity):
    client.post("/api/cards", json=NEW_CARD, headers=auth(token))
    with SessionLocal() as db:
        user_id = db.query(User.id).filter(User.email == identity["email"]).scalar()
        db.add(Card(user_id=user_id, values={}))
        with pytest.raises(IntegrityError):
            db.commit()


def test_draft_from_old_flow_becomes_the_saved_card(client, token, identity):
    draft = client.patch("/api/cards/me", json={"profession": "developer", "values": {"name": "Asha"}}, headers=auth(token)).json()
    assert draft["status"] == "draft" and draft["card_id"] is None
    saved = client.post("/api/cards", json=NEW_CARD, headers=auth(token))
    assert saved.status_code == 201 and saved.json()["profession"] == "freelancer"
    assert card_count(identity["email"]) == 1


def test_owner_endpoints_and_ownership(client, token, second_user):
    card_id = client.post("/api/cards", json=NEW_CARD, headers=auth(token)).json()["card_id"]

    assert client.get(f"/api/cards/{card_id}", headers=auth(token)).status_code == 200
    assert client.get("/api/cards/nope-123456", headers=auth(token)).status_code == 404

    edited = {**NEW_CARD, "profession": "consultant", "values": {**VALUES, "title": "Strategy Consultant"}}
    response = client.put(f"/api/cards/{card_id}", json=edited, headers=auth(token))
    assert response.status_code == 200
    body = response.json()
    assert body["profession"] == "consultant" and body["values"]["title"] == "Strategy Consultant"
    assert body["card_id"] == card_id  # the ID and URL never change on edit

    design = client.patch(f"/api/cards/{card_id}/design", json={"design_id": "bold", "theme": "gold"}, headers=auth(token))
    assert design.status_code == 200 and design.json()["design_id"] == "bold" and design.json()["theme"] == "gold"
    assert design.json()["values"]["title"] == "Strategy Consultant"
    assert client.patch(f"/api/cards/{card_id}/design", json={"design_id": "neon"}, headers=auth(token)).status_code == 422
    assert client.put(f"/api/cards/{card_id}", json={**edited, "values": {"name": "x"}}, headers=auth(token)).status_code == 422

    # Another user can neither read nor change it.
    other = auth(second_user)
    assert client.get(f"/api/cards/{card_id}", headers=other).status_code == 403
    assert client.put(f"/api/cards/{card_id}", json=NEW_CARD, headers=other).status_code == 403
    assert client.patch(f"/api/cards/{card_id}/design", json={"design_id": "classic"}, headers=other).status_code == 403
    assert client.get(f"/api/cards/{card_id}", headers=auth(token)).json()["design_id"] == "bold"
    assert client.post("/api/cards", json=NEW_CARD).status_code == 401


# ---------------- NFC activation wizard: validate, then activate with a profile ----------------

def physical_row(public_id):
    with SessionLocal() as db:
        row = db.query(PhysicalCard).filter(PhysicalCard.public_id == public_id).one()
        return row.user_id, row.digital_card_id


def test_validate_does_not_claim(client, token, printed_card):
    response = client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}, headers=auth(token))
    assert response.status_code == 200
    assert response.json()["status"] == "available" and response.json()["public_id"] == printed_card["public_id"]
    assert physical_row(printed_card["public_id"]) == (None, None)
    assert client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}).status_code == 401


def test_validate_rejects_unknown_and_other_owner(client, token, second_user, printed_card):
    unknown = client.post("/api/physical-cards/validate", json={"code": "ZZZZ-ZZZZ-ZZZZ"}, headers=auth(token))
    assert unknown.status_code == 404 and unknown.json()["detail"]["code"] == "invalid_code"
    short = client.post("/api/physical-cards/validate", json={"code": "ABCD"}, headers=auth(token))
    assert short.status_code == 400

    client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(second_user))
    taken = client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}, headers=auth(token))
    assert taken.status_code == 409 and taken.json()["detail"]["code"] == "already_activated"
    assert "Second User" not in taken.text and "tapcard-test-second" not in taken.text


def test_validate_counts_toward_attempt_limit(client, token, printed_card):
    for _ in range(physical_routes.MAX_FAILED_ATTEMPTS):
        client.post("/api/physical-cards/validate", json={"code": "ZZZZ-ZZZZ-ZZZZ"}, headers=auth(token))
    locked = client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}, headers=auth(token))
    assert locked.status_code == 429


def test_activate_with_profile_creates_and_links_card(client, token, identity, printed_card):
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"], "card": NEW_CARD}, headers=auth(token))
    assert response.status_code == 200
    body = response.json()
    digital = body["digital_card"]
    assert body["already_yours"] is False and digital["status"] == "published" and digital["card_id"].startswith("asha-verma-")
    assert body["card"]["digital_card_id"] == digital["card_id"]
    assert digital["public_url"] == f"{settings.public_app_url}/card/{digital['card_id']}"

    with SessionLocal() as db:
        card_pk = db.query(Card.id).filter(Card.slug == digital["card_id"]).scalar()
    user_id, linked = physical_row(printed_card["public_id"])
    assert user_id is not None and linked == card_pk
    assert client.get(f"/api/public/physical-cards/{printed_card['public_id']}").json() == {"status": "activated", "slug": digital["card_id"]}
    assert client.get("/api/physical-cards/me", headers=auth(token)).json()[0]["digital_card_id"] == digital["card_id"]

    # Repeating the same request is safe: no second card, same link.
    again = client.post("/api/physical-cards/activate", json={"code": printed_card["code"], "card": NEW_CARD}, headers=auth(token))
    assert again.status_code == 200 and again.json()["already_yours"] is True
    assert again.json()["digital_card"]["card_id"] == digital["card_id"] and card_count(identity["email"]) == 1


def test_activate_keeps_existing_card_id_and_url(client, token, identity, printed_card):
    existing = client.post("/api/cards", json=NEW_CARD, headers=auth(token)).json()
    edited = {**NEW_CARD, "design_id": "elegant", "values": {**NEW_CARD["values"], "title": "Head of Content"}}
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"], "card": edited}, headers=auth(token))
    digital = response.json()["digital_card"]
    assert (digital["card_id"], digital["public_url"]) == (existing["card_id"], existing["public_url"])
    assert digital["values"]["title"] == "Head of Content" and digital["design_id"] == "elegant"
    assert card_count(identity["email"]) == 1


def test_invalid_profile_claims_nothing(client, token, printed_card):
    bad = {**NEW_CARD, "values": {"name": "A", "email": "nope"}}
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"], "card": bad}, headers=auth(token))
    assert response.status_code == 422
    assert physical_row(printed_card["public_id"]) == (None, None)
    assert client.get("/api/cards/me", headers=auth(token)).json() == {"card": None}


def test_activate_with_profile_refused_for_other_owner(client, token, second_user, printed_card):
    client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(second_user))
    response = client.post("/api/physical-cards/activate", json={"code": printed_card["code"], "card": NEW_CARD}, headers=auth(token))
    assert response.status_code == 409
    assert client.get("/api/cards/me", headers=auth(token)).json() == {"card": None}  # nothing saved


# ---------------- Development-only demo activation code ----------------

import os  # noqa: E402
import subprocess  # noqa: E402
import sys  # noqa: E402

DEMO = "123456789012"
OTHER_CODES = ["123456", "ABC123", "TRYT-RYTY-TYTR", "999999999999", "123456789013"]


@pytest.fixture
def dev_mode(monkeypatch):
    monkeypatch.setattr(physical_routes, "settings", type(settings)(app_env="development", dev_demo_activation_code=DEMO))


def physical_count():
    with SessionLocal() as db:
        return db.query(PhysicalCard).count()


def test_production_rejects_demo_and_unregistered_codes(client, token):
    for code in [DEMO, "1234-5678-9012", *OTHER_CODES]:
        response = client.post("/api/physical-cards/validate", json={"code": code}, headers=auth(token))
        assert response.status_code in (400, 404) and response.json()["detail"]["code"] == "invalid_code", code
    empty = client.post("/api/physical-cards/validate", json={"code": "   "}, headers=auth(token))
    assert empty.status_code == 400 and empty.json()["detail"]["message"] == "Enter your activation code."


def test_dev_mode_accepts_only_the_demo_code(client, token, dev_mode):
    for variant in [DEMO, "1234-5678-9012", "  123456789012  ", "1234 5678 9012"]:
        body = client.post("/api/physical-cards/validate", json={"code": variant}, headers=auth(token)).json()
        assert body["dev_test"] is True and body["public_id"] == "dev-test" and body["status"] == "available", variant
    for code in OTHER_CODES:
        response = client.post("/api/physical-cards/validate", json={"code": code}, headers=auth(token))
        assert response.status_code in (400, 404) and response.json()["detail"]["code"] == "invalid_code", code
    assert client.post("/api/physical-cards/validate", json={"code": "  "}, headers=auth(token)).status_code == 400
    assert client.post("/api/physical-cards/validate", json={"code": DEMO}).status_code == 401


def test_dev_mode_demo_activation_saves_card_but_activates_nothing(client, token, identity, dev_mode):
    before = physical_count()
    response = client.post("/api/physical-cards/activate", json={"code": "1234-5678-9012", "card": NEW_CARD}, headers=auth(token))
    assert response.status_code == 200
    body = response.json()
    assert body["dev_test"] is True and body["card"]["activated_at"] is None
    assert body["digital_card"]["status"] == "published" and "No physical NFC card was activated" in body["message"]
    assert physical_count() == before and client.get("/api/physical-cards/me", headers=auth(token)).json() == []
    # Repeating it does not create a second digital card.
    client.post("/api/physical-cards/activate", json={"code": DEMO, "card": NEW_CARD}, headers=auth(token))
    assert card_count(identity["email"]) == 1
    # Another code is still refused at activation too.
    assert client.post("/api/physical-cards/activate", json={"code": "999999999999", "card": NEW_CARD}, headers=auth(token)).status_code == 404


def test_dev_mode_keeps_real_cards_fully_checked(client, token, second_user, printed_card, dev_mode):
    real = client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}, headers=auth(token)).json()
    assert real["dev_test"] is False and real["public_id"] == printed_card["public_id"]
    client.post("/api/physical-cards/activate", json={"code": printed_card["code"]}, headers=auth(second_user))
    taken = client.post("/api/physical-cards/validate", json={"code": printed_card["code"]}, headers=auth(token))
    assert taken.status_code == 409


def run_config(env):
    code = "from app.core.config import settings; print(settings.dev_demo_activation_code)"
    full_env = {**os.environ, **env}
    return subprocess.run([sys.executable, "-c", code], env=full_env, capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(__file__))).stdout.strip()


def test_demo_code_ignored_outside_development():
    assert run_config({"APP_ENV": "production", "DEV_DEMO_ACTIVATION_CODE": DEMO}) == "None"
    assert run_config({"APP_ENV": "development", "DEV_DEMO_ACTIVATION_CODE": ""}) == "None"
    assert run_config({"APP_ENV": "development", "DEV_DEMO_ACTIVATION_CODE": "1234-5678-9012"}) == DEMO
