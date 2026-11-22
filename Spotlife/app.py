import os
import re
import secrets
import sqlite3
from pathlib import Path

from flask import (
    Flask, abort, g, redirect, render_template, request, session, url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("SPOTLIFE_SECRET_KEY") or secrets.token_hex(32),
    DATABASE=Path(app.instance_path) / "spotlife.sqlite3",
    MAX_CONTENT_LENGTH=16 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
DUMMY_HASH = generate_password_hash(secrets.token_hex(32))


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    app.config["DATABASE"].parent.mkdir(parents=True, exist_ok=True)
    with app.app_context():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
        """)
        db.commit()


@app.context_processor
def add_form_token():
    def csrf_token():
        if "csrf_token" not in session:
            session["csrf_token"] = secrets.token_urlsafe(32)
        return session["csrf_token"]

    return {"csrf_token": csrf_token}


@app.before_request
def verify_form_token():
    if request.method == "POST":
        expected = session.get("csrf_token", "")
        received = request.form.get("csrf_token", "")
        if not expected or not secrets.compare_digest(expected.encode(), received.encode()):
            abort(400)


@app.after_request
def prevent_cached_account_pages(response):
    if request.endpoint != "static":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def index():
    if "user_id" in session:
        return redirect(url_for("welcome"))
    return redirect(url_for("register"))


@app.route("/cadastro", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("welcome"))
    if request.method == "GET":
        return render_template("auth.html", mode="register")

    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    confirmation = request.form.get("confirmation", "")
    errors = {}

    if not 2 <= len(name) <= 60:
        errors["name"] = "Digite um nome com 2 a 60 caracteres."
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        errors["email"] = "Digite um e-mail válido."
    if not 8 <= len(password) <= 128:
        errors["password"] = "Use entre 8 e 128 caracteres."
    if password != confirmation:
        errors["confirmation"] = "As senhas precisam ser iguais."

    if not errors:
        db = get_db()
        try:
            with db:
                cursor = db.execute(
                    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                    (name, email, generate_password_hash(password)),
                )
        except sqlite3.IntegrityError:
            errors["email"] = "Este e-mail já tem uma conta. Use a opção Entrar."
        else:
            session.clear()
            session["user_id"] = cursor.lastrowid
            return redirect(url_for("welcome"), code=303)

    return render_template(
        "auth.html", mode="register", name=name, email=email, errors=errors,
    ), 422


@app.route("/entrar", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("welcome"))
    if request.method == "GET":
        return render_template("auth.html", mode="login")

    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    user = get_db().execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (email,),
    ).fetchone()
    password_hash = user["password_hash"] if user else DUMMY_HASH
    if len(password) <= 128 and check_password_hash(password_hash, password) and user:
        session.clear()
        session["user_id"] = user["id"]
        return redirect(url_for("welcome"), code=303)

    return render_template(
        "auth.html", mode="login", email=email,
        message="E-mail ou senha incorretos.",
    ), 422


@app.get("/inicio")
def welcome():
    user_id = session.get("user_id")
    if user_id is None:
        return redirect(url_for("login"))

    user = get_db().execute(
        "SELECT name FROM users WHERE id = ?", (user_id,),
    ).fetchone()
    if user is None:
        session.clear()
        return redirect(url_for("login"))
    return render_template("welcome.html", name=user["name"])


@app.post("/sair")
def logout():
    session.clear()
    return redirect(url_for("login"), code=303)


init_db()

if __name__ == "__main__":
    app.run()