# Login/Signup System

A Flask-hosted Supabase authentication app with email/password sign-in, account creation, email confirmation, and TOTP multi-factor authentication (MFA).

## Configuration

Set these environment variables:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: Supabase public anon key. `SUPABASE_KEY` is also accepted by the backend.
- `REQUIRE_AUTH`: Require a signed-in user; defaults to `true`.
- `REQUIRE_MFA`: Require TOTP MFA (AAL2); defaults to `true`.

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when set; otherwise it uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Configure only a public anon key for browser use. Never expose a Supabase service-role key.

Enable email/password authentication and TOTP MFA in the Supabase project. New users receive a confirmation email and set up TOTP on their first sign-in. Users who already have a verified TOTP factor are prompted to verify a code after signing in.

## Run locally

```powershell
python -m pip install -r requirements.txt
python -m flask --app wsgi:application run --host 0.0.0.0 --port 8000
```

The Flask development server listens on port `8000`. It is intended for local
development, not production. Gunicorn is supported on Unix-like systems, but
not on Windows; use it for deployments on a supported platform. Run tests with:

```powershell
python -m pytest
```

## HTTP endpoints

- `GET /`: authentication UI.
- `GET /api/auth/me`: current Supabase user and MFA assurance status.
- `GET /api/config`: public authentication configuration.
- `GET /api/health`: service and Supabase configuration status.
