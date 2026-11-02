
from sqlalchemy import text

from app.database.database import Base, engine

# create_all() creates missing tables but never alters existing ones, so the
# columns added after the first release are applied here. Every statement is
# idempotent and safe to run on each startup.
STATEMENTS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()",
    "ALTER TABLE cards ADD COLUMN IF NOT EXISTS public_url VARCHAR(300)",
    "ALTER TABLE physical_cards ADD COLUMN IF NOT EXISTS digital_card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL",
]


def run_migrations() -> None:
    import app.models.models  # noqa: F401  (registers the tables on Base)

    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        for statement in STATEMENTS:
            connection.execute(text(statement))
