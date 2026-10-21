import os

from flask import Blueprint, jsonify, render_template

from app.services.auth import auth_required, mfa_required

bp = Blueprint("home", __name__)


@bp.route("/")
def index():
    return render_template(
        "index.html",
        supabase_url=os.getenv("VITE_SUPABASE_URL")
        or os.getenv("SUPABASE_URL")
        or "",
        supabase_key=os.getenv("VITE_SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_KEY")
        or "",
        require_auth=auth_required(),
        require_mfa=mfa_required(),
    )


@bp.route("/api/config")
def public_config():
    return jsonify(
        {
            "require_auth": auth_required(),
            "require_mfa": mfa_required(),
            "supabase_url": os.getenv("VITE_SUPABASE_URL")
            or os.getenv("SUPABASE_URL")
            or "",
        }
    )
