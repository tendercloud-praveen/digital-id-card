"""Diagnose Gmail SMTP settings without printing secrets.

    python -m app.scripts.check_email                    # connect, STARTTLS and log in only
    python -m app.scripts.check_email --send you@gmail.com   # also send a sample code email
"""

import argparse
import sys

from app.core.config import settings
from app.services.email import EmailDeliveryError, build_otp_email, check_smtp_login, email_status, send_email


def main() -> int:
    parser = argparse.ArgumentParser(description="Check TapCard SMTP settings.")
    parser.add_argument("--send", metavar="EMAIL", help="also send a sample email to this address")
    args = parser.parse_args()

    print(f"Settings : {email_status()}")
    if settings.email_backend != "smtp":
        print("EMAIL_BACKEND is not 'smtp', so nothing is sent. Set EMAIL_BACKEND=smtp in backend/.env.")
        return 1
    try:
        check_smtp_login()
        print("Login    : OK (connected, TLS upgraded, Gmail accepted the App Password)")
        if args.send:
            send_email(build_otp_email(args.send, "TapCard tester", "123456", "test"))
            print(f"Send     : OK, sample email sent to {args.send}. Check the inbox and the spam folder.")
    except EmailDeliveryError as error:
        print(f"FAILED   : [{error.reason}] {error.detail}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
