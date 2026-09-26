# Patient Portal (Prototype)

A secure web portal where therapy patients read plain-language summaries of their sessions. Each summary can link the current session to themes from earlier sessions.

> **Synthetic data only.** This is a demo prototype. It is not production-ready and must not be used with real patient data until a separate compliance and security review is complete.

## Key features

- Secure patient login with strict per-patient data isolation
- Upload of clinic-approved document types only
- Plain-language summaries (150 to 250 words, grade 6 to 8 reading level)
- Links to recurring concepts from prior sessions, with provenance
- Clinician review before any summary is released
- Audit records for access and release actions

## Architecture (GCP)

| Layer | Choice |
|---|---|
| Front end | React, Vite, TypeScript, Tailwind |
| API | FastAPI on Cloud Run |
| Auth | Firebase Authentication or Identity Platform |
| File storage | Cloud Storage |
| Metadata and audit | Firestore |
| Model | Vertex AI, behind a `SummarizerBackend` interface |
| Processing | Cloud Run Jobs or Pub/Sub-triggered worker |

## Design rules

- **Document eligibility:** every upload has a document type. Only approved types are summarized.
- **Human review:** summaries start as `pending_review`. A clinician must release them.
- **Patient isolation:** `patient_id` is derived from the verified token on the server. Client-supplied IDs are never trusted.

## Delivery plan

Work is tracked as GitHub issues grouped into milestones.

| Phase | Deliverable |
|---|---|
| 0. Foundation | GCP project, repo, Firestore, bucket, service accounts, CI, synthetic notes |
| 1. Auth + isolation | Authentication, patient mapping, authorization dependency, isolation tests |
| 2. Upload + storage | Signed upload flow, validation, metadata records, upload UI |
| 3. Base summarization | Extract, validate type, summarize, store pending output |
| 4. Historical context | Prior-summary context, recurring concepts, session links, provenance |
| 5. Safety + review gate | Automated flags, review queue, approve/edit/reject, audit records |
| 6. Patient experience | Dashboard, session detail, status states, flag mechanism, polish |

## MVP acceptance criteria

- All isolation tests pass
- No patient-facing endpoint returns another patient's data
- Only approved document types enter the summarization path
- Generated summaries remain pending until reviewed
- Historical links point to the correct patient and prior session
- Failed processing jobs show a visible status
- The full Dana demo flow runs without manual database edits

## Docs

- [Project plan v1.2](docs/project-plan-v1.2.pdf)
