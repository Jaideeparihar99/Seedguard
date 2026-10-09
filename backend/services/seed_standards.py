"""Published Indian seed certification reference values for selected crops.

The source is the Central Seed Certification Board's 2013 manual. This is a
farmer-facing reference only; users must check the currently applicable rule
and the laboratory's reported units for their specific seed lot.
"""

from typing import Any


SOURCE_URL = "https://agriculture.hp.gov.in/wp-content/uploads/2022/03/INDIAN_MINIMUM_SEED_CERTIFICATION_STANDARDS.pdf"
SOURCE_TITLE = "Indian Minimum Seed Certification Standards (2013), Central Seed Certification Board"

# Values transcribed from the crop-specific seed standards tables. Each class
# pair is Foundation, Certified. Metrics absent from a table are not assessed.
_DATA: dict[str, dict[str, Any]] = {
    "wheat": {
        "label": "Wheat",
        "source_section": "Wheat, pp. 35–39 (including hybrids)",
        "types": {
            "variety": {
                "label": "Variety / open-pollinated",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 85, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 85, "moisture_max": 12},
                },
            },
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 85, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 85, "moisture_max": 12},
                },
            },
        },
    },
    "cotton": {
        "label": "Cotton",
        "source_section": "Cotton and cotton hybrids, pp. 137–142",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 5, "germination_min": 65, "moisture_max": 10},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 65, "moisture_max": 10},
                },
            },
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 5, "germination_min": 65, "moisture_max": 10},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 75, "moisture_max": 10},
                },
            },
        },
    },
    "pearl_millet": {
        "label": "Pearl millet (Bajra)",
        "source_section": "Pearl millet varieties and hybrids, pp. 62–66",
        "types": {
            "variety": {
                "label": "Open-pollinated / composite",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 75, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 75, "moisture_max": 12},
                },
            },
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 75, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 75, "moisture_max": 12},
                },
            },
        },
    },
    "tomato": {
        "label": "Tomato",
        "source_section": "Tomato and tomato hybrids, pp. 208–213",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 0, "germination_min": 70, "moisture_max": 8},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 0, "germination_min": 70, "moisture_max": 8},
                },
            },
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 0, "germination_min": 70, "moisture_max": 8},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 0, "germination_min": 70, "moisture_max": 8},
                },
            },
        },
    },
    "paddy": {
        "label": "Paddy (Rice)",
        "source_section": "Paddy and paddy hybrids, pp. 28–34",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 80, "moisture_max": 13},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 80, "moisture_max": 13},
                },
            },
            # The certified class is the hybrid seed planted for a crop; Foundation
            # in this chapter refers to parent lines, not commercial hybrid seed.
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 80, "moisture_max": 13},
                },
            },
        },
    },
    "maize": {
        "label": "Maize",
        "source_section": "Maize hybrids and open-pollinated varieties, pp. 42–53",
        "types": {
            "variety": {
                "label": "Open-pollinated / composite",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 0, "germination_min": 90, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 0, "germination_min": 90, "moisture_max": 12},
                },
            },
            # The manual recognizes only Certified for commercial maize hybrids.
            "hybrid": {
                "label": "Hybrid",
                "classes": {
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 0, "germination_min": 90, "moisture_max": 12},
                },
            },
        },
    },
    "soybean": {
        "label": "Soybean",
        "source_section": "Soybean, pp. 128–129",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 0, "weed_seeds_max_per_kg": 5, "germination_min": 70, "moisture_max": 12},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 70, "moisture_max": 12},
                },
            },
        },
    },
    "chickpea": {
        "label": "Chickpea (Bengal gram)",
        "source_section": "Bengal gram, pp. 81–82",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 0, "weed_seeds_max_per_kg": 0, "germination_min": 85, "moisture_max": 9},
                    "certified": {"pure_seed_min": 98, "inert_matter_max": 2, "other_crop_seeds_max_per_kg": 5, "weed_seeds_max_per_kg": 0, "germination_min": 85, "moisture_max": 9},
                },
            },
        },
    },
    "mustard": {
        "label": "Rapeseed / Mustard",
        "source_section": "Indian rapeseed and mustard, pp. 115–117",
        "types": {
            "variety": {
                "label": "Variety",
                "classes": {
                    "foundation": {"pure_seed_min": 97, "inert_matter_max": 3, "other_crop_seeds_max_per_kg": 10, "weed_seeds_max_per_kg": 10, "germination_min": 85, "moisture_max": 8},
                    "certified": {"pure_seed_min": 97, "inert_matter_max": 3, "other_crop_seeds_max_per_kg": 20, "weed_seeds_max_per_kg": 20, "germination_min": 85, "moisture_max": 8},
                },
            },
        },
    },
}

