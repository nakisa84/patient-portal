"""Settings, read from environment variables (or backend/.env for local work)."""

import base64
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def issuer_from_publishable_key(publishable_key: str) -> str:
    """Clerk publishable keys encode the Frontend API domain.

    pk_test_<base64("your-app.clerk.accounts.dev$")> -> https://your-app.clerk.accounts.dev
    """
    encoded = publishable_key.split("_", 2)[-1]
    padded = encoded + "=" * (-len(encoded) % 4)
    domain = base64.b64decode(padded).decode().rstrip("$")
    return f"https://{domain}"


def _split(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    clerk_issuer: str
    # Origins allowed to use a token (Clerk's "azp" claim). Also used for CORS.
    authorized_parties: list[str] = field(default_factory=list)
    gcs_bucket: str = ""

    @property
    def jwks_url(self) -> str:
        return f"{self.clerk_issuer}/.well-known/jwks.json"


def load_settings() -> Settings:
    issuer = os.getenv("CLERK_ISSUER", "").rstrip("/")
    if not issuer:
        key = os.getenv("CLERK_PUBLISHABLE_KEY", "")
        if not key:
            raise RuntimeError(
                "Set CLERK_PUBLISHABLE_KEY (or CLERK_ISSUER) in backend/.env. See backend/README.md."
            )
        issuer = issuer_from_publishable_key(key)

    return Settings(
        clerk_issuer=issuer,
        authorized_parties=_split(os.getenv("AUTHORIZED_PARTIES", "http://localhost:5173")),
        gcs_bucket=os.getenv("GCS_BUCKET", ""),
    )
