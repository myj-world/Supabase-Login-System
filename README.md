# FinAtlas Supabase Login

A small Flask-hosted Supabase Auth app with email/password sign-in, account creation, email confirmation, and TOTP multi-factor authentication.

## Configuration

Set the following environment variables:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: Supabase public anon key (or `SUPABASE_KEY`).
- `REQUIRE_AUTH`: Require a signed-in Supabase user; defaults to `true`.
- `REQUIRE_MFA`: Require TOTP MFA (AAL2); defaults to `true`.

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` when provided, falling back to `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Only use a public anon key in browser configuration; never expose a service-role key.

Enable email/password authentication and TOTP MFA in the Supabase project. New users receive a confirmation email, then set up TOTP on their first sign-in. Existing users with a verified factor are prompted for a code.

## Run

```powershell
python -m pip install -r requirements.txt
python -m gunicorn -c gunicorn.conf.py wsgi:application
```

Run tests with `python -m pytest`.

## Endpoints

- `GET /`: sign-in and MFA experience.
- `GET /api/auth/me`: current user and MFA assurance status.
- `GET /api/config`: public auth configuration.
- `GET /api/health`: service health.

MIT License.