_METRICS = (
    ("pure_seed_percent", "Pure seed", "%", "pure_seed_min", "minimum", "Pure seed is the proportion identified as the crop seed, as measured in the report."),
    ("inert_matter_percent", "Inert matter", "%", "inert_matter_max", "maximum", "Inert matter means material such as soil, chaff, or other non-seed matter."),
    ("normal_germination_percent", "Germination", "%", "germination_min", "minimum", "This is a laboratory germination reference, not a prediction of field emergence."),
    ("moisture_percent", "Moisture", "%", "moisture_max", "maximum", "Moisture must be compared using a laboratory value reported on the same basis."),
    ("other_crop_seeds_per_kg", "Other crop seeds", "seeds/kg", "other_crop_seeds_max_per_kg", "maximum", "Count per kilogram; do not enter a percentage here."),
    ("weed_seeds_per_kg", "Weed seeds", "seeds/kg", "weed_seeds_max_per_kg", "maximum", "Count per kilogram; zero in the reference means none permitted."),
)


def get_seed_standard(crop: str, seed_type: str, seed_class: str) -> dict[str, Any]:
    crop_key = crop.strip().lower().replace(" ", "_").replace("-", "_")
    crop_data = _DATA.get(crop_key)
    if not crop_data:
        raise ValueError("Choose a crop from the supported list.")
    type_data = crop_data["types"].get(seed_type)
    if not type_data:
        raise ValueError("Choose a supported seed type for this crop.")
    standards = type_data["classes"].get(seed_class)
    if not standards:
        raise ValueError("Choose Foundation or Certified seed class.")

    metrics = []
    for key, label, unit, standard_key, direction, meaning in _METRICS:
        if standard_key not in standards:
            continue
        value = standards[standard_key]
        formatted_value = f"{value:g}{unit}" if unit == "%" else f"{value:g} {unit}"
        display = "None" if key == "weed_seeds_per_kg" and value == 0 else formatted_value
        if direction == "minimum":
            display = f"at least {display}"
        elif key == "weed_seeds_per_kg" and value == 0:
            display = "none permitted"
        else:
            display = f"no more than {display}"
        metrics.append({"key": key, "label": label, "unit": unit, "threshold": value, "direction": direction, "threshold_display": display, "meaning": meaning})

    return {
        "crop": crop_key,
        "crop_label": crop_data["label"],
        "seed_type": seed_type,
        "seed_type_label": type_data["label"],
        "seed_class": seed_class,
        "seed_class_label": "Foundation" if seed_class == "foundation" else "Certified",
        "source_title": SOURCE_TITLE,
        "source_section": crop_data["source_section"],
        "source_url": SOURCE_URL,
        "metrics": metrics,
        "note": "This is a reference to the 2013 certification manual, not a current legal ruling or an official test. Certification also checks field, identity, and other requirements. Compare only a matching crop/type/class and the same units; ask a seed-testing laboratory or certification agency about current applicable requirements.",
    }


def get_seed_standard_options() -> dict[str, Any]:
    """Expose only crop/type/class combinations covered by the reference tables."""
    crops = []
    for crop_key, crop_data in _DATA.items():
        crops.append({
            "value": crop_key,
            "label": crop_data["label"],
            "types": [
                {
                    "value": type_key,
                    "label": type_data["label"],
                    "classes": [
                        {"value": class_key, "label": class_key.title()}
                        for class_key in type_data["classes"]
                    ],
                }
                for type_key, type_data in crop_data["types"].items()
            ],
        })
    return {"crops": crops}


def compare_seed_values(payload: Any) -> dict[str, Any]:
    reference = get_seed_standard(payload.crop, payload.seed_type, payload.seed_class)
    values = {
        "pure_seed_percent": payload.pure_seed_percent,
        "inert_matter_percent": payload.inert_matter_percent,
        "normal_germination_percent": payload.normal_germination_percent,
        "moisture_percent": payload.moisture_percent,
        "other_crop_seeds_per_kg": payload.other_crop_seeds_per_kg,
        "weed_seeds_per_kg": payload.weed_seeds_per_kg,
    }
    results = []
    for metric in reference["metrics"]:
        value = values[metric["key"]]
        if value is None:
            status = "not_entered"
        elif metric["direction"] == "minimum":
            status = "within_reference" if value >= metric["threshold"] else "below_reference"
        else:
            status = "within_reference" if value <= metric["threshold"] else "above_reference"
        results.append({**metric, "value": value, "status": status})
    entered = [item for item in results if item["value"] is not None]
    if any(item["status"] in {"below_reference", "above_reference"} for item in entered):
        overall = "review_needed"
    elif entered:
        overall = "within_reference_for_entered_values"
    else:
        overall = "no_values_entered"
    return {**reference, "overall_status": overall, "findings": results}
