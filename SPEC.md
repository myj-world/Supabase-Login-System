# Login/Signup System Specification

## Purpose

Provide a small web application for Supabase account registration and authentication, including email confirmation and time-based one-time password (TOTP) multi-factor authentication.

## User flows

### Sign up

1. User submits an email address and password.
2. The app asks Supabase Auth to create the account and send an email confirmation.
3. After confirmation, the app exchanges the returned authorization code for a session.
4. If the user has no verified TOTP factor, the app displays enrollment QR code setup and requests a six-digit code.
5. Once verified, the user sees the authenticated account screen.

### Sign in

1. User submits an email address and password.
2. The app authenticates through Supabase Auth.
3. If a verified TOTP factor exists and MFA is required, the app requests a six-digit code.
4. Successful MFA verification displays the authenticated account screen.

### Sign out

The app signs the user out through Supabase Auth, clears the visible account state, and returns to the sign-in screen.

## Security and configuration

- The browser uses only the Supabase public anon key.
- The service-role key must never be sent to the browser.
- `REQUIRE_AUTH` controls the authentication requirement and defaults to `true`.
- `REQUIRE_MFA` controls the TOTP/AAL2 requirement and defaults to `true`.
- MFA enforcement on the status endpoint verifies the access token's `aal` claim after validating the user with Supabase Auth.

## HTTP endpoints

- `GET /`: serves the sign-in, sign-up, and MFA UI.
- `GET /api/auth/me`: returns authentication and MFA status for the bearer access token.
- `GET /api/config`: returns public auth configuration.
- `GET /api/health`: returns service health and whether Supabase configuration is present.

## Runtime and tests

The app is a Flask service served by Gunicorn. Run the test suite with `python -m pytest`.
