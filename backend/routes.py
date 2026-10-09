from datetime import datetime, timezone
from math import ceil
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.config import ALLOWED_IMAGE_TYPES, CROP_PROFILES, DISCLAIMER, MAX_UPLOAD_BYTES, VISUAL_FLAG_LABELS
from backend.database import create_concern_record, create_germination_log, create_seed_check, create_sowing_plan, create_trace_check, get_concern_record, get_germination_log, get_seed_check, get_trace_check, list_concern_records, list_germination_logs, list_seed_checks, list_sowing_plans, list_trace_checks
from backend.schemas import AnalysisResponse, CompareRequest, CompareResponse, ConcernRecordRequest, ConcernRecordResponse, ConcernRecordSummary, GerminationLogRequest, GerminationLogResponse, GerminationLogSummary, PriceCheckResponse, SeedCheckSummary, SeedStandardCheckRequest, SeedStandardCheckResponse, SeedStandardReference, SowingPlanRequest, SowingPlanResponse, SowingPlanSummary, TestingPathwaysResponse, TraceCheckSummary, TraceCompareRequest, TraceCompareResponse
from backend.services.risk_engine import assess_risk
from backend.services.seed_standards import compare_seed_values, get_seed_standard, get_seed_standard_options
from backend.services.testing_pathways import get_testing_pathways

router = APIRouter(prefix="/api")


@router.get("/testing-pathways", response_model=TestingPathwaysResponse)
def testing_pathways(
    state: Annotated[str | None, Query(max_length=80)] = None,
) -> dict[str, Any]:
    """Return sourced central seed-testing locations and official state contacts."""
    return get_testing_pathways(state)


@router.get("/seed-standards", response_model=SeedStandardReference)
def seed_standards(
    crop: Annotated[str, Query(min_length=1, max_length=40)],
    seed_type: Annotated[str, Query(pattern="^(variety|hybrid)$")] = "variety",
    seed_class: Annotated[str, Query(pattern="^(foundation|certified)$")] = "certified",
) -> dict[str, Any]:
    """Return a sourced 2013 reference table for a supported crop/type/class."""
    try:
        return get_seed_standard(crop, seed_type, seed_class)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.get("/seed-standard-options")
def seed_standard_options() -> dict[str, Any]:
    """Return only crop, seed-type and class combinations present in the reference data."""
    return get_seed_standard_options()


