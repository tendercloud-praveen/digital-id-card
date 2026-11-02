"""Issue printed TapCards (NFC/QR) and print their links and activation codes.

    python -m app.scripts.issue_cards --count 5 --batch "Oct 2026" --base-url https://your-site.com --csv cards.csv

For each card:
  * Card link    -> write to the NFC chip / print as the QR code on the card.
  * Activation   -> give to the buyer (card insert). Shown ONCE: only a hash is stored.
  * Activate URL -> optional QR on the insert that opens activation with the code filled in.
"""

import argparse
import csv
import sys

from sqlalchemy.exc import IntegrityError

from app.core.security import generate_activation_code, generate_card_public_id, hash_activation_code
from app.database.database import SessionLocal
from app.database.migrations import run_migrations
from app.models.models import PhysicalCard


def main() -> int:
    parser = argparse.ArgumentParser(description="Issue printed TapCards.")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--batch", default=None, help="label for this print run")
    parser.add_argument("--base-url", default="http://localhost:5173", help="frontend address printed on the cards")
    parser.add_argument("--csv", default=None, help="also write the codes to this CSV file")
    args = parser.parse_args()

    run_migrations()
    base = args.base_url.rstrip("/")
    issued = []
    with SessionLocal() as db:
        while len(issued) < args.count:
            public_id, code = generate_card_public_id(), generate_activation_code()
            db.add(PhysicalCard(public_id=public_id, code_hash=hash_activation_code(code), batch=args.batch))
            try:
                db.commit()
            except IntegrityError:  # random collision: try again
                db.rollback()
                continue
            issued.append((f"{base}/c/{public_id}", code, f"{base}/activate?code={code}"))

    for link, code, activate in issued:
        print(f"Card link: {link}\n  Activation code: {code}\n  Activate URL:    {activate}\n")
    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["card_link", "activation_code", "activate_url"])
            writer.writerows(issued)
        print(f"Saved {len(issued)} cards to {args.csv}. Keep this file private.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
