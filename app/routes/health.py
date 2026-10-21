import os
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.route("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "Login/Signup System",
            "environment": {
                "supabase_url_configured": bool(os.getenv("SUPABASE_URL")),
                "supabase_key_configured": bool(
                    os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
                ),
            },
        }
    )
