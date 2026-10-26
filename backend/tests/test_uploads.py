"""Upload flow (plan 6.3) and the storage-related isolation checks (plan 6.4).

Uses an in-memory fake instead of Cloud Storage, so no Google login is needed.
"""

import uuid
from urllib.parse import parse_qs, urlparse

import pytest

from app.main import app
from app.storage import StoredObject
from app.uploads import get_storage

from .conftest import DANA, SAM, make_token

NOTE = {"fileName": "week-12.txt", "sizeBytes": 1200, "documentType": "session_note_patient_copy"}


class FakeStorage:
    def __init__(self):
        self.objects: dict[str, StoredObject] = {}
        self.signed: list[dict] = []
        self.deleted: list[str] = []

    def signed_put_url(self, path, content_type, headers, expires):
        self.signed.append({"path": path, "content_type": content_type, "headers": headers, "expires": expires})
        return f"https://storage.example/{path}?X-Goog-Expires={int(expires.total_seconds())}"

    def find_one(self, prefix):
        return next((o for name, o in self.objects.items() if name.startswith(prefix)), None)

    def delete(self, path):
        self.deleted.append(path)
        self.objects.pop(path, None)

    # Test helper: pretend the browser uploaded a file to the signed path.
    def put(self, path, size=1200, content_type="text/plain", document_type="session_note_patient_copy"):
        meta = {"document-type": document_type} if document_type else {}
        self.objects[path] = StoredObject(name=path, size=size, content_type=content_type, metadata=meta)


@pytest.fixture
def storage():
    fake = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_storage, None)


def as_patient(patient_id):
    return {"Authorization": f"Bearer {make_token(patient_id=patient_id)}"}


def initiate(client, patient_id=DANA, **overrides):
    return client.post("/api/uploads/initiate", json={**NOTE, **overrides}, headers=as_patient(patient_id))


def upload(client, storage, patient_id=DANA, **put_kwargs):
    """initiate + simulated browser upload. Returns the document id."""
    r = initiate(client, patient_id)
    assert r.status_code == 200, r.text
    storage.put(storage.signed[-1]["path"], **put_kwargs)
    return r.json()["documentId"]


# ---------- initiate ----------

def test_initiate_builds_path_from_token(client, storage):
    r = initiate(client)
    assert r.status_code == 200
    body = r.json()
    doc_id = body["documentId"]
    uuid.UUID(doc_id)  # server-generated UUID
    assert storage.signed[-1]["path"] == f"patients/{DANA}/raw/{doc_id}.txt"
    assert body["uploadHeaders"] == {
        "Content-Type": "text/plain",
        "x-goog-meta-document-type": "session_note_patient_copy",
    }


def test_signed_url_is_short_lived(client, storage):
    r = initiate(client)
    assert r.json()["expiresInSeconds"] == 15 * 60
    assert parse_qs(urlparse(r.json()["uploadUrl"]).query)["X-Goog-Expires"] == ["900"]


def test_patient_id_in_body_is_ignored(client, storage):
    r = client.post(
        "/api/uploads/initiate",
        json={**NOTE, "patient_id": SAM, "patientId": SAM},
        headers=as_patient(DANA),
    )
    assert r.status_code == 200
    assert storage.signed[-1]["path"].startswith(f"patients/{DANA}/")


def test_path_tricks_in_file_name_do_not_change_the_path(client, storage):
    r = initiate(client, fileName=f"../../{SAM}/raw/evil.txt")
    assert r.status_code == 200
    path = storage.signed[-1]["path"]
    assert path == f"patients/{DANA}/raw/{r.json()['documentId']}.txt"


@pytest.mark.parametrize("file_name", ["notes.exe", "notes", "notes.txt.zip", "photo.png"])
def test_unsupported_file_types_are_rejected(client, storage, file_name):
    assert initiate(client, fileName=file_name).status_code == 400
    assert storage.signed == []


@pytest.mark.parametrize("file_name", ["a.txt", "b.MD", "c.pdf", "d.docx"])
def test_supported_file_types_are_accepted(client, storage, file_name):
    assert initiate(client, fileName=file_name).status_code == 200


def test_too_large_is_rejected(client, storage):
    assert initiate(client, sizeBytes=10 * 1024 * 1024 + 1).status_code == 400


def test_empty_is_rejected(client, storage):
    assert initiate(client, sizeBytes=0).status_code == 400


def test_unapproved_document_type_is_rejected(client, storage):
    assert initiate(client, documentType="other").status_code == 400
    assert initiate(client, documentType="psychotherapy_notes").status_code == 400


def test_initiate_needs_login(client, storage):
    assert client.post("/api/uploads/initiate", json=NOTE).status_code == 401


# ---------- finalize ----------

def test_finalize_after_upload(client, storage):
    doc_id = upload(client, storage)
    r = client.post("/api/uploads/finalize", json={"documentId": doc_id}, headers=as_patient(DANA))
    assert r.status_code == 200
    assert r.json() == {
        "documentId": doc_id,
        "documentType": "session_note_patient_copy",
        "sizeBytes": 1200,
        "status": "uploaded",
    }


def test_finalize_before_upload_is_not_found(client, storage):
    doc_id = initiate(client).json()["documentId"]
    r = client.post("/api/uploads/finalize", json={"documentId": doc_id}, headers=as_patient(DANA))
    assert r.status_code == 404


def test_patient_cannot_finalize_another_patients_document(client, storage):
    sams_doc = upload(client, storage, patient_id=SAM)
    r = client.post("/api/uploads/finalize", json={"documentId": sams_doc}, headers=as_patient(DANA))
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}
    assert storage.deleted == []  # Sam's file is untouched


@pytest.mark.parametrize("bad_id", ["../x", f"../../{SAM}/raw/x", "not-a-uuid", ""])
def test_path_traversal_in_document_id_is_not_found(client, storage, bad_id):
    r = client.post("/api/uploads/finalize", json={"documentId": bad_id}, headers=as_patient(DANA))
    assert r.status_code == 404


def test_wrong_content_type_is_rejected_and_deleted(client, storage):
    doc_id = upload(client, storage, content_type="application/x-msdownload")
    r = client.post("/api/uploads/finalize", json={"documentId": doc_id}, headers=as_patient(DANA))
    assert r.status_code == 400
    assert storage.deleted == [f"patients/{DANA}/raw/{doc_id}.txt"]


def test_oversized_upload_is_rejected_and_deleted(client, storage):
    doc_id = upload(client, storage, size=11 * 1024 * 1024)
    r = client.post("/api/uploads/finalize", json={"documentId": doc_id}, headers=as_patient(DANA))
    assert r.status_code == 400
    assert len(storage.deleted) == 1


def test_missing_document_type_metadata_is_rejected(client, storage):
    doc_id = upload(client, storage, document_type=None)
    r = client.post("/api/uploads/finalize", json={"documentId": doc_id}, headers=as_patient(DANA))
    assert r.status_code == 400
