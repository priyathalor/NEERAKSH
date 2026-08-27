"""
NEERAKSH ML Service (optional)
-------------------------------
A small Flask REST API that scores a submission description for how
relevant/detailed it is as a water-conservation action. The frontend
(js/main.js) calls this at http://127.0.0.1:6000/analyze when it is
running locally, and automatically falls back to an equivalent
client-side scorer (js/scoring.js) when this service isn't reachable —
so the app works fully even without running this service.

Run locally:
    pip install -r requirements.txt
    python app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

KEYWORDS = [
    "water", "save water", "conserve", "conservation", "rainwater",
    "harvest", "harvesting", "drip irrigation", "irrigation", "leak",
    "leakage", "reuse", "recycle", "recycling", "groundwater",
    "sustainable", "sustainability", "drought", "wastage", "waste",
    "greywater", "grey water", "tap", "plumbing", "awareness",
    "community", "borewell", "well", "river", "lake", "pond",
    "tank", "storage", "sprinkler", "efficient", "efficiency",
]


def score_description(description: str) -> int:
    text = (description or "").strip().lower()
    if len(text) < 5:
        return 10

    matches = sum(1 for word in KEYWORDS if word in text)
    keyword_score = min(matches * 8, 48)
    length_score = min(len(text) // 6, 32)
    base_score = 20

    total = base_score + keyword_score + length_score
    return max(10, min(100, total))


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    description = data.get("description", "").strip()

    if len(description) < 5:
        return jsonify({"error": "Invalid input"}), 400

    score = score_description(description)
    return jsonify({"score": score})


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ML service running"})


if __name__ == "__main__":
    app.run(port=6000)
