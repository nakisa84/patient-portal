"""Identity checks from plan section 6.4. These are part of the isolation release gate."""

import time

from .conftest import DANA, SAM, attacker_key, make_token


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health_needs_no_login(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_valid_token_returns_patient_from_token(client):
    r = client.get("/api/me", headers=auth(make_token()))
    assert r.status_code == 200
    assert r.json() == {"patient_id": DANA, "storage_prefix": f"patients/{DANA}/"}


def test_no_token_is_rejected(client):
    assert client.get("/api/me").status_code == 401


def test_garbage_token_is_rejected(client):
    assert client.get("/api/me", headers=auth("not-a-jwt")).status_code == 401


def test_expired_token_is_rejected(client):
    old = int(time.time()) - 3600
    token = make_token(iat=old, nbf=old, exp=old + 60)
    r = client.get("/api/me", headers=auth(token))
    assert r.status_code == 401
    assert r.json()["detail"] == "Session expired"


def test_token_signed_by_someone_else_is_rejected(client):
    token = make_token(signed_by=attacker_key())
    assert client.get("/api/me", headers=auth(token)).status_code == 401


def test_token_from_another_clerk_app_is_rejected(client):
    token = make_token(iss="https://some-other-app.clerk.accounts.dev")
    assert client.get("/api/me", headers=auth(token)).status_code == 401


def test_token_for_another_website_is_rejected(client):
    token = make_token(azp="https://evil.example.com")
    assert client.get("/api/me", headers=auth(token)).status_code == 401


def test_missing_patient_mapping_is_forbidden(client):
    r = client.get("/api/me", headers=auth(make_token(patient_id=None)))
    assert r.status_code == 403


def test_invalid_patient_mapping_is_forbidden(client):
    r = client.get("/api/me", headers=auth(make_token(patient_id="../sam")))
    assert r.status_code == 403


def test_patient_id_in_query_or_header_is_ignored(client):
    r = client.get(
        f"/api/me?patient_id={SAM}",
        headers={**auth(make_token()), "X-Patient-Id": SAM},
    )
    assert r.status_code == 200
    assert r.json()["patient_id"] == DANA


def test_issuer_is_read_from_publishable_key():
    import base64

    from app.config import issuer_from_publishable_key

    encoded = base64.b64encode(b"happy-cat-12.clerk.accounts.dev$").decode().rstrip("=")
    assert issuer_from_publishable_key(f"pk_test_{encoded}") == "https://happy-cat-12.clerk.accounts.dev"
