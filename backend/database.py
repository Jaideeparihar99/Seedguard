import json
import sqlite3
from contextlib import closing
from typing import Any
from uuid import uuid4

from backend.config import DB_PATH


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as connection, connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS seed_checks (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                crop TEXT NOT NULL,
                price REAL NOT NULL,
                quantity REAL NOT NULL,
                source_type TEXT NOT NULL,
                score INTEGER NOT NULL,
                verdict TEXT NOT NULL,
                reasons_json TEXT NOT NULL,
                fields_json TEXT NOT NULL,
                image_name TEXT
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS trace_checks (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                overall_status TEXT NOT NULL,
                result_json TEXT NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS sowing_plans (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                crop TEXT NOT NULL,
                result_json TEXT NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS germination_logs (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                crop TEXT NOT NULL,
                result_json TEXT NOT NULL
            )"""
        )
        connection.execute(
            """CREATE TABLE IF NOT EXISTS concern_records (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                crop TEXT NOT NULL,
                concern_type TEXT NOT NULL,
                result_json TEXT NOT NULL
            )"""
        )


def create_concern_record(*, created_at: str, crop: str, concern_type: str, result: dict[str, Any]) -> str:
    record_id = str(uuid4())
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO concern_records (id, created_at, crop, concern_type, result_json) VALUES (?, ?, ?, ?, ?)",
            (record_id, created_at, crop, concern_type, json.dumps(result, ensure_ascii=False)),
        )
    return record_id


def list_concern_records(limit: int = 20) -> list[dict[str, Any]]:
    with closing(connect()) as connection, connection:
        rows = connection.execute(
            "SELECT id, created_at, crop, concern_type, result_json FROM concern_records ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    records = []
    for row in rows:
        result = json.loads(row["result_json"])
        records.append({
            "id": row["id"], "created_at": row["created_at"], "crop": row["crop"],
            "concern_type": row["concern_type"], "lot": result.get("lot", ""),
            "observed_on": result["observed_on"],
        })
    return records


def get_concern_record(record_id: str) -> dict[str, Any] | None:
    with closing(connect()) as connection, connection:
        row = connection.execute("SELECT * FROM concern_records WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "created_at": row["created_at"], **json.loads(row["result_json"])}


def create_sowing_plan(*, created_at: str, crop: str, result: dict[str, Any]) -> str:
    plan_id = str(uuid4())
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO sowing_plans (id, created_at, crop, result_json) VALUES (?, ?, ?, ?)",
            (plan_id, created_at, crop, json.dumps(result, ensure_ascii=False)),
        )
    return plan_id


def list_sowing_plans(limit: int = 20) -> list[dict[str, Any]]:
    with closing(connect()) as connection, connection:
        rows = connection.execute(
            "SELECT id, created_at, crop, result_json FROM sowing_plans ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    plans = []
    for row in rows:
        result = json.loads(row["result_json"])
        plans.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "crop": row["crop"],
            "variety": result.get("variety", ""),
            "seed_needed_kg": result["seed_needed_kg"],
            "packs_to_buy": result["packs_to_buy"],
            "estimated_total": result["estimated_total"],
        })
    return plans


def create_germination_log(*, created_at: str, crop: str, result: dict[str, Any]) -> str:
    log_id = str(uuid4())
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO germination_logs (id, created_at, crop, result_json) VALUES (?, ?, ?, ?)",
            (log_id, created_at, crop, json.dumps(result, ensure_ascii=False)),
        )
    return log_id


def list_germination_logs(limit: int = 20) -> list[dict[str, Any]]:
    with closing(connect()) as connection, connection:
        rows = connection.execute(
            "SELECT id, created_at, result_json FROM germination_logs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    logs = []
    for row in rows:
        result = json.loads(row["result_json"])
        logs.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "crop": result["crop"],
            "variety": result.get("variety", ""),
            "lot": result.get("lot", ""),
            "sample_count": result["sample_count"],
            "observed_percent": result["observed_percent"],
            "observed_on": result["observed_on"],
        })
    return logs


def get_germination_log(log_id: str) -> dict[str, Any] | None:
    with closing(connect()) as connection, connection:
        row = connection.execute("SELECT * FROM germination_logs WHERE id = ?", (log_id,)).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "created_at": row["created_at"], **json.loads(row["result_json"])}


def create_trace_check(*, created_at: str, overall_status: str, result: dict[str, Any]) -> str:
    check_id = str(uuid4())
    with closing(connect()) as connection, connection:
        connection.execute(
            "INSERT INTO trace_checks (id, created_at, overall_status, result_json) VALUES (?, ?, ?, ?)",
            (check_id, created_at, overall_status, json.dumps(result, ensure_ascii=False)),
        )
    return check_id


def list_trace_checks(limit: int = 20) -> list[dict[str, Any]]:
    with closing(connect()) as connection, connection:
        rows = connection.execute(
            "SELECT id, created_at, overall_status, result_json FROM trace_checks ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    checks = []
    for row in rows:
        result = json.loads(row["result_json"])
        checks.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "overall_status": row["overall_status"],
            "crop": result["packet"].get("crop", ""),
            "variety": result["packet"].get("variety", ""),
            "lot": result["packet"].get("lot", ""),
        })
    return checks


def get_trace_check(check_id: str) -> dict[str, Any] | None:
    with closing(connect()) as connection, connection:
        row = connection.execute("SELECT * FROM trace_checks WHERE id = ?", (check_id,)).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "created_at": row["created_at"], **json.loads(row["result_json"])}


def create_seed_check(
    *,
    created_at: str,
    crop: str,
    price: float,
    quantity: float,
    source_type: str,
    score: int,
    verdict: str,
    reasons: list[dict[str, Any]],
    fields: dict[str, str],
    image_name: str | None,
) -> str:
    check_id = str(uuid4())
    with closing(connect()) as connection, connection:
        connection.execute(
            """INSERT INTO seed_checks
            (id, created_at, crop, price, quantity, source_type, score, verdict,
             reasons_json, fields_json, image_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (check_id, created_at, crop, price, quantity, source_type, score, verdict,
             json.dumps(reasons), json.dumps(fields), image_name),
        )
    return check_id


def list_seed_checks(limit: int = 20) -> list[dict[str, Any]]:
    with closing(connect()) as connection, connection:
        rows = connection.execute(
            """SELECT id, created_at, crop, price, quantity, source_type, score, verdict
            FROM seed_checks ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_seed_check(check_id: str) -> dict[str, Any] | None:
    with closing(connect()) as connection, connection:
        row = connection.execute("SELECT * FROM seed_checks WHERE id = ?", (check_id,)).fetchone()
    if row is None:
        return None
    check = dict(row)
    check["reasons"] = json.loads(check.pop("reasons_json"))
    check["fields"] = json.loads(check.pop("fields_json"))
    return check
