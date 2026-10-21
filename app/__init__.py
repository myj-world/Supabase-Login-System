from typing import Optional

from flask import Flask
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv

from app.routes.auth import bp as auth_bp
from app.routes.health import bp as health_bp
from app.routes.home import bp as home_bp


def _build_app() -> Flask:
    load_dotenv()
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.register_blueprint(home_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    @app.errorhandler(Exception)
    def handle_generic_error(error):
        if isinstance(error, HTTPException):
            return {"error": error.description}, error.code
        app.logger.exception("Unhandled error")
        return {"error": "Internal server error"}, 500

    return app


_app_instance: Optional[Flask] = None


def create_app(*args):
    """Flask application factory.

    When called without arguments this returns the Flask application object.
    When Gunicorn invokes ``app:create_app`` as the WSGI target, two arguments
    (environ, start_response) are passed and the Flask application is called
    directly so the same name works for both factory and WSGI usage.
    """
    global _app_instance
    if _app_instance is None:
        _app_instance = _build_app()
    if len(args) == 2:
        return _app_instance(*args)
    return _app_instance
