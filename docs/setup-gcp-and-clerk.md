# Setup log: Google Cloud and Clerk

Everything below was done by hand, outside the code. It is written down here so it can be repeated.

> Synthetic data only. Nothing here is set up for real patient data.

## Status

| Step | What | Status |
|---|---|---|
| 1 | gcloud CLI, project, billing, Cloud Storage API | Done |
| 2 | Bucket `patient-portal-nakisa-data` | Done |
| 3 | Service account `portal-api` with bucket access | Done |
| 3d | Local impersonation of `portal-api` | Done |
| 4 | Backend verifies Clerk token and derives `patient_id` | Done, tested with Dana and Sam |
| 5 | Upload endpoints (signed URL into the patient folder) | Next |
| 6 | Front end Upload page uses the real backend | To do |
| 7 | Isolation tests with real files | To do |

## Names used

| Thing | Value |
|---|---|
| GCP project ID | `patient-portal-nakisa` |
| Region | `us-central1` (inside the Cloud Storage free tier) |
| Bucket | `gs://patient-portal-nakisa-data` |
| Service account | `portal-api@patient-portal-nakisa.iam.gserviceaccount.com` |
| Storage layout | `patients/{patient_id}/raw/...` and `patients/{patient_id}/summaries/...` |

## 1. Google Cloud CLI and project

Install the gcloud CLI for macOS: <https://cloud.google.com/sdk/docs/install>

- Run `uname -m` first. `arm64` means the Apple silicon (ARM) download, `x86_64` means Intel.
- Extract it into your home folder and run `./google-cloud-sdk/install.sh`.

If `gcloud` is "command not found" afterwards, add these lines to the end of `~/.zshrc`, then run `source ~/.zshrc`:

```bash
source "$HOME/google-cloud-sdk/path.zsh.inc"
source "$HOME/google-cloud-sdk/completion.zsh.inc"
```

Then:

```bash
gcloud --version
gcloud auth login
gcloud projects create patient-portal-nakisa --name="Patient Portal"
gcloud config set project patient-portal-nakisa
gcloud config get-value project          # should print patient-portal-nakisa

gcloud billing accounts list             # pick the one with OPEN = True
gcloud billing projects link patient-portal-nakisa --billing-account=<BILLING_ACCOUNT_ID>
gcloud services enable storage.googleapis.com
```

**Expected result:** the billing link prints `billingEnabled: true`.

## 2. Bucket

```bash
gcloud storage buckets create gs://patient-portal-nakisa-data \
  --location=us-central1 \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --public-access-prevention

gcloud storage buckets describe gs://patient-portal-nakisa-data
```

**Expected result:** `location: US-CENTRAL1`, `public_access_prevention: enforced`, `uniform_bucket_level_access: true`.

| Setting | Why |
|---|---|
| `us-central1`, `STANDARD` | Free tier (5 GB per month at the time of setup) |
| Uniform bucket-level access | Access is set for the whole bucket, never per file |
| Public access prevention | No file can ever be made public |

Soft delete is on by default (7 days). Deleted files can be recovered for a week.

## 3. Service account for the backend

`portal-api` is the only identity that can read and write the bucket. Patients never get Google Cloud access.

```bash
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com

gcloud iam service-accounts create portal-api \
  --display-name="Patient Portal API"

gcloud storage buckets add-iam-policy-binding gs://patient-portal-nakisa-data \
  --member="serviceAccount:portal-api@patient-portal-nakisa.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

| Rule | Meaning |
|---|---|
| `portal-api` has `storage.objectAdmin` on the bucket | It can create, read and delete files in this bucket only. It cannot change bucket settings. |

## 3d. Run as `portal-api` on your Mac (impersonation)

No service account key file is created. Your Google account gets short-lived passes for `portal-api` instead.

```bash
gcloud iam service-accounts add-iam-policy-binding \
  portal-api@patient-portal-nakisa.iam.gserviceaccount.com \
  --member="user:$(gcloud config get-value account)" \
  --role="roles/iam.serviceAccountTokenCreator"

gcloud auth application-default login \
  --impersonate-service-account=portal-api@patient-portal-nakisa.iam.gserviceaccount.com
```

If the second command gives a permission error, wait 1 to 2 minutes. New IAM rules take a moment to apply.

On Cloud Run this step is not needed. The service runs as `portal-api` directly.

## 4. Clerk: link each patient to a `patient_id`

Done once for the whole app:

- **Sessions, Customize session token:**
  ```json
  { "patient_id": "{{user.public_metadata.patient_id}}" }
  ```

Done once per patient (Users, pick the user, Metadata, Public):

| Test user | Public metadata |
|---|---|
| `dana+clerk_test@example.com` | `{ "patient_id": "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42" }` |
| `sam+clerk_test@example.com` | `{ "patient_id": "b83e0d17-92c4-4f6a-8a3e-5c1f7d2e9b60" }` |

Notes:

- Use **public** metadata. Patients can read it but cannot change it. Never use unsafe metadata for `patient_id`.
- `+clerk_test` emails get verification code `424242` in development mode.
- Clerk rejects passwords found in known data breaches. Use a unique password.
- After changing metadata or the token template, sign out and in again to get a fresh token.
- Later, enrollment should be automated: a server-side script creates the Clerk user and sets a new random UUID (issue #7).

## 5. Check it end to end

Run the API (`backend/README.md`) and the front end, sign in, then in the browser console:

```js
const t = await window.Clerk.session.getToken();
const r = await fetch("http://localhost:8000/api/me", { headers: { Authorization: `Bearer ${t}` } });
console.log(r.status, await r.json());
```

| Signed in as | Expected |
|---|---|
| Dana | `200`, `patient_id: 6f1c2a9e-...`, `storage_prefix: patients/6f1c2a9e-.../` |
| Sam | `200`, `patient_id: b83e0d17-...`, `storage_prefix: patients/b83e0d17-.../` |

To see what is inside the token:

```js
const c = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
console.log("patient_id:", c.patient_id, "| fields:", Object.keys(c).join(", "));
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `zsh: command not found: gcloud` | PATH not set | Add the `.zshrc` lines in step 1, then `source ~/.zshrc` |
| uvicorn traceback from `/opt/homebrew/...` | Global uvicorn used instead of the project's | `source .venv/bin/activate`, then `python -m uvicorn ...` |
| `Cannot read properties of null (reading 'getToken')` | Not signed in in that tab | Sign in, then run the check again |
| `/api/me` returns `403` | Token has no `patient_id` | Set public metadata and the session token template (step 4) |
| `/api/me` returns `401` | Token rejected | Check `CLERK_PUBLISHABLE_KEY` in `backend/.env` |
| `Failed to fetch` | API not running, or CORS | Start the API, check `AUTHORIZED_PARTIES` |
| Dashboard shows sessions but bucket is empty | Dashboard still uses the in-browser mock API | Expected until step 6 |
