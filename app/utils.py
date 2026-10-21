from typing import Optional


def extract_bearer_token(headers) -> Optional[str]:
    """Return the Bearer token from an authorization header, if present."""
    auth = headers.get("Authorization") or headers.get("authorization")
    if not auth:
        return None
    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None
