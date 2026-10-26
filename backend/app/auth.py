"""Who is calling? (plan sections 5.3 and 6.1)

Rules:
1. patient_id comes ONLY from a verified Clerk session token.
2. Anything the browser sends as a patient id (body, query string, headers) is ignored.
3. Every storage path is built from the patient_id returned here.
"""

import uuid
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, load_settings

# Small allowance for clock differences between Clerk and this machine.
LEEWAY_SECONDS = 5

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Patient:
    patient_id: str  # opaque UUID, never a name or email
    clerk_user_id: str

    @property
    def storage_prefix(self) -> str:
        return f"patients/{self.patient_id}/"


@lru_cache
def get_settings() -> Settings:
    return load_settings()


@lru_cache
def _jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    # Caches Clerk's public keys so we don't fetch them on every request.
    return jwt.PyJWKClient(jwks_url, cache_keys=True)


def get_signing_key(token: str, settings: Settings):
    return _jwks_client(settings.jwks_url).get_signing_key_from_jwt(token).key


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_clerk_token(token: str, settings: Settings) -> dict:
    """Checks signature, expiry, issuer and authorized party. Returns the claims."""
    try:
        key = get_signing_key(token, settings)
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            leeway=LEEWAY_SECONDS,
            options={"require": ["exp", "iat", "sub", "iss"], "verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired")
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise _unauthorized("Invalid session")

    azp = claims.get("azp")
    if azp is not None and settings.authorized_parties and azp not in settings.authorized_parties:
        raise _unauthorized("Invalid session")

    return claims


def get_current_patient(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> Patient:
    """FastAPI dependency. Add it to every patient endpoint."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Not signed in")

    claims = verify_clerk_token(credentials.credentials, settings)

    raw_patient_id = claims.get("patient_id")
    try:
        patient_id = str(uuid.UUID(str(raw_patient_id)))
    except (ValueError, TypeError):
        # Signed in with Clerk, but no valid patient mapping (plan 6.4 test case).
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not linked to a patient record",
        )

    return Patient(patient_id=patient_id, clerk_user_id=claims["sub"])
