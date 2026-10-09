from typing import Any

from backend.config import CROP_PROFILES, SOURCE_LABELS, SOURCE_RISK_POINTS, VISUAL_FLAG_LABELS

REQUIRED_LABEL_FIELDS = (
    ("brand", "Brand"),
    ("variety", "Variety"),
    ("batch", "Batch / lot"),
    ("validity", "Validity date"),
)


def assess_risk(
    crop: str,
    price: float,
    source_type: str,
    fields: dict[str, str],
    has_image: bool,
) -> dict[str, Any]:
    reasons: list[dict[str, str]] = []
    score = 10  # A modest baseline reflects that a photo cannot certify seed.

    missing = [label for key, label in REQUIRED_LABEL_FIELDS if not fields.get(key, "").strip()]
    if missing:
        score += min(28, 7 * len(missing))
        reasons.append({
            "type": "caution",
            "title": "Some label details are missing",
            "detail": "Not provided: " + ", ".join(missing) + ". Check the packet or ask the seller.",
        })
    else:
        reasons.append({
            "type": "positive",
            "title": "Key label details provided",
            "detail": "Brand, variety, batch and validity details were entered.",
        })

    if has_image:
        reasons.append({
            "type": "positive",
            "title": "Packet photo attached",
            "detail": "A photo was included with this check. It is not retained; appearance concerns come only from your visual review, not automatic image detection.",
        })
    else:
        score += 12
        reasons.append({
            "type": "caution",
            "title": "No packet photo attached",
            "detail": "A clear packet photo can help you review the label details.",
        })

    selected_visual_flags = [
        flag for flag in fields.get("visual_flags", "").split("|")
        if flag in VISUAL_FLAG_LABELS
    ]
    if selected_visual_flags:
        score += min(24, 8 * len(set(selected_visual_flags)))
        observations = [VISUAL_FLAG_LABELS[flag] for flag in dict.fromkeys(selected_visual_flags)]
        reasons.append({
            "type": "caution",
            "title": "Visual concern reported by the user",
            "detail": "; ".join(observations) + ". This is a user observation, not an automatic image finding.",
        })

    profile = CROP_PROFILES.get(crop)
    if profile and (price < profile["min"] or price > profile["max"]):
        score += 20
        direction = "below" if price < profile["min"] else "above"
        reasons.append({
            "type": "caution",
            "title": "Price is outside the demo reference range",
            "detail": f"₹{price:g} is {direction} ₹{profile['min']}–₹{profile['max']} per pack. Confirm pack size and local pricing.",
        })
    elif profile:
        reasons.append({
            "type": "positive",
            "title": "Price is within the demo reference range",
            "detail": f"The configured range for {crop} is ₹{profile['min']}–₹{profile['max']} per pack.",
        })

    score += SOURCE_RISK_POINTS.get(source_type, 8)
    if source_type == "known_retailer":
        reasons.append({
            "type": "positive",
            "title": "Source identified as a known retailer",
            "detail": "This is based on your selection and does not independently verify the seller.",
        })
    else:
        reasons.append({
            "type": "caution",
            "title": f"Source selected: {SOURCE_LABELS.get(source_type, 'Local seller')}",
            "detail": "Ask for a receipt and confirm the seller and batch details.",
        })

    score = min(100, score)
    verdict = "Low risk" if score < 30 else "Caution" if score < 60 else "High risk"
    actions = [
        "Confirm the batch and validity details on the packet.",
        "Keep the receipt and ask the seller about the seed source.",
    ]
    if selected_visual_flags:
        actions.insert(0, "Ask the seller to explain or replace the packet before purchase.")
    elif score >= 60:
        actions.insert(0, "Verify the batch with an authorized source before planting.")
    elif missing:
        actions.insert(0, "Review the packet label and fill in missing details.")
    return {
        "score": score,
        "verdict": verdict,
        "reasons": reasons,
        "actions": actions[:3],
        "reference_range": profile,
    }
