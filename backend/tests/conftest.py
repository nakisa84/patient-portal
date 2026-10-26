"""Test setup: we sign our own tokens with a test key, so no real Clerk call is made."""

import os
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

TEST_ISSUER = "https://test-app.clerk.accounts.dev"
os.environ["CLERK_ISSUER"] = TEST_ISSUER
os.environ["AUTHORIZED_PARTIES"] = "http://localhost:5173"

from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.main import app  # noqa: E402

DANA = "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42"
SAM = "b83e0d17-92c4-4f6a-8a3e-5c1f7d2e9b60"

_clerk_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_attacker_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def fake_clerk_keys(monkeypatch):
    monkeypatch.setattr(auth, "get_signing_key", lambda token, settings: _clerk_key.public_key())


def make_token(*, patient_id=DANA, signed_by=None, **overrides) -> str:
    now = int(time.time())
    claims = {
        "sub": "user_test123",
        "iss": TEST_ISSUER,
        "azp": "http://localhost:5173",
        "iat": now,
        "nbf": now,
        "exp": now + 60,
    }
    if patient_id is not None:
        claims["patient_id"] = patient_id
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, signed_by or _clerk_key, algorithm="RS256")


def attacker_key():
    return _attacker_key


@pytest.fixture
def client():
    return TestClient(app)
