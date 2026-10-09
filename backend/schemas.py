from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class RiskReason(BaseModel):
    type: Literal["positive", "caution"]
    title: str
    detail: str


class PriceRange(BaseModel):
    min: float
    max: float


class AnalysisResponse(BaseModel):
    id: str
    created_at: str
    crop: str
    price: float
    quantity: float
    source_type: str
    fields: dict[str, str]
    score: int = Field(ge=0, le=100)
    verdict: Literal["Low risk", "Caution", "High risk"]
    reasons: list[RiskReason]
    actions: list[str]
    reference_range: PriceRange | None
    disclaimer: str


class PriceCheckResponse(BaseModel):
    crop: str
    price: float
    within_reference_range: bool
    reference_range: PriceRange
    difference_from_range: float
    difference_percent: float
    message: str


class SeedCheckSummary(BaseModel):
    id: str
    created_at: str
    crop: str
    price: float
    quantity: float
    source_type: str
    score: int
    verdict: str


class CompareRequest(BaseModel):
    check_ids: list[str] = Field(min_length=2, max_length=4)


class CompareOption(BaseModel):
    id: str
    crop: str
    price: float
    quantity: float
    source_type: str
    score: int
    verdict: str
    label_fields_present: int = Field(ge=0, le=4)
    has_photo: bool
    best_supported: bool


class CompareResponse(BaseModel):
    options: list[CompareOption]
    best_supported_ids: list[str]
    note: str


class TraceCompareRequest(BaseModel):
    packet: dict[str, str] = Field(min_length=1, max_length=8)
    official_record: dict[str, str] = Field(min_length=1, max_length=8)
    quality_details: dict[str, str] = Field(default_factory=dict, max_length=10)


class TraceFieldResult(BaseModel):
    field: str
    packet_value: str
    record_value: str
    status: Literal["match", "mismatch", "not_provided"]


class TraceQualityDetail(BaseModel):
    field: str
    value: str
    explanation: str


class TraceCompareResponse(BaseModel):
    id: str
    created_at: str
    overall_status: Literal["match", "mismatch", "incomplete"]
    fields: list[TraceFieldResult]
    quality_details: list[TraceQualityDetail]
    note: str
    disclaimer: str


class TraceCheckSummary(BaseModel):
    id: str
    created_at: str
    overall_status: Literal["match", "mismatch", "incomplete"]
    crop: str
    variety: str
    lot: str


class SowingPlanRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=60)
    variety: str = Field(default="", max_length=100)
    area: float = Field(gt=0, le=1_000_000)
    area_unit: Literal["acres", "hectares"]
    seed_rate_kg: float = Field(gt=0, le=1_000_000)
    rate_unit: Literal["kg_per_acre", "kg_per_hectare"]
    pack_weight_kg: float = Field(gt=0.001, le=1_000)
    price_per_pack: float = Field(gt=0, le=100_000_000)
    save: bool = False


class SowingPlanResponse(BaseModel):
    id: str | None
    created_at: str
    saved: bool
    crop: str
    variety: str
    area: float
    area_unit: Literal["acres", "hectares"]
    seed_rate_kg: float
    rate_unit: Literal["kg_per_acre", "kg_per_hectare"]
    area_at_rate_unit: float
    pack_weight_kg: float
    price_per_pack: float
    seed_needed_kg: float
    packs_to_buy: int
    seed_to_purchase_kg: float
    surplus_kg: float
    estimated_total: float
    note: str


class SowingPlanSummary(BaseModel):
    id: str
    created_at: str
    crop: str
    variety: str
    seed_needed_kg: float
    packs_to_buy: int
    estimated_total: float


class GerminationLogRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=60)
    variety: str = Field(default="", max_length=100)
    lot: str = Field(default="", max_length=100)
    sample_count: int = Field(gt=0, le=10_000)
    normal_seedlings_count: int = Field(ge=0, le=10_000)
    label_germination_percent: float | None = Field(default=None, ge=0, le=100)
    started_on: date
    observed_on: date
    method: Literal["paper_towel", "jute", "cloth", "other"]
    notes: str = Field(default="", max_length=500)
    save: bool = False

    @model_validator(mode="after")
    def validate_observation(self) -> "GerminationLogRequest":
        if self.normal_seedlings_count > self.sample_count:
            raise ValueError("Normal seedlings counted cannot exceed the sample size.")
        if self.observed_on < self.started_on:
            raise ValueError("The count date cannot be before the start date.")
        return self


