
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ACCESS_PURPOSE, decode_token, password_fingerprint
from app.database.database import get_db
from app.models.models import User
from app.services.otp import api_error

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = api_error(status.HTTP_401_UNAUTHORIZED, "not_authenticated", "Please log in to continue.")
    if credentials is None:
        raise unauthorized

    payload = decode_token(credentials.credentials, ACCESS_PURPOSE)
    if payload is None:
        raise unauthorized

    user = db.get(User, int(payload["sub"]))
    if (
        user is None
        or not user.is_active
        or not user.is_verified
        or payload.get("pfp") != password_fingerprint(user.hashed_password)
    ):
        raise unauthorized
    return user
