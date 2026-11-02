
import html
import logging
import smtplib
import socket
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app.core.config import settings

logger = logging.getLogger("tapcard.email")


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered. `reason` is a short, secret-free category."""

    def __init__(self, reason: str, detail: str):
        super().__init__(detail)
        self.reason = reason
        self.detail = detail


PURPOSE_TEXT = {
    "verify_email": {
        "subject": "Your TapCard verification code",
        "heading": "Verify your email",
        "intro": "Thanks for signing up for TapCard. Enter this code to verify your email address:",
    },
    "password_reset": {
        "subject": "Your TapCard password reset code",
        "heading": "Reset your password",
        "intro": "We received a request to reset your TapCard password. Enter this code to continue:",
    },
    "test": {
        "subject": "TapCard email settings test",
        "heading": "Email is working",
        "intro": "This is a test from your TapCard backend. Real emails will show the code like this:",
    },
}


def mask_email(address: str) -> str:
    name, _, domain = address.partition("@")
    return f"{name[:2]}***@{domain}" if domain else "<not set>"


def smtp_configured() -> bool:
    return bool(settings.smtp_email and settings.smtp_password)


def email_status() -> str:
    """Secret-free one-line summary, used in startup logs and the health check."""
    if settings.email_backend == "console":
        return "console (development only: emails are printed to the server log, not sent)"
    if not smtp_configured():
        missing = [name for name, value in (("SMTP_EMAIL", settings.smtp_email), ("SMTP_PASSWORD", settings.smtp_password)) if not value]
        return f"NOT CONFIGURED: set {' and '.join(missing)} in backend/.env, then restart the server"
    return (
        f"smtp via {settings.smtp_host}:{settings.smtp_port} (STARTTLS) as {mask_email(settings.smtp_email)}, "
        f"App Password length {len(settings.smtp_password)}"
    )


def build_otp_email(to_email: str, full_name: str, code: str, purpose: str) -> EmailMessage:
    text = PURPOSE_TEXT[purpose]
    minutes = settings.otp_expire_minutes
    brand = html.escape(settings.smtp_from_name)
    name = html.escape(full_name)

    message = EmailMessage()
    message["Subject"] = text["subject"]
    message["From"] = formataddr((settings.smtp_from_name, settings.smtp_email))
    message["To"] = to_email
    message["Message-ID"] = make_msgid(domain=settings.smtp_email.partition("@")[2] or None)
    message.set_content(
        f"Hi {full_name},\n\n{text['intro']}\n\n    {code}\n\n"
        f"This code expires in {minutes} minutes and can only be used once.\n"
        "Never share this code with anyone. TapCard will never ask you for it.\n\n"
        "If you did not request this, you can safely ignore this email.\n\n"
        f"- The {settings.smtp_from_name} team"
    )
    message.add_alternative(
        f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(text['subject'])}</title></head>
<body style="margin:0;padding:0;background:#F4F6FA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is {code}. It expires in {minutes} minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(14,29,61,0.08);font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#0E1D3D;">
        <tr>
          <td style="background:#7C3AED;background-image:linear-gradient(120deg,#7C3AED,#C026D3 55%,#06B6D4);padding:28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="width:40px;height:40px;background:rgba(255,255,255,0.22);border-radius:12px;text-align:center;vertical-align:middle;font-size:20px;font-weight:800;color:#FFFFFF;">T</td>
              <td style="padding-left:12px;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">{brand}</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#0E1D3D;">{text['heading']}</h1>
            <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#33415F;">Hi {name},</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#33415F;">{text['intro']}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 32px;">
            <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:16px;padding:20px 12px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6D28D9;margin-bottom:8px;">Your code</div>
              <div style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:38px;font-weight:800;letter-spacing:10px;color:#0E1D3D;padding-left:10px;">{code}</div>
            </div>
            <p style="margin:14px 0 0;font-size:13px;color:#56688A;">Expires in <strong style="color:#0E1D3D;">{minutes} minutes</strong> and can only be used once.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px;">
            <div style="border-top:1px solid #E6EBF3;padding-top:20px;font-size:13px;line-height:1.6;color:#56688A;">
              <strong style="color:#33415F;">Keep this code private.</strong> {brand} will never ask you to share it by phone, chat or email.
              If you did not request this code, you can safely ignore this email.
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;padding:18px 32px;font-size:12px;color:#7A8BA9;text-align:center;">
            {brand} &middot; Your digital visiting card, always with you
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>""",
        subtype="html",
    )
    return message