class GerminationLogResponse(BaseModel):
    id: str | None
    created_at: str
    saved: bool
    crop: str
    variety: str
    lot: str
    sample_count: int
    normal_seedlings_count: int
    observed_percent: float
    label_germination_percent: float | None
    difference_points: float | None
    started_on: date
    observed_on: date
    method: Literal["paper_towel", "jute", "cloth", "other"]
    notes: str
    note: str


class GerminationLogSummary(BaseModel):
    id: str
    created_at: str
    crop: str
    variety: str
    lot: str
    sample_count: int
    observed_percent: float
    observed_on: date


class ConcernRecordRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=60)
    concern_type: Literal["sathi_difference", "no_sathi_record", "packet_label", "sample_observation", "other"]
    observed_on: date
    lot: str = Field(default="", max_length=100)
    tag: str = Field(default="", max_length=100)
    purchase_date: date | None = None
    seller: str = Field(default="", max_length=120)
    receipt_reference: str = Field(default="", max_length=100)
    district: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=1200)
    evidence: list[Literal["packet", "tag_photo", "receipt", "sathi_result", "sample_notes"]] = Field(default_factory=list, max_length=5)
    related_trace_check_id: str | None = Field(default=None, max_length=36)

    @field_validator("purchase_date", "related_trace_check_id", mode="before")
    @classmethod
    def normalize_optional_blank(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value


class ConcernRecordResponse(BaseModel):
    id: str
    created_at: str
    crop: str
    concern_type: Literal["sathi_difference", "no_sathi_record", "packet_label", "sample_observation", "other"]
    observed_on: date
    lot: str
    tag: str
    purchase_date: date | None
    seller: str
    receipt_reference: str
    district: str
    notes: str
    evidence: list[str]
    related_trace_check_id: str | None
    next_steps: list[str]
    note: str


class ConcernRecordSummary(BaseModel):
    id: str
    created_at: str
    crop: str
    concern_type: str
    lot: str
    observed_on: date


class TestingCenter(BaseModel):
    id: str
    name: str
    city: str
    state: str
    role: str
    type: Literal["central", "regional"]
    website: str
    source_url: str
    in_selected_state: bool


class TestingPathwaysResponse(BaseModel):
    selected_state: str
    centers: list[TestingCenter]
    state_contact_directory: str
    notification_url: str
    preparation_steps: list[str]
    note: str


class SeedStandardMetric(BaseModel):
    key: str
    label: str
    unit: str
    threshold: float
    direction: Literal["minimum", "maximum"]
    threshold_display: str
    meaning: str


class SeedStandardReference(BaseModel):
    crop: str
    crop_label: str
    seed_type: Literal["variety", "hybrid"]
    seed_type_label: str
    seed_class: Literal["foundation", "certified"]
    seed_class_label: str
    source_title: str
    source_section: str
    source_url: str
    metrics: list[SeedStandardMetric]
    note: str


class SeedStandardCheckRequest(BaseModel):
    crop: str = Field(min_length=1, max_length=40)
    seed_type: Literal["variety", "hybrid"]
    seed_class: Literal["foundation", "certified"]
    pure_seed_percent: float | None = Field(default=None, ge=0, le=100)
    inert_matter_percent: float | None = Field(default=None, ge=0, le=100)
    normal_germination_percent: float | None = Field(default=None, ge=0, le=100)
    moisture_percent: float | None = Field(default=None, ge=0, le=100)
    other_crop_seeds_per_kg: float | None = Field(default=None, ge=0, le=1_000_000)
    weed_seeds_per_kg: float | None = Field(default=None, ge=0, le=1_000_000)

    @model_validator(mode="after")
    def require_a_reported_value(self) -> "SeedStandardCheckRequest":
        value_fields = (
            self.pure_seed_percent, self.inert_matter_percent,
            self.normal_germination_percent, self.moisture_percent,
            self.other_crop_seeds_per_kg, self.weed_seeds_per_kg,
        )
        if all(value is None for value in value_fields):
            raise ValueError("Enter at least one value from a laboratory report or official record.")
        return self


class SeedStandardFinding(SeedStandardMetric):
    value: float | None
    status: Literal["within_reference", "below_reference", "above_reference", "not_entered"]


class SeedStandardCheckResponse(SeedStandardReference):
    overall_status: Literal["review_needed", "within_reference_for_entered_values", "no_values_entered"]
    findings: list[SeedStandardFinding]
