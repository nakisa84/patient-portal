"""Thin wrapper around Cloud Storage, so tests can swap in a fake.

Patients never get bucket access. Only the backend (running as portal-api) talks to GCS.
"""

from dataclasses import dataclass
from datetime import timedelta
from typing import Protocol


@dataclass(frozen=True)
class StoredObject:
    name: str
    size: int
    content_type: str | None
    metadata: dict[str, str]


class Storage(Protocol):
    def signed_put_url(
        self, path: str, content_type: str, headers: dict[str, str], expires: timedelta
    ) -> str: ...

    def find_one(self, prefix: str) -> StoredObject | None: ...

    def delete(self, path: str) -> None: ...


class GcsStorage:
    def __init__(self, bucket_name: str, project: str | None = None):
        import google.auth
        from google.cloud import storage

        # On your Mac: the impersonated portal-api login from
        # `gcloud auth application-default login --impersonate-service-account=...`.
        # On Cloud Run: the service's own identity (portal-api).
        self._credentials, default_project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        self._client = storage.Client(credentials=self._credentials, project=project or default_project)
        self._bucket = self._client.bucket(bucket_name)

    def _signing_kwargs(self) -> dict:
        from google.auth import credentials as ga_credentials
        from google.auth.transport.requests import Request

        if isinstance(self._credentials, ga_credentials.Signing):
            return {}
        # Cloud Run credentials can't sign locally, so ask IAM to sign with an access token.
        self._credentials.refresh(Request())
        return {
            "service_account_email": self._credentials.service_account_email,
            "access_token": self._credentials.token,
        }

    def signed_put_url(
        self, path: str, content_type: str, headers: dict[str, str], expires: timedelta
    ) -> str:
        return self._bucket.blob(path).generate_signed_url(
            version="v4",
            method="PUT",
            expiration=expires,
            content_type=content_type,
            headers=headers,
            **self._signing_kwargs(),
        )

    def find_one(self, prefix: str) -> StoredObject | None:
        for blob in self._client.list_blobs(self._bucket, prefix=prefix, max_results=2):
            return StoredObject(
                name=blob.name,
                size=blob.size or 0,
                content_type=blob.content_type,
                metadata=dict(blob.metadata or {}),
            )
        return None

    def delete(self, path: str) -> None:
        self._bucket.blob(path).delete()