def _classify(error: Exception) -> tuple[str, str]:
    """Map an SMTP failure to a category and an actionable hint. Never includes credentials."""
    host = f"{settings.smtp_host}:{settings.smtp_port}"
    if isinstance(error, smtplib.SMTPAuthenticationError):
        server_text = error.smtp_error.decode(errors="replace") if isinstance(error.smtp_error, bytes) else str(error.smtp_error)
        return "auth_failed", (
            f"Gmail rejected the login ({error.smtp_code}: {server_text.splitlines()[0][:120]}). "
            "SMTP_EMAIL must be the Gmail address that created the App Password, and SMTP_PASSWORD must be the "
            "16-character App Password (needs 2-Step Verification), not your normal Gmail password."
        )
    if isinstance(error, smtplib.SMTPSenderRefused):
        return "sender_refused", f"Gmail refused the sender {mask_email(settings.smtp_email)} ({error.smtp_code})."
    if isinstance(error, smtplib.SMTPRecipientsRefused):
        return "recipient_refused", "Gmail refused the recipient address."
    if isinstance(error, smtplib.SMTPNotSupportedError):
        return "tls_unsupported", f"{host} does not support STARTTLS or AUTH. Use smtp.gmail.com with port 587."
    if isinstance(error, ssl.SSLError):
        return "tls_failed", f"TLS handshake with {host} failed ({error.__class__.__name__}). Use port 587 with STARTTLS."
    if isinstance(error, smtplib.SMTPServerDisconnected):
        return "disconnected", f"{host} closed the connection unexpectedly. Check SMTP_HOST and SMTP_PORT=587."
    if isinstance(error, (socket.timeout, TimeoutError)):
        return "timeout", f"Timed out connecting to {host}. A firewall, VPN or antivirus may be blocking port 587."
    if isinstance(error, socket.gaierror):
        return "dns_failed", f"Could not resolve {settings.smtp_host}. Check SMTP_HOST and the internet connection."
    if isinstance(error, (ConnectionRefusedError, smtplib.SMTPConnectError)):
        return "connect_failed", f"Could not connect to {host}. Check SMTP_HOST, SMTP_PORT and firewall rules."
    if isinstance(error, smtplib.SMTPResponseException):
        return "smtp_error", f"SMTP error {error.smtp_code} from {host}."
    return "smtp_error", f"{error.__class__.__name__} while talking to {host}."


def _open_connection() -> smtplib.SMTP:
    server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
    try:
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        auth_methods = getattr(server, "esmtp_features", {}).get("auth", "").upper().split()
        if "PLAIN" in auth_methods:
            # One attempt only. smtplib.login() retries with LOGIN after a failed
            # PLAIN, but Gmail closes the connection after the first rejection,
            # which turns a clear "535 Username and Password not accepted" into a
            # misleading "connection unexpectedly closed".
            server.user, server.password = settings.smtp_email, settings.smtp_password
            server.auth("PLAIN", server.auth_plain)
        else:
            server.login(settings.smtp_email, settings.smtp_password)
    except BaseException:
        server.close()
        raise
    return server


def send_email(message: EmailMessage) -> None:
    to = mask_email(message["To"])
    if settings.email_backend == "console":
        logger.warning(
            "EMAIL_BACKEND=console, email to %s not sent:\n%s", message["To"], message.get_body(("plain",)).get_content()
        )
        return

    if not smtp_configured():
        detail = email_status()
        logger.error("Email to %s not sent. %s", to, detail)
        raise EmailDeliveryError("not_configured", detail)

    try:
        with _open_connection() as server:
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as error:
        reason, hint = _classify(error)
        logger.error("Email to %s failed [%s]: %s", to, reason, hint)
        raise EmailDeliveryError(reason, hint) from error

    logger.info("Email '%s' sent to %s", message["Subject"], to)


def check_smtp_login() -> None:
    """Connect, upgrade to TLS and log in without sending anything. Raises EmailDeliveryError."""
    if not smtp_configured():
        raise EmailDeliveryError("not_configured", email_status())
    try:
        with _open_connection():
            pass
    except (smtplib.SMTPException, OSError) as error:
        raise EmailDeliveryError(*_classify(error)) from error


def send_otp_email(to_email: str, full_name: str, code: str, purpose: str) -> None:
    send_email(build_otp_email(to_email, full_name, code, purpose))
