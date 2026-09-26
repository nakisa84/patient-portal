# Patient Portal: front end

React, Vite, TypeScript and Tailwind. Covers the four patient screens from the plan (section 5.1): Login, Dashboard, Session detail and Upload.

> Synthetic data only. The API is mocked in `src/api/mockApi.ts` until the FastAPI backend exists.

## Run it

```bash
cd frontend
npm install
npm run dev
```

## Two login modes

| Mode | When | How to sign in |
|---|---|---|
| Demo | `VITE_CLERK_PUBLISHABLE_KEY` is empty | `dana@example.com`, any password |
| Clerk | `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env.local` | Clerk's sign-in form |

## Clerk setup

Menu names in the Clerk dashboard may differ slightly from these.

1. Create an application in the Clerk dashboard and copy its **Publishable key**.
2. Copy `.env.example` to `.env.local` and paste the key into `VITE_CLERK_PUBLISHABLE_KEY`.
3. Turn off open sign-up (restricted sign-up mode) so only the clinic can create patient accounts (plan section 6.1).
4. Create a user for Dana and set its **public metadata** to:
   ```json
   { "patient_id": "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42" }
   ```
5. Customize the **session token** so the API receives the mapping as a claim:
   ```json
   { "patient_id": "{{user.public_metadata.patient_id}}" }
   ```

A signed-in user without a `patient_id` claim sees "Your account isn't set up yet". This matches the "missing patient mapping" isolation test in the plan (section 6.4).

## Security notes

- The front end never sends a patient ID. The API derives it from the token (plan section 5.3).
- The mock API reads the Clerk token **without verifying it**. The real backend must verify the signature against Clerk's JWKS on every request.
- Another patient's session returns "not found", never "forbidden".

## Structure

```
src/
  api/          PortalApi interface + in-memory mock
  auth/         Clerk and demo auth providers behind one useAuth() hook
  components/   Layout, status badge, AI notice, messages, data hook
  data/         Synthetic patients and sessions
  pages/        Login, Dashboard, SessionDetail, Upload
```

## Demo-only pieces to remove later

- "Approve pending summaries" on the dashboard stands in for the clinician review queue (issues #24, #25).
- The document type list is a placeholder until issue #5 is decided.
