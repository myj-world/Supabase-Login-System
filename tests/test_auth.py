from app.services import auth


class TestAuthPages:
    def test_homepage_contains_only_auth_flows(self, client):
        response = client.get("/")

        assert response.status_code == 200
        assert b'id="signin-form"' in response.data
        assert b'id="signup-form"' in response.data
        assert b'id="mfa-form"' in response.data
        assert b'id="mfa-challenge-form"' in response.data
        assert b'id="sign-out-btn"' in response.data
        assert b"screening" not in response.data.lower()
        assert b"dashboard" not in response.data.lower()


class TestAuthEndpoint:
    def test_me_requires_authentication_when_enabled(self, client, monkeypatch):
        monkeypatch.setattr(auth, "auth_required", lambda: True)

        response = client.get("/api/auth/me")

        assert response.status_code == 401
        assert response.get_json()["error"] == "Authorization required"

    def test_me_reports_user_and_mfa_assurance(self, client, monkeypatch):
        monkeypatch.setattr(
            auth,
            "get_auth_context",
            lambda _token: {
                "error": None,
                "user": {"id": "user-1", "email": "user@example.com"},
                "mfa_ok": True,
            },
        )
        monkeypatch.setattr(auth, "check_mfa_level", lambda _token: (True, "aal2"))
        monkeypatch.setattr(auth, "mfa_required", lambda: True)

        response = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer test-access-token"}
        )

        assert response.status_code == 200
        assert response.get_json() == {
            "authenticated": True,
            "user": {"id": "user-1", "email": "user@example.com"},
            "mfa": {"required": True, "verified": True, "aal": "aal2"},
        }


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        response = client.get("/api/health")

        assert response.status_code == 200
        assert response.get_json()["status"] == "ok"
