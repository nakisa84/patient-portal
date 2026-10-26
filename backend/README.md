# Patient Portal: backend

FastAPI. Verifies the Clerk session token, derives `patient_id` from it (plan sections 5.3 and 6.1), and handles uploads into the patient's own Cloud Storage folder (plan section 6.3).

> Synthetic data only.

## What works so far

| Endpoint | Login needed | Returns |
|---|---|---|
| `GET /api/health` | No | `{"status": "ok"}` |
| `GET /api/me` | Yes | Your `patient_id` and your storage folder |
| `POST /api/uploads/initiate` | Yes | A 15-minute signed URL for one file in `patients/{patient_id}/raw/` |
| `POST /api/uploads/finalize` | Yes | Checks the uploaded file (type, size, document type) |

## 1. Set up (one time)

You need Python 3.11 or newer. From the repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` from the example:

```bash
cp .env.example .env
```

Show the Clerk key the front end already uses, and copy the `pk_test_...` part:

```bash
cat ../frontend/.env.local
```

Open `.env` and paste it right after `CLERK_PUBLISHABLE_KEY=` (no spaces), then save:

```bash
open -e .env
```

Check it:

```bash
grep CLERK .env
```

**Expected result:** one line, `CLERK_PUBLISHABLE_KEY=pk_test_...`

Also check the Cloud Storage lines are there (add any that are missing):

```bash
grep -E "GCS_BUCKET|GCP_PROJECT" .env
```

**Expected result:**

```
GCS_BUCKET=patient-portal-nakisa-data
GCP_PROJECT=patient-portal-nakisa
```

The backend uses the `portal-api` login set up in `docs/setup-gcp-and-clerk.md` (step 3d) to talk to Cloud Storage.

## 2. Run the tests

```bash
source .venv/bin/activate
python -m pytest -q
```

**Expected result:** all tests pass. They use a fake signing key and fake storage, so they don't need Clerk, Google Cloud or the internet.

A `FutureWarning` about Python 3.11 from `google.api_core` is harmless. Python 3.11 is supported until October 2027.

## 3. Run the API

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/api/health>. **Expected result:** `{"status":"ok"}`

Stop it with `Ctrl + C`.

## 4. Check the Clerk link with Dana

1. Keep the API running. In a second Terminal tab, start the front end (`cd frontend && npm run dev`).
2. Open <http://localhost:5173> and sign in as Dana with Clerk on.
3. Open the browser console: **View, Developer, JavaScript Console** in Chrome.
4. Paste this and press Enter:

   ```js
   const t = await window.Clerk.session.getToken();
   const r = await fetch("http://localhost:8000/api/me", { headers: { Authorization: `Bearer ${t}` } });
   console.log(r.status, await r.json());
   ```

   If Chrome blocks pasting, type `allow pasting`, press Enter, then paste again.

**Expected result:**

```
200 {patient_id: '6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42', storage_prefix: 'patients/6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42/'}
```

| Result | Meaning |
|---|---|
| `200` with Dana's id | The Clerk to `patient_id` link works |
| `403` | Signed in, but the session token has no `patient_id` claim (front-end README step 4c) |
| `401` | Token rejected. Check `CLERK_PUBLISHABLE_KEY` in `backend/.env` |
| `TypeError: Failed to fetch` | The API isn't running, or CORS: check `AUTHORIZED_PARTIES` |

Clerk session tokens only last about 60 seconds, so always get a fresh one with `getToken()` right before the request.

## 5. Upload a test file as Dana

One time: let the browser upload straight to the bucket (CORS). From the repo root:

```bash
gcloud storage buckets update gs://patient-portal-nakisa-data --cors-file=infra/gcs-cors.json
```

Then, signed in as Dana at <http://localhost:5173>, paste this in the browser console:

```js
const note = new Blob(["Synthetic note. Practiced a grounding technique before presentations."], { type: "text/plain" });
const api = async (path, body) => {
  const t = await window.Clerk.session.getToken();
  const r = await fetch("http://localhost:8000" + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return [r.status, await r.json()];
};

const [s1, init] = await api("/api/uploads/initiate", { fileName: "test-note.txt", sizeBytes: note.size, documentType: "session_note_patient_copy" });
console.log("1. initiate", s1, init.documentId);

const put = await fetch(init.uploadUrl, { method: "PUT", headers: init.uploadHeaders, body: note });
console.log("2. upload to bucket", put.status);

console.log("3. finalize", ...(await api("/api/uploads/finalize", { documentId: init.documentId })));
```

**Expected result:**

```
1. initiate 200 <document id>
2. upload to bucket 200
3. finalize 200 {documentId: '...', documentType: 'session_note_patient_copy', sizeBytes: 69, status: 'uploaded'}
```

Check the file in the bucket:

```bash
gcloud storage ls -r gs://patient-portal-nakisa-data/patients/
```

| Problem | Likely cause |
|---|---|
| Step 1 returns `500` | The backend can't sign. Re-run step 3d of the setup log, then restart the API |
| Step 2 `Failed to fetch` | Bucket CORS not set. Run the `gcloud storage buckets update` command above |
| Step 2 returns `403` | Headers don't match the signed URL, or the URL expired (15 minutes) |
| Step 3 returns `404` | The file didn't reach the bucket (check step 2) |

## Rules this code follows

- `patient_id` comes only from the verified token. A `patient_id` in the URL, body or headers is ignored.
- The token must be signed by your Clerk app, not expired, and issued for an allowed website (`azp`).
- Signed in but no valid `patient_id` returns 403.
- The server builds every storage path: `patients/{patient_id}/raw/{document_id}.{ext}`. The file name from the browser is only used for its extension.
- `document_id` is a server-generated UUID. Anything else is "not found", so `../` tricks go nowhere.
- Another patient's document returns 404 "Not found", never 403, so it doesn't confirm the file exists.
- Signed upload URLs last 15 minutes and work for one object only, with the content type and document type fixed.
- Only `.txt`, `.md`, `.pdf`, `.docx`, up to 10 MB, and approved document types. Files that fail the finalize checks are deleted.

## Structure

```
app/
  config.py   settings from .env
  auth.py     Clerk token check -> Patient(patient_id)
  storage.py  Cloud Storage wrapper (signed URLs, find, delete)
  uploads.py  /api/uploads/initiate and /finalize
  main.py     app setup
tests/
  test_auth.py     identity checks from plan section 6.4
  test_uploads.py  upload flow and storage isolation checks
```
