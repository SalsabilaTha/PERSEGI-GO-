"""Titik masuk pengembangan: jalankan `python app.py` lalu buka http://localhost:5000."""
from backend import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=app.config["APP_ENV"] != "production")