@router.post("/seed-standard-check", response_model=SeedStandardCheckResponse)
def seed_standard_check(payload: SeedStandardCheckRequest) -> dict[str, Any]:
    """Compare reported numeric values with a crop-specific reference, never certify a lot."""
    try:
        return compare_seed_values(payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/concern-record", response_model=ConcernRecordResponse)
def concern_record(payload: ConcernRecordRequest) -> dict[str, Any]:
    """Save the farmer's observations and evidence checklist without drawing a fraud conclusion."""
    crop = payload.crop.strip()
    if not crop:
        raise HTTPException(400, "Enter a crop name.")
    related_trace_check_id = payload.related_trace_check_id.strip() if payload.related_trace_check_id else None
    if related_trace_check_id and get_trace_check(related_trace_check_id) is None:
        raise HTTPException(404, "The linked SATHI comparison was not found.")
    next_steps = [
        "Keep the packet, tag, remaining seed, and purchase receipt together. Do not alter or discard them.",
        "Write down when and where you bought the seed and exactly what you observed. Keep original photos or screenshots.",
        "Ask the seller for a written explanation and the source or lot documents.",
        "If the concern remains, contact your district agriculture office, seed inspector, or State Seed Certification Agency using an official directory. Ask them what sampling or testing procedure applies.",
    ]
    result = {
        "crop": crop,
        "concern_type": payload.concern_type,
        "observed_on": payload.observed_on.isoformat(),
        "lot": payload.lot.strip(),
        "tag": payload.tag.strip(),
        "purchase_date": payload.purchase_date.isoformat() if payload.purchase_date else None,
        "seller": payload.seller.strip(),
        "receipt_reference": payload.receipt_reference.strip(),
        "district": payload.district.strip(),
        "notes": payload.notes.strip(),
        "evidence": list(dict.fromkeys(payload.evidence)),
        "related_trace_check_id": related_trace_check_id,
        "next_steps": next_steps,
        "note": "This is a record of the details you entered, not a complaint filing, official finding, proof of counterfeit seed, or laboratory result. Keep the original evidence and contact the relevant authority for formal assessment.",
    }
    created_at = datetime.now(timezone.utc).isoformat()
    record_id = create_concern_record(
        created_at=created_at, crop=crop,
        concern_type=payload.concern_type, result=result,
    )
    return {"id": record_id, "created_at": created_at, **result}


@router.get("/concern-records", response_model=dict[str, list[ConcernRecordSummary]])
def concern_records(limit: Annotated[int, Query(ge=1, le=100)] = 20) -> dict[str, Any]:
    return {"records": list_concern_records(limit)}


@router.get("/concern-records/{record_id}", response_model=ConcernRecordResponse)
def concern_record_detail(record_id: str) -> dict[str, Any]:
    record = get_concern_record(record_id)
    if record is None:
        raise HTTPException(404, "Concern record not found.")
    return record


@router.post("/sowing-plan", response_model=SowingPlanResponse)
def sowing_plan(payload: SowingPlanRequest) -> dict[str, Any]:
    """Calculate packet quantity and budget from rates supplied by the farmer."""
    crop = payload.crop.strip()
    if not crop:
        raise HTTPException(400, "Enter a crop name.")
    hectares_per_acre = 1 / 2.47105
    if payload.area_unit == "acres" and payload.rate_unit == "kg_per_hectare":
        area_at_rate_unit = payload.area * hectares_per_acre
    elif payload.area_unit == "hectares" and payload.rate_unit == "kg_per_acre":
        area_at_rate_unit = payload.area * 2.47105
    else:
        area_at_rate_unit = payload.area

    required_kg = area_at_rate_unit * payload.seed_rate_kg
    packs = ceil(required_kg / payload.pack_weight_kg)
    purchased_kg = packs * payload.pack_weight_kg
    created_at = datetime.now(timezone.utc).isoformat()
    result = {
        "crop": crop,
        "variety": payload.variety.strip(),
        "area": payload.area,
        "area_unit": payload.area_unit,
        "seed_rate_kg": payload.seed_rate_kg,
        "rate_unit": payload.rate_unit,
        "area_at_rate_unit": round(area_at_rate_unit, 5),
        "pack_weight_kg": payload.pack_weight_kg,
        "price_per_pack": payload.price_per_pack,
        "seed_needed_kg": round(required_kg, 3),
        "packs_to_buy": packs,
        "seed_to_purchase_kg": round(purchased_kg, 3),
        "surplus_kg": round(max(0, purchased_kg - required_kg), 3),
        "estimated_total": round(packs * payload.price_per_pack, 2),
        "note": "This is arithmetic using the seed rate you entered, not a crop recommendation. Seed rate varies with crop, variety, sowing method, region, and local advice. Confirm the rate with the packet or a local agriculture expert.",
    }
    plan_id = create_sowing_plan(created_at=created_at, crop=result["crop"], result=result) if payload.save else None
    return {"id": plan_id, "created_at": created_at, "saved": payload.save, **result}


@router.get("/sowing-plans", response_model=dict[str, list[SowingPlanSummary]])
def sowing_plans(limit: Annotated[int, Query(ge=1, le=100)] = 20) -> dict[str, Any]:
    return {"plans": list_sowing_plans(limit)}


@router.post("/germination-log", response_model=GerminationLogResponse)
def germination_log(payload: GerminationLogRequest) -> dict[str, Any]:
    """Record what the farmer observed in a sample; this is not a lab assessment."""
    crop = payload.crop.strip()
    if not crop:
        raise HTTPException(400, "Enter a crop name.")
    observed_percent = round(payload.normal_seedlings_count / payload.sample_count * 100, 2)
    difference_points = (
        round(observed_percent - payload.label_germination_percent, 2)
        if payload.label_germination_percent is not None
        else None
    )
    created_at = datetime.now(timezone.utc).isoformat()
    result = {
        "crop": crop,
        "variety": payload.variety.strip(),
        "lot": payload.lot.strip(),
        "sample_count": payload.sample_count,
        "normal_seedlings_count": payload.normal_seedlings_count,
        "observed_percent": observed_percent,
        "label_germination_percent": payload.label_germination_percent,
        "difference_points": difference_points,
        "started_on": payload.started_on.isoformat(),
        "observed_on": payload.observed_on.isoformat(),
        "method": payload.method,
        "notes": payload.notes.strip(),
        "note": "This percentage describes only the sample you counted. It is not a laboratory result, certification, a finding about the whole lot, or a prediction of field emergence. For a formal result, use an authorized seed testing laboratory.",
    }
    log_id = create_germination_log(created_at=created_at, crop=crop, result=result) if payload.save else None
    return {"id": log_id, "created_at": created_at, "saved": payload.save, **result}


@router.get("/germination-logs", response_model=dict[str, list[GerminationLogSummary]])
def germination_logs(limit: Annotated[int, Query(ge=1, le=100)] = 20) -> dict[str, Any]:
    return {"logs": list_germination_logs(limit)}


@router.get("/germination-logs/{log_id}", response_model=GerminationLogResponse)
def germination_log_detail(log_id: str) -> dict[str, Any]:
    saved = get_germination_log(log_id)
    if saved is None:
        raise HTTPException(404, "Germination observation not found.")
    return {**saved, "saved": True}


@router.post("/trace-compare", response_model=TraceCompareResponse)
def trace_compare(payload: TraceCompareRequest) -> dict[str, Any]:
    """Compare farmer-entered packet values with a record they looked up on SATHI.

    This endpoint does not fetch or verify SATHI data. The user supplies the
    official-record values after using SATHI's public tag lookup.
    """
    allowed = {"crop", "variety", "lot", "tag", "producer"}
    quality_labels = {
        "normal_germination": ("Normal germination", "The SATHI record's germination test result. It is a recorded test result, not a guarantee of field emergence."),
        "weed_seed": ("Weed seed / purity", "The weed-seed result recorded for this lot. Interpret its unit and meaning as shown in the official record."),
        "other_crop_seed": ("Other crop seed / purity", "The other-crop-seed result recorded for this lot. Interpret its unit and meaning as shown in the official record."),
        "dead_seed": ("Dead seed", "The dead-seed result recorded for this lot; this entry alone does not predict field performance."),
        "hard_seed": ("Hard seed", "The hard-seed result recorded for this lot; crop-specific interpretation may be needed."),
        "insect_damage": ("Insect damage", "The insect-damage result recorded during testing or inspection."),
        "abnormal_seed": ("Abnormal seed", "The abnormal-seed result recorded for this lot."),
        "diseased_seed": ("Diseased seed", "The diseased-seed result recorded for this lot."),
        "nematode_galls": ("Nematode galls", "The nematode-gall result recorded for this lot."),
    }
    if set(payload.packet) - allowed or set(payload.official_record) - allowed:
        raise HTTPException(400, "Use only crop, variety, lot, tag, and producer fields.")
    if set(payload.quality_details) - set(quality_labels):
        raise HTTPException(400, "Choose valid SATHI quality detail fields.")
    if any(len(value.strip()) > 80 for value in payload.quality_details.values()):
        raise HTTPException(400, "SATHI quality values must be 80 characters or shorter.")
    fields: list[dict[str, str]] = []
    for key in ("crop", "variety", "lot", "tag", "producer"):
        packet_value = payload.packet.get(key, "").strip()
        record_value = payload.official_record.get(key, "").strip()
        if not packet_value and not record_value:
            continue
        if not packet_value or not record_value:
            status = "not_provided"
        else:
            normalize = lambda value: " ".join(value.casefold().split())
            status = "match" if normalize(packet_value) == normalize(record_value) else "mismatch"
        fields.append({"field": key, "packet_value": packet_value, "record_value": record_value, "status": status})

    if not fields:
        raise HTTPException(400, "Enter at least one packet or SATHI record detail.")
    if any(item["status"] == "mismatch" for item in fields):
        overall = "mismatch"
    elif any(item["status"] == "not_provided" for item in fields):
        overall = "incomplete"
    else:
        overall = "match"
    result = {
        "overall_status": overall,
        "packet": payload.packet,
        "official_record": payload.official_record,
        "fields": fields,
        "quality_details": [
            {"field": label, "value": value.strip(), "explanation": explanation}
            for key, value in payload.quality_details.items()
            if value.strip()
            for label, explanation in [quality_labels[key]]
        ],
        "note": "Comparison uses values entered by you. SeedGuard does not fetch or authenticate the SATHI record.",
        "disclaimer": "A match is not proof that the contents are genuine or viable. If no record is found, contact the seller or the relevant seed certification agency; absence of a record alone does not prove fraud.",
    }
    created_at = datetime.now(timezone.utc).isoformat()
    check_id = create_trace_check(created_at=created_at, overall_status=overall, result=result)
    return {"id": check_id, "created_at": created_at, **result}


@router.get("/trace-checks", response_model=dict[str, list[TraceCheckSummary]])
def trace_checks(limit: Annotated[int, Query(ge=1, le=100)] = 20) -> dict[str, Any]:
    return {"checks": list_trace_checks(limit)}


@router.get("/trace-checks/{check_id}", response_model=TraceCompareResponse)
def trace_check_detail(check_id: str) -> dict[str, Any]:
    saved = get_trace_check(check_id)
    if saved is None:
        raise HTTPException(404, "SATHI comparison not found.")
    return saved


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/crops")
def crops() -> dict[str, dict[str, dict[str, int]]]:
    return {"crops": CROP_PROFILES}


@router.get("/price-check", response_model=PriceCheckResponse)
def price_check(crop: str, price: Annotated[float, Query(gt=0)]) -> dict[str, Any]:
    profile = CROP_PROFILES.get(crop)
    if profile is None:
        raise HTTPException(400, "Choose a supported crop.")

    if price < profile["min"]:
        difference = price - profile["min"]
        message = "Price is below the configured demo reference range. Confirm pack size and local pricing."
    elif price > profile["max"]:
        difference = price - profile["max"]
        message = "Price is above the configured demo reference range. Confirm pack size and local pricing."
    else:
        difference = 0.0
        message = "Price is within the configured demo reference range."
    base = profile["min"] if difference < 0 else profile["max"]
    return {
        "crop": crop,
        "price": price,
        "within_reference_range": difference == 0,
        "reference_range": profile,
        "difference_from_range": round(difference, 2),
        "difference_percent": round(difference / base * 100, 2) if difference else 0.0,
        "message": message,
    }


@router.post("/analyze-seed", response_model=AnalysisResponse)
async def analyze_seed(
    crop: Annotated[str, Form()],
    price: Annotated[float, Form(gt=0)],
    quantity: Annotated[float, Form(gt=0)],
    source_type: Annotated[str, Form()],
    brand: Annotated[str, Form()] = "",
    variety: Annotated[str, Form()] = "",
    batch: Annotated[str, Form()] = "",
    validity: Annotated[str, Form()] = "",
    weight: Annotated[str, Form()] = "",
    certification: Annotated[str, Form()] = "",
    packed_on: Annotated[str, Form()] = "",
    test_date: Annotated[str, Form()] = "",
    visual_flags: Annotated[list[str] | None, Form()] = None,
    image: UploadFile | None = File(default=None),
) -> dict[str, Any]:
    if crop not in CROP_PROFILES:
        raise HTTPException(400, "Choose a supported crop.")
    if source_type not in {"known_retailer", "local_seller", "unknown"}:
        raise HTTPException(400, "Choose a valid source type.")
    normalized_visual_flags = list(dict.fromkeys(visual_flags or []))
    if any(flag not in VISUAL_FLAG_LABELS for flag in normalized_visual_flags):
        raise HTTPException(400, "Choose valid visual review options.")
    if normalized_visual_flags and image is None:
        raise HTTPException(400, "Add a packet photo before submitting visual review notes.")

    image_name = None
    if image:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(415, "Upload a JPG, PNG, or WebP image.")
        contents = await image.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Image must be 8 MB or smaller.")
        if not contents:
            raise HTTPException(400, "The uploaded image is empty.")
        image_name = Path(image.filename or "packet-image").name[:160]

    fields = {
        "brand": brand.strip(),
        "variety": variety.strip(),
        "batch": batch.strip(),
        "validity": validity.strip(),
        "weight": weight.strip(),
        "certification": certification.strip(),
        "packed_on": packed_on.strip(),
        "test_date": test_date.strip(),
        "visual_flags": "|".join(normalized_visual_flags),
    }
    result = assess_risk(crop, price, source_type, fields, image_name is not None)
    created_at = datetime.now(timezone.utc).isoformat()
    check_id = create_seed_check(
        created_at=created_at,
        crop=crop,
        price=price,
        quantity=quantity,
        source_type=source_type,
        score=result["score"],
        verdict=result["verdict"],
        reasons=result["reasons"],
        fields=fields,
        image_name=image_name,
    )
    return {
        "id": check_id,
        "created_at": created_at,
        "crop": crop,
        "price": price,
        "quantity": quantity,
        "source_type": source_type,
        "fields": fields,
        **result,
        "disclaimer": DISCLAIMER,
    }


@router.get("/seed-checks", response_model=dict[str, list[SeedCheckSummary]])
def seed_checks(limit: Annotated[int, Query(ge=1, le=100)] = 20) -> dict[str, list[dict[str, Any]]]:
    return {"checks": list_seed_checks(limit)}


@router.get("/seed-checks/{check_id}", response_model=AnalysisResponse)
def seed_check_detail(check_id: str) -> dict[str, Any]:
    saved = get_seed_check(check_id)
    if saved is None:
        raise HTTPException(404, "Seed check not found.")
    result = assess_risk(saved["crop"], saved["price"], saved["source_type"], saved["fields"], bool(saved["image_name"]))
    return {
        "id": saved["id"],
        "created_at": saved["created_at"],
        "crop": saved["crop"],
        "price": saved["price"],
        "quantity": saved["quantity"],
        "source_type": saved["source_type"],
        "fields": saved["fields"],
        **result,
        "disclaimer": DISCLAIMER,
    }


@router.post("/compare", response_model=CompareResponse)
def compare_seed_checks(payload: CompareRequest) -> dict[str, Any]:
    if len(set(payload.check_ids)) != len(payload.check_ids):
        raise HTTPException(400, "Choose each seed check only once.")

    saved_checks = [get_seed_check(check_id) for check_id in payload.check_ids]
    if any(check is None for check in saved_checks):
        raise HTTPException(404, "One or more selected seed checks were not found.")

    options: list[dict[str, Any]] = []
    for saved in saved_checks:
        assert saved is not None
        result = assess_risk(saved["crop"], saved["price"], saved["source_type"], saved["fields"], bool(saved["image_name"]))
        label_fields_present = sum(bool(saved["fields"].get(key, "").strip()) for key in ("brand", "variety", "batch", "validity"))
        options.append({
            "id": saved["id"],
            "crop": saved["crop"],
            "price": saved["price"],
            "quantity": saved["quantity"],
            "source_type": saved["source_type"],
            "score": result["score"],
            "verdict": result["verdict"],
            "label_fields_present": label_fields_present,
            "has_photo": bool(saved["image_name"]),
            "best_supported": False,
        })

    # Rank evidence completeness first, then prefer fewer observed risk signals.
    best_rank = max((item["label_fields_present"] + int(item["has_photo"]), -item["score"]) for item in options)
    best_ids = [
        item["id"] for item in options
        if (item["label_fields_present"] + int(item["has_photo"]), -item["score"]) == best_rank
    ]
    for item in options:
        item["best_supported"] = item["id"] in best_ids

    return {
        "options": options,
        "best_supported_ids": best_ids,
        "note": "Best-supported is based on entered label details, photo presence, and the demo risk score. It is not a certification or a purchase recommendation.",
    }
