from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "work" / "seedguard.sqlite3"
STATIC_PATH = ROOT / "frontend"
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Demonstration reference ranges in INR per standard pack. Replace with a
# sourced, locally configured dataset before using for real purchase guidance.
CROP_PROFILES: dict[str, dict[str, int]] = {
    "Mustard": {"min": 850, "max": 1100},
    "Wheat": {"min": 700, "max": 1200},
    "Bajra": {"min": 500, "max": 900},
    "Cotton": {"min": 700, "max": 1400},
    "Tomato": {"min": 250, "max": 800},
}

SOURCE_RISK_POINTS = {"known_retailer": 0, "local_seller": 8, "unknown": 15}
SOURCE_LABELS = {"known_retailer": "Known retailer", "local_seller": "Local seller", "unknown": "Unknown source"}
VISUAL_FLAG_LABELS = {
    "package_damage": "Packet looks torn, open, or resealed",
    "label_damage": "Label looks altered, damaged, or incomplete",
    "seed_condition": "Seeds appear discolored, moldy, damaged, or mixed with debris",
}
DISCLAIMER = "Risk triage only. This is not seed certification, an authenticity check, or a germination test."
