"""
server.py — SkillLens AI Data Warehouse API Server
====================================================
FastAPI server that exposes the DuckDB data warehouse over HTTP.
Supports ad-hoc queries and pre-built KPI endpoints.

Run:
    uvicorn server:app --port 8001 --reload
"""

import os
import json
from datetime import datetime
from typing import Optional, List

import duckdb
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Reuse ETL runner to trigger on-demand refresh
import sys
sys.path.insert(0, os.path.dirname(__file__))
from etl import run_etl, profile_mongo, get_mongo

DW_PATH = os.environ.get("DW_PATH", os.path.join(os.path.dirname(__file__), "skilllensai_dw.duckdb"))

app = FastAPI(title="SkillLens AI – Data Warehouse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB helper ────────────────────────────────────────────────────────────────
def _dw():
    """Return a read connection to the DuckDB warehouse."""
    if not os.path.exists(DW_PATH):
        raise HTTPException(
            status_code=503,
            detail="Data warehouse not initialised. POST /warehouse/etl first."
        )
    return duckdb.connect(DW_PATH, read_only=True)

def _row_to_dict(description, row):
    return {description[i][0]: row[i] for i in range(len(description))}

def _fetch(sql: str, params=None):
    conn = _dw()
    try:
        cur = conn.execute(sql, params or [])
        desc = cur.description
        rows = cur.fetchall()
        return [_row_to_dict(desc, r) for r in rows]
    finally:
        conn.close()

# ─── ETL trigger ─────────────────────────────────────────────────────────────
@app.post("/warehouse/etl", tags=["ETL"])
def trigger_etl(stage: str = Query(default="all", enum=["all", "bronze", "silver", "gold"])):
    """Run the MongoDB → DuckDB ETL pipeline (or a single stage) via subprocess to avoid locks."""
    import subprocess
    try:
        # Run etl.py as a separate process so it gets a clean read/write lock on the duckdb file
        env = os.environ.copy()
        script_path = os.path.join(os.path.dirname(__file__), "etl.py")
        
        result = subprocess.run(
            [sys.executable, script_path, "--stage", stage], 
            capture_output=True, text=True, check=True
        )
        return {"status": "success", "stage": stage, "output": result.stdout}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"ETL Failed: {e.stderr or e.stdout}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── KPI Endpoints ────────────────────────────────────────────────────────────
@app.get("/warehouse/summary", tags=["KPIs"])
def warehouse_summary():
    """Platform-wide KPIs from the Gold layer."""
    rows = _fetch("SELECT * FROM vw_platform_summary")
    return rows[0] if rows else {}

@app.get("/warehouse/monthly-applications", tags=["KPIs"])
def monthly_applications():
    """Monthly application trends (line chart data)."""
    return _fetch("SELECT * FROM vw_monthly_applications")

@app.get("/warehouse/top-skills", tags=["KPIs"])
def top_skills(limit: int = Query(default=20, le=50)):
    """Most common skills across all candidates."""
    return _fetch(f"SELECT * FROM vw_top_skills LIMIT {limit}")

@app.get("/warehouse/top-candidates", tags=["KPIs"])
def top_candidates(limit: int = Query(default=20, le=100)):
    """Top performing candidates by quiz + resume score."""
    return _fetch(f"SELECT * FROM vw_top_candidates LIMIT {limit}")

@app.get("/warehouse/fit-distribution", tags=["KPIs"])
def fit_distribution():
    """Distribution of fit labels (Excellent/Good/Moderate/Low)."""
    return _fetch("SELECT * FROM vw_fit_label_distribution")

# ─── Dimensional queries ──────────────────────────────────────────────────────
@app.get("/warehouse/users", tags=["Dimensions"])
def list_users(limit: int = 100, offset: int = 0, role: Optional[str] = None,
               synthetic: bool = False):
    """List users from the data warehouse."""
    where = f"WHERE {'is_synthetic = TRUE' if synthetic else 'is_synthetic = FALSE'}"
    if role:
        where += f" AND role = '{role}'"
    return _fetch(f"SELECT * FROM dim_user {where} ORDER BY _updated_at DESC LIMIT {limit} OFFSET {offset}")

@app.get("/warehouse/jobs", tags=["Dimensions"])
def list_jobs(limit: int = 100, status: Optional[str] = None):
    where = f"WHERE status = '{status}'" if status else ""
    return _fetch(f"SELECT * FROM dim_job {where} LIMIT {limit}")

@app.get("/warehouse/companies", tags=["Dimensions"])
def list_companies(limit: int = 100):
    return _fetch(f"SELECT * FROM dim_company LIMIT {limit}")

@app.get("/warehouse/skills", tags=["Dimensions"])
def list_skills(category: Optional[str] = None):
    where = f"WHERE skill_category = '{category}'" if category else ""
    return _fetch(f"SELECT * FROM dim_skill {where} ORDER BY skill_name")

# ─── Fact queries ─────────────────────────────────────────────────────────────
@app.get("/warehouse/applications", tags=["Facts"])
def list_applications(limit: int = 200, status: Optional[str] = None):
    where = f"WHERE status = '{status}'" if status else ""
    return _fetch(f"SELECT * FROM fact_applications {where} ORDER BY applied_date_key DESC LIMIT {limit}")

@app.get("/warehouse/quiz-attempts", tags=["Facts"])
def list_quiz_attempts(limit: int = 200, passed: Optional[bool] = None):
    where = f"WHERE passed = {str(passed).upper()}" if passed is not None else ""
    return _fetch(f"SELECT * FROM fact_quiz_attempts {where} ORDER BY submitted_date_key DESC LIMIT {limit}")

@app.get("/warehouse/resume-screening", tags=["Facts"])
def list_resume_screening(limit: int = 200, fit_label: Optional[str] = None):
    where = f"WHERE fit_label = '{fit_label}'" if fit_label else ""
    return _fetch(f"SELECT * FROM fact_resume_screening {where} ORDER BY screened_date_key DESC LIMIT {limit}")

# ─── Data quality endpoint ────────────────────────────────────────────────────
@app.get("/warehouse/data-quality", tags=["Quality"])
def data_quality():
    """Run a data quality profile on MongoDB source collections."""
    try:
        db = get_mongo()
        return profile_mongo(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/warehouse/quality-metrics", tags=["Quality"])
def quality_metrics():
    """Post-ETL quality metrics from the warehouse itself."""
    metrics = {}
    try:
        conn = _dw()
        metrics["dim_user_total"]           = conn.execute("SELECT COUNT(*) FROM dim_user").fetchone()[0]
        metrics["dim_user_no_skills"]       = conn.execute("SELECT COUNT(*) FROM dim_user WHERE total_skills = 0").fetchone()[0]
        metrics["fact_apps_total"]          = conn.execute("SELECT COUNT(*) FROM fact_applications").fetchone()[0]
        metrics["fact_apps_null_user"]      = conn.execute("SELECT COUNT(*) FROM fact_applications WHERE user_key IS NULL").fetchone()[0]
        metrics["fact_quiz_total"]          = conn.execute("SELECT COUNT(*) FROM fact_quiz_attempts").fetchone()[0]
        metrics["fact_quiz_score_outliers"] = conn.execute("SELECT COUNT(*) FROM fact_quiz_attempts WHERE score_percent > 100 OR score_percent < 0").fetchone()[0]
        metrics["dim_skill_total"]          = conn.execute("SELECT COUNT(*) FROM dim_skill").fetchone()[0]
        metrics["bridge_user_skill_total"]  = conn.execute("SELECT COUNT(*) FROM bridge_user_skill").fetchone()[0]
        conn.close()
    except Exception as e:
        metrics["error"] = str(e)
    return metrics

# ─── Schema introspection ──────────────────────────────────────────────────────
@app.get("/warehouse/schema", tags=["Meta"])
def warehouse_schema():
    """Return list of all tables and row counts."""
    tables = [
        "bronze_users", "bronze_jobs", "bronze_companies",
        "bronze_applications", "bronze_quiz_attempts", "bronze_parsed_resumes",
        "dim_date", "dim_user", "dim_job", "dim_company", "dim_skill",
        "fact_applications", "fact_quiz_attempts", "fact_resume_screening",
        "bridge_user_skill"
    ]
    result = {}
    conn = _dw()
    for t in tables:
        try:
            cnt = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            result[t] = cnt
        except:
            result[t] = "N/A"
    conn.close()
    return result
