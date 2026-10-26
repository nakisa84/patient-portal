# Patient Portal: backend

FastAPI. Verifies the Clerk session token and derives `patient_id` from it (plan sections 5.3 and 6.1).

> Synthetic data only.

## What works so far

| Endpoint | Login needed | Returns |
|---|---|---|
| `GET /api/health` | No | `{"status": "ok"}` |
| `GET /api/me` | Yes | Your `patient_id` and your storage folder |

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

## 2. Run the tests

```bash
source .venv/bin/activate
python -m pytest -q
```

**Expected result:** all tests pass. They use a fake signing key, so they don't need Clerk or the internet.

## 3. Run the API

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
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

## Rules this code follows

- `patient_id` comes only from the verified token. A `patient_id` in the URL, body or headers is ignored.
- The token must be signed by your Clerk app, not expired, and issued for an allowed website (`azp`).
- Signed in but no valid `patient_id` returns 403.

## Structure

```
app/
  config.py   settings from .env
  auth.py     Clerk token check -> Patient(patient_id)
  main.py     endpoints
tests/
  test_auth.py  identity checks from plan section 6.4
```
