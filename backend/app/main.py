from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import Patient, get_current_patient, get_settings

app = FastAPI(title="Patient Portal API (prototype, synthetic data only)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().authorized_parties,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/me")
def me(patient: Patient = Depends(get_current_patient)) -> dict:
    """Shows who the server thinks you are. Useful to check the Clerk -> patient_id link."""
    return {
        "patient_id": patient.patient_id,
        "storage_prefix": patient.storage_prefix,
    }
