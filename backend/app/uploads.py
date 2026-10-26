"""Upload flow (plan section 6.3).

1. POST /api/uploads/initiate  -> server builds patients/{patient_id}/raw/{document_id}.{ext}
                                   and returns a 15-minute signed URL for that one object.
2. Browser PUTs the file straight to Cloud Storage with that URL.
3. POST /api/uploads/finalize  -> server checks the object exists, type and size are right.

The browser never chooses the storage path. patient_id always comes from the token.
"""

import uuid
from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from .auth import Patient, get_current_patient, get_settings
from .storage import GcsStorage, Storage

router = APIRouter(prefix="/api/uploads")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SIGNED_URL_LIFETIME = timedelta(minutes=15)
DOCUMENT_TYPE_HEADER = "x-goog-meta-document-type"

CONTENT_TYPES = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

# Placeholder list until the clinic confirms approved types (GitHub issue #5).
# Same values as the front end's document type picker.
APPROVED_DOCUMENT_TYPES = {"session_note_patient_copy", "homework_worksheet"}


class InitiateRequest(BaseModel):
    fileName: str
    sizeBytes: int
    documentType: str
    # Any other field (for example a patient_id) is ignored.


class InitiateResponse(BaseModel):
    documentId: str
    uploadUrl: str
    # The browser must send exactly these headers with the PUT, or GCS rejects it.
    uploadHeaders: dict[str, str]
    expiresInSeconds: int


class FinalizeRequest(BaseModel):
    documentId: str


class FinalizeResponse(BaseModel):
    documentId: str
    documentType: str
    sizeBytes: int
    status: str


@lru_cache
def _gcs() -> GcsStorage:
    settings = get_settings()
    if not settings.gcs_bucket:
        raise RuntimeError("Set GCS_BUCKET in backend/.env")
    return GcsStorage(settings.gcs_bucket, settings.gcp_project or None)


def get_storage() -> Storage:
    return _gcs()


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _not_found() -> HTTPException:
    # Same answer whether the document doesn't exist or belongs to someone else.
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def _extension(file_name: str) -> str:
    dot = file_name.rfind(".")
    return file_name[dot:].lower() if dot != -1 else ""


@router.post("/initiate", response_model=InitiateResponse)
def initiate_upload(
    req: InitiateRequest,
    patient: Patient = Depends(get_current_patient),
    storage: Storage = Depends(get_storage),
) -> InitiateResponse:
    ext = _extension(req.fileName)
    if ext not in CONTENT_TYPES:
        raise _bad_request("This file type is not supported.")
    if req.sizeBytes <= 0:
        raise _bad_request("This file is empty.")
    if req.sizeBytes > MAX_UPLOAD_BYTES:
        raise _bad_request("This file is larger than 10 MB.")
    if req.documentType not in APPROVED_DOCUMENT_TYPES:
        raise _bad_request("This kind of document cannot be summarized. Please check with your care team.")

    document_id = str(uuid.uuid4())
    path = f"{patient.storage_prefix}raw/{document_id}{ext}"
    content_type = CONTENT_TYPES[ext]
    headers = {DOCUMENT_TYPE_HEADER: req.documentType}

    url = storage.signed_put_url(path, content_type, headers, SIGNED_URL_LIFETIME)

    return InitiateResponse(
        documentId=document_id,
        uploadUrl=url,
        uploadHeaders={"Content-Type": content_type, **headers},
        expiresInSeconds=int(SIGNED_URL_LIFETIME.total_seconds()),
    )


@router.post("/finalize", response_model=FinalizeResponse)
def finalize_upload(
    req: FinalizeRequest,
    patient: Patient = Depends(get_current_patient),
    storage: Storage = Depends(get_storage),
) -> FinalizeResponse:
    # Only accept real UUIDs, so nothing like "../" can reach the storage path.
    try:
        document_id = str(uuid.UUID(req.documentId))
    except ValueError:
        raise _not_found()

    # Built from the token's patient_id, so another patient's document is simply not found.
    obj = storage.find_one(f"{patient.storage_prefix}raw/{document_id}.")
    if obj is None:
        raise _not_found()

    ext = _extension(obj.name)
    document_type = obj.metadata.get("document-type", "")
    problem = None
    if ext not in CONTENT_TYPES or obj.content_type != CONTENT_TYPES[ext]:
        problem = "The file type does not match."
    elif obj.size <= 0 or obj.size > MAX_UPLOAD_BYTES:
        problem = "The file is empty or larger than 10 MB."
    elif document_type not in APPROVED_DOCUMENT_TYPES:
        problem = "This kind of document cannot be summarized."

    if problem:
        storage.delete(obj.name)
        raise _bad_request(problem)

    # Next steps (later issues): create the Firestore record and queue processing.
    return FinalizeResponse(
        documentId=document_id,
        documentType=document_type,
        sizeBytes=obj.size,
        status="uploaded",
    )
