# Patient Portal: front end

React, Vite, TypeScript and Tailwind. Covers the four patient screens from the plan (section 5.1): Login, Dashboard, Session detail and Upload.

> Synthetic data only. The API is mocked in `src/api/mockApi.ts` until the FastAPI backend exists.

## 1. Install Node.js (one time)

You need Node.js **20.19 or newer** (or 22.12 or newer). `npm` comes with it.

On macOS, either:

- download the **LTS** installer from [nodejs.org](https://nodejs.org) and run the `.pkg`, or
- run `brew install node` if you use Homebrew.

Then **quit and reopen Terminal** and check:

```bash
node -v
npm -v
```

Both should print a version number. If you get `zsh: command not found: npm`, Node isn't installed yet or Terminal wasn't reopened.

## 2. Get the code (one time)

```bash
git clone https://github.com/nakisa84/patient-portal.git
cd patient-portal
git checkout feature/frontend-ui
cd frontend
npm install
```

`npm install` installs everything in `package.json`, including `@clerk/react`. There is no need to install Clerk separately.

## 3. Run it

From the `frontend` folder:

```bash
npm run dev
```

Open <http://localhost:5173>. Stop the app with `Ctrl + C`.

## Two login modes

The app picks the mode when it starts, based on `frontend/.env.local`.

| Mode | When | How to sign in |
|---|---|---|
| Demo | No `.env.local`, or the key is empty | `dana@example.com`, any password |
| Clerk | `VITE_CLERK_PUBLISHABLE_KEY` is set in `.env.local` | Clerk's sign-in box |

After changing `.env.local`, restart `npm run dev`. Vite only reads it at startup.

## 4. Turn on Clerk

Menu names in the Clerk dashboard may differ slightly from these.

### 4a. Add the publishable key

1. In the Clerk dashboard, open your application and copy the **Publishable key** (starts with `pk_test_`).
2. From the `frontend` folder, create `.env.local`:
   ```bash
   echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here" > .env.local
   ```
3. Check the file:
   ```bash
   cat .env.local
   ```
   You should see one line, with no spaces around `=`.
4. Restart `npm run dev`.

**Expected result:** the login page shows Clerk's sign-in box with "Development mode" at the bottom. If you still see the demo form, `.env.local` is in the wrong folder or the app wasn't restarted.

Notes:

- `.env.local` is git-ignored, so the key stays on your computer.
- The publishable key is meant to be visible in the browser. The **secret key** (`sk_test_`) is different: never commit it or paste it anywhere public.
- `echo $VITE_CLERK_PUBLISHABLE_KEY` prints nothing, because the key is in a file, not in your Terminal. Use `cat .env.local` to see it.

### 4b. Create Dana's test user

1. In the Clerk dashboard, go to **Users** and click **Create user**.
2. Email: `dana+clerk_test@example.com`
   - In development mode, `+clerk_test` addresses don't receive real emails. The verification code is always **424242**.
3. If there is a **First name** field, enter `Dana`.
4. If a password is required, choose one and note it.
5. Click **Create**.

Then sign in at <http://localhost:5173> with that email (code `424242`, or the password).

**Expected result:** "Your account isn't set up yet". This is correct: Dana has a Clerk account but isn't linked to a patient record yet. It's also the "missing patient mapping" isolation check from the plan (section 6.4).

### 4c. Link Dana to her patient record (next step)

1. On Dana's user page in Clerk, set **public metadata** to:
   ```json
   { "patient_id": "6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42" }
   ```
2. Customize the **session token** so the API receives the mapping as a claim:
   ```json
   { "patient_id": "{{user.public_metadata.patient_id}}" }
   ```
3. Sign out and sign in again so Dana gets a fresh token.

**Expected result:** Dana's dashboard with her synthetic sessions.

### 4d. Restrict sign-up (later)

Turn off open sign-up (restricted mode) so only the clinic can create patient accounts (plan section 6.1).

## Troubleshooting

| Problem | Fix |
|---|---|
| `zsh: command not found: npm` | Install Node.js (step 1), then reopen Terminal |
| Demo form shows instead of Clerk | Check `cat .env.local` from the `frontend` folder, then restart `npm run dev` |
| "Your account isn't set up yet" | Expected until step 4c is done |
| Page doesn't load | Make sure `npm run dev` is still running in Terminal |

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
