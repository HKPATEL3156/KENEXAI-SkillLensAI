"""
etl.py — SkillLens AI Data Warehouse ETL Pipeline
===================================================
Extracts data from MongoDB (source), transforms it (normalize, type-cast,
handle missing values, outlier flagging) and loads it into DuckDB (warehouse).

Medallion Architecture:
  Stage 1 (Bronze): Extract raw MongoDB collections → DuckDB staging tables
  Stage 2 (Silver): Clean + normalize → dimensional tables (DimUser, DimJob…)
  Stage 3 (Gold)  : Aggregate → fact tables + populate bridge + refresh views

Run:
    python etl.py                   # full ETL run
    python etl.py --stage bronze    # only bronze stage
    python etl.py --stage silver
    python etl.py --stage gold
    python etl.py --profile         # print data quality profile and exit
"""

import os
import json
import logging
import argparse
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional

import duckdb
from pymongo import MongoClient
from bson import ObjectId

logging.basicConfig(level=logging.INFO, format="%(asctime)s [ETL] %(message)s")
logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://hkpatel:hk123456@hk.ooffpcl.mongodb.net/kenexai?retryWrites=true&w=majority")
DW_PATH   = os.environ.get("DW_PATH",   os.path.join(os.path.dirname(__file__), "skilllensai_dw.duckdb"))
SCHEMA_SQL = os.path.join(os.path.dirname(__file__), "schema.sql")

SKILL_CATEGORIES = {
    "language":  ["python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust", "php", "kotlin", "swift", "sql"],
    "cloud":     ["aws", "azure", "gcp", "s3", "ec2", "iam", "terraform", "ansible", "kubernetes", "docker"],
    "ml":        ["machine learning", "deep learning", "scikit-learn", "tensorflow", "pytorch", "nlp", "xgboost", "pandas", "numpy"],
    "data_eng":  ["spark", "kafka", "airflow", "hadoop", "etl", "data engineering", "data pipelines"],
    "frontend":  ["react", "vue", "angular", "html", "css", "bootstrap", "nextjs"],
    "backend":   ["node", "express", "django", "flask", "spring boot", "rest api", "graphql"],
    "devops":    ["git", "jenkins", "ci/cd", "linux", "nginx"],
    "bi":        ["power bi", "tableau", "looker studio", "excel"],
}

def _skill_category(skill: str) -> str:
    s = skill.lower()
    for cat, skills in SKILL_CATEGORIES.items():
        if s in skills:
            return cat
    return "other"

# ─── Helpers ─────────────────────────────────────────────────────────────────
def _str(v: Any) -> Optional[str]:
    return str(v) if v is not None else None

def _int(v: Any, default: int = 0) -> int:
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default

def _float(v: Any, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except (TypeError, ValueError):
        return default

def _ts(v: Any) -> Optional[datetime]:
    if isinstance(v, datetime): return v
    if isinstance(v, date):     return datetime(v.year, v.month, v.day)
    return None

def _date_key(dt: Optional[datetime]) -> Optional[int]:
    if dt is None: return None
    return int(dt.strftime("%Y%m%d"))

def _json(v: Any) -> str:
    if isinstance(v, (list, dict)):
        try: return json.dumps(v)
        except: return "[]"
    return _str(v) or "[]"

def _id(doc: Any) -> str:
    if isinstance(doc, dict): return _str(doc.get("_id"))
    return _str(doc)

# ─── DB connections ────────────────────────────────────────────────────────────
def get_mongo(db_name="skilllensai"):
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=6000)
    return client[db_name]

def get_dw() -> duckdb.DuckDBPyConnection:
    conn = duckdb.connect(DW_PATH)
    return conn

# ─── Schema initialisation ───────────────────────────────────────────────────
def init_schema(conn: duckdb.DuckDBPyConnection):
    logger.info("Initialising DuckDB schema…")
    with open(SCHEMA_SQL, "r", encoding="utf-8") as f:
        sql = f.read()
    try:
        conn.execute(sql)
    except Exception as e:
        logger.error(f"Schema stmt error: {e}")
        raise
    conn.commit()
    logger.info("Schema ready.")

# ─── Date dimension helper ────────────────────────────────────────────────────
def populate_date_dim(conn: duckdb.DuckDBPyConnection,
                      start: date = date(2020, 1, 1),
                      end: date = date(2027, 12, 31)):
    existing = conn.execute("SELECT COUNT(*) FROM dim_date").fetchone()[0]
    if existing > 0:
        return
    logger.info("Populating dim_date…")
    rows = []
    cur = start
    while cur <= end:
        rows.append((
            int(cur.strftime("%Y%m%d")),
            cur,
            cur.strftime("%A"),
            cur.weekday(),
            cur.isocalendar()[1],
            cur.month,
            cur.strftime("%B"),
            (cur.month - 1) // 3 + 1,
            cur.year,
            cur.weekday() >= 5,
        ))
        cur += timedelta(days=1)
    conn.executemany("""
        INSERT OR IGNORE INTO dim_date
        (date_key, full_date, day_of_week, day_num, week_num,
         month_num, month_name, quarter, year, is_weekend)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, rows)
    conn.commit()
    logger.info(f"dim_date populated: {len(rows)} rows")

# ─── DATA QUALITY PROFILING ───────────────────────────────────────────────────
def profile_mongo(db) -> Dict[str, Any]:
    """Quick data quality report from MongoDB collections."""
    report = {}
    collections = {
        "users": ["fullName", "email", "skills", "experienceLevel"],
        "applications": ["userId", "jobId", "status"],
        "quizattempts": ["userId", "obtainedMarks", "totalMarks", "status"],
        "parsedresumes": ["userId", "skills", "job_role_predicted"],
        "jobroles": ["title", "skills", "status"],
    }
    for col_name, fields in collections.items():
        col = db[col_name]
        total = col.count_documents({})
        col_report = {"total_documents": total, "fields": {}}
        for f in fields:
            null_count = col.count_documents({f: None})
            missing_count = col.count_documents({f: {"$exists": False}})
            col_report["fields"][f] = {
                "null": null_count,
                "missing": missing_count,
                "completeness_pct": round((1 - (null_count + missing_count) / max(total, 1)) * 100, 1)
            }
        report[col_name] = col_report
    return report

# ═══ STAGE 1: BRONZE (raw extraction) ═══════════════════════════════════════
def stage_bronze(db, conn: duckdb.DuckDBPyConnection):
    logger.info("=== STAGE 1: BRONZE EXTRACTION ===")

    # ── Users ──────────────────────────────────────────────────────────────────
    logger.info("Extracting users…")
    users = list(db["users"].find({}))
    conn.execute("DELETE FROM bronze_users")
    if users:
        rows = [(
            _str(u["_id"]),
            u.get("fullName") or u.get("username"),
            u.get("email"),
            u.get("role", "student"),
            u.get("primaryLocation"),
            _json(u.get("skills", [])),
            _int(u.get("experienceLevel")),
            u.get("preferredRole"),
            _ts(u.get("createdAt")),
            _ts(u.get("updatedAt")),
            bool(u.get("_synthetic", False)),
        ) for u in users]
        conn.executemany("""
            INSERT OR REPLACE INTO bronze_users 
            (_id, full_name, email, role, location, skills, experience_level, preferred_role, created_at, updated_at, is_synthetic) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, rows)
    logger.info(f"  → {len(users)} users staged")

    # ── Jobs ───────────────────────────────────────────────────────────────────
    logger.info("Extracting jobs…")
    jobs = list(db["jobroles"].find({}))
    conn.execute("DELETE FROM bronze_jobs")
    if jobs:
        rows = [(
            _str(j["_id"]),
            j.get("title"),
            _str(j.get("companyId")),
            _json(j.get("skills", [])),
            _int(j.get("minExperienceYears")),
            j.get("status", "active"),
            _ts(j.get("createdAt")),
        ) for j in jobs]
        conn.executemany("""INSERT OR REPLACE INTO bronze_jobs 
            (_id, title, company_id, skills, min_exp_years, status, created_at) 
            VALUES (?,?,?,?,?,?,?)""", rows)
    logger.info(f"  → {len(jobs)} jobs staged")

    # ── Companies ──────────────────────────────────────────────────────────────
    logger.info("Extracting companies…")
    companies = list(db["companies"].find({}))
    conn.execute("DELETE FROM bronze_companies")
    if companies:
        rows = [(
            _str(c["_id"]),
            c.get("companyName"),
            c.get("email"),
            c.get("status", "pending"),
            _ts(c.get("createdAt")),
        ) for c in companies]
        conn.executemany("""INSERT OR REPLACE INTO bronze_companies 
            (_id, company_name, email, status, created_at) 
            VALUES (?,?,?,?,?)""", rows)
    logger.info(f"  → {len(companies)} companies staged")

    # ── Applications ───────────────────────────────────────────────────────────
    logger.info("Extracting applications…")
    apps = list(db["applications"].find({}))
    conn.execute("DELETE FROM bronze_applications")
    if apps:
        rows = [(
            _str(a["_id"]),
            _str(a.get("userId")),
            _str(a.get("jobId")),
            _str(a.get("companyId")),
            a.get("status", "applied"),
            _float(a.get("quizScore")),
            _ts(a.get("appliedAt") or a.get("createdAt")),
            bool(a.get("_synthetic", False)),
        ) for a in apps]
        conn.executemany("""INSERT OR REPLACE INTO bronze_applications 
            (_id, user_id, job_id, company_id, status, quiz_score, applied_at, is_synthetic) 
            VALUES (?,?,?,?,?,?,?,?)""", rows)
    logger.info(f"  → {len(apps)} applications staged")

    # ── Quiz Attempts ──────────────────────────────────────────────────────────
    logger.info("Extracting quiz attempts…")
    attempts = list(db["quizattempts"].find({}))
    conn.execute("DELETE FROM bronze_quiz_attempts")
    if attempts:
        rows = [(
            _str(a["_id"]),
            _str(a.get("userId")),
            a.get("quizName"),
            _json(a.get("skills", [])),
            _int(a.get("totalMarks", 100)),
            _int(a.get("obtainedMarks")),
            _float(a.get("percentage") or
                   (a["obtainedMarks"] / a["totalMarks"] * 100 if a.get("totalMarks") else 0)),
            a.get("status", "submitted"),
            _ts(a.get("submittedAt") or a.get("createdAt")),
            bool(a.get("_synthetic", False)),
        ) for a in attempts]
        conn.executemany("""INSERT OR REPLACE INTO bronze_quiz_attempts 
            (_id, user_id, quiz_name, skills, total_marks, obtained_marks, percentage, status, submitted_at, is_synthetic) 
            VALUES (?,?,?,?,?,?,?,?,?,?)""", rows)
    logger.info(f"  → {len(attempts)} quiz attempts staged")

    # ── Parsed Resumes ─────────────────────────────────────────────────────────
    logger.info("Extracting parsed resumes…")
    resumes = list(db["parsedresumes"].find({}))
    conn.execute("DELETE FROM bronze_parsed_resumes")
    if resumes:
        rows = [(
            _str(r["_id"]),
            _str(r.get("userId")),
            r.get("name"),
            r.get("email"),
            _json(r.get("skills", [])),
            _float(r.get("experience_years")),
            _json(r.get("education", [])),
            _json(r.get("certifications", [])),
            r.get("job_role_predicted"),
            _ts(r.get("parsed_at") or r.get("createdAt")),
            bool(r.get("_synthetic", False)),
        ) for r in resumes]
        conn.executemany("""INSERT OR REPLACE INTO bronze_parsed_resumes 
            (_id, user_id, name, email, skills, experience_years, education, certifications, job_role_predicted, parsed_at, is_synthetic) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""", rows)
    logger.info(f"  → {len(resumes)} parsed resumes staged")

    conn.commit()
    logger.info("=== BRONZE COMPLETE ===")

# ══ STAGE 2: SILVER (normalize → dimensional tables) ═════════════════════════
def stage_silver(conn: duckdb.DuckDBPyConnection):
    logger.info("=== STAGE 2: SILVER TRANSFORMATION ===")

    # ── dim_company ────────────────────────────────────────────────────────────
    conn.execute("DELETE FROM dim_company")
    conn.execute("""
        INSERT INTO dim_company
        SELECT
            _id,
            COALESCE(company_name, 'Unknown Company') AS company_name,
            COALESCE(email, 'unknown@unknown.com')    AS email,
            COALESCE(status, 'unknown')               AS status,
            CASE WHEN created_at IS NOT NULL
                 THEN CAST(STRFTIME(created_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END                    AS onboarded_date_key,
            NOW()                                     AS _updated_at
        FROM bronze_companies
    """)
    logger.info(f"  → dim_company: {conn.execute('SELECT COUNT(*) FROM dim_company').fetchone()[0]} rows")

    # ── dim_job ────────────────────────────────────────────────────────────────
    conn.execute("DELETE FROM dim_job")
    conn.execute("""
        INSERT INTO dim_job
        SELECT
            _id,
            COALESCE(title, 'Unknown Role')       AS title,
            COALESCE(company_id, '')              AS company_key,
            COALESCE(min_exp_years, 0)            AS min_exp_years,
            TRY_CAST(json_array_length(skills) AS INTEGER) AS required_skill_count,
            COALESCE(status, 'active')            AS status,
            CASE WHEN created_at IS NOT NULL
                 THEN CAST(STRFTIME(created_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END                AS created_date_key,
            NOW()
        FROM bronze_jobs
    """)
    logger.info(f"  → dim_job: {conn.execute('SELECT COUNT(*) FROM dim_job').fetchone()[0]} rows")

    # ── dim_user ───────────────────────────────────────────────────────────────
    conn.execute("DELETE FROM dim_user")
    conn.execute("""
        INSERT INTO dim_user
        SELECT
            _id,
            COALESCE(full_name, 'Anonymous')      AS full_name,
            COALESCE(email, '')                   AS email,
            COALESCE(role, 'student')             AS role,
            COALESCE(location, 'Unknown')         AS location,
            -- Outlier clamp: experience level between 0 and 40 years
            CASE WHEN experience_level < 0  THEN 0
                 WHEN experience_level > 40 THEN 40
                 ELSE COALESCE(experience_level, 0) END AS experience_level,
            preferred_role,
            TRY_CAST(json_array_length(skills) AS INTEGER) AS total_skills,
            CASE WHEN created_at IS NOT NULL
                 THEN CAST(STRFTIME(created_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END                AS created_date_key,
            is_synthetic,
            NOW()
        FROM bronze_users
    """)
    logger.info(f"  → dim_user: {conn.execute('SELECT COUNT(*) FROM dim_user').fetchone()[0]} rows")

    # ── dim_skill (upsert unique skills from all sources) ─────────────────────
    conn.execute("DELETE FROM dim_skill")
    # collect all skills from users + jobs + parsed_resumes
    user_skill_rows = conn.execute("""
        SELECT DISTINCT trim(lower(value)) AS skill
        FROM bronze_users,
             json_each(CASE WHEN skills IS NOT NULL AND skills != 'null'
                            THEN skills ELSE '[]' END)
        WHERE trim(lower(value)) != ''
    """).fetchall()
    job_skill_rows = conn.execute("""
        SELECT DISTINCT trim(lower(value)) AS skill
        FROM bronze_jobs,
             json_each(CASE WHEN skills IS NOT NULL AND skills != 'null'
                            THEN skills ELSE '[]' END)
        WHERE trim(lower(value)) != ''
    """).fetchall()
    resume_skill_rows = conn.execute("""
        SELECT DISTINCT trim(lower(value)) AS skill
        FROM bronze_parsed_resumes,
             json_each(CASE WHEN skills IS NOT NULL AND skills != 'null'
                            THEN skills ELSE '[]' END)
        WHERE trim(lower(value)) != ''
    """).fetchall()
    all_skills = list({r[0] for r in user_skill_rows + job_skill_rows + resume_skill_rows if r[0]})
    skill_rows = [(i+1, s, _skill_category(s)) for i, s in enumerate(sorted(all_skills))]
    if skill_rows:
        conn.executemany("INSERT OR IGNORE INTO dim_skill VALUES (?,?,?)", skill_rows)
    logger.info(f"  → dim_skill: {len(skill_rows)} unique skills")

    conn.commit()
    logger.info("=== SILVER COMPLETE ===")

# ══ STAGE 3: GOLD (fact tables + bridge) ══════════════════════════════════════
def stage_gold(conn: duckdb.DuckDBPyConnection):
    logger.info("=== STAGE 3: GOLD LOADING ===")

    # ── fact_applications ──────────────────────────────────────────────────────
    conn.execute("DELETE FROM fact_applications")
    conn.execute("""
        INSERT INTO fact_applications
        SELECT
            ba._id,
            ba.user_id,
            ba.job_id,
            ba.company_id,
            CASE WHEN ba.applied_at IS NOT NULL
                 THEN CAST(STRFTIME(ba.applied_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END,
            ba.status,
            -- Outlier: quiz_score should be 0-100
            CASE WHEN ba.quiz_score < 0  THEN 0
                 WHEN ba.quiz_score > 100 THEN 100
                 ELSE ba.quiz_score END  AS quiz_score,
            ba.status IN ('shortlisted', 'hired'),
            ba.status = 'rejected',
            ba.is_synthetic,
            NOW()
        FROM bronze_applications ba
    """)
    logger.info(f"  → fact_applications: {conn.execute('SELECT COUNT(*) FROM fact_applications').fetchone()[0]} rows")

    # ── fact_quiz_attempts ─────────────────────────────────────────────────────
    conn.execute("DELETE FROM fact_quiz_attempts")
    conn.execute("""
        INSERT INTO fact_quiz_attempts
        SELECT
            bq._id,
            bq.user_id,
            CASE WHEN bq.submitted_at IS NOT NULL
                 THEN CAST(STRFTIME(bq.submitted_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END,
            COALESCE(bq.quiz_name, 'Unknown Quiz'),
            COALESCE(bq.total_marks, 100),
            -- Outlier: obtained cannot exceed total
            CASE WHEN bq.obtained_marks > bq.total_marks THEN bq.total_marks
                 WHEN bq.obtained_marks < 0             THEN 0
                 ELSE COALESCE(bq.obtained_marks, 0) END,
            -- Recompute percentage cleanly
            CASE WHEN COALESCE(bq.total_marks,0) > 0
                 THEN ROUND(
                      GREATEST(0, LEAST(bq.obtained_marks, bq.total_marks))
                          * 100.0 / bq.total_marks, 1)
                 ELSE 0 END,
            COALESCE(bq.percentage, 0) >= 60,
            bq.is_synthetic,
            NOW()
        FROM bronze_quiz_attempts bq
        WHERE bq.status = 'submitted'
    """)
    logger.info(f"  → fact_quiz_attempts: {conn.execute('SELECT COUNT(*) FROM fact_quiz_attempts').fetchone()[0]} rows")

    # ── fact_resume_screening (from parsed resumes, self-join to compute score) ─
    conn.execute("DELETE FROM fact_resume_screening")
    conn.execute("""
        INSERT INTO fact_resume_screening
        SELECT
            bpr._id,
            bpr.user_id,
            NULL,             -- job_key not stored in ParsedResume
            CASE WHEN bpr.parsed_at IS NOT NULL
                 THEN CAST(STRFTIME(bpr.parsed_at, '%Y%m%d') AS INTEGER)
                 ELSE 20200101 END,
            bpr.job_role_predicted,
            NULL, NULL, NULL, NULL,  -- individual scores not in bronze (set to NULL until screenCandidates populates)
            NULL,
            NULL,
            bpr.is_synthetic,
            NOW()
        FROM bronze_parsed_resumes bpr
    """)
    logger.info(f"  → fact_resume_screening: {conn.execute('SELECT COUNT(*) FROM fact_resume_screening').fetchone()[0]} rows")

    # ── bridge_user_skill ──────────────────────────────────────────────────────
    conn.execute("DELETE FROM bridge_user_skill")
    conn.execute("""
        INSERT OR IGNORE INTO bridge_user_skill
        SELECT
            bu._id            AS user_key,
            ds.skill_key      AS skill_key,
            'resume'          AS source
        FROM bronze_parsed_resumes bu,
             json_each(CASE WHEN bu.skills IS NOT NULL AND bu.skills != 'null'
                              THEN bu.skills ELSE '[]' END) jsk
        JOIN dim_skill ds ON ds.skill_name = trim(lower(jsk.value))
        WHERE trim(lower(jsk.value)) != ''
    """)
    conn.execute("""
        INSERT OR IGNORE INTO bridge_user_skill
        SELECT
            bu._id            AS user_key,
            ds.skill_key      AS skill_key,
            'profile'         AS source
        FROM bronze_users bu,
             json_each(CASE WHEN bu.skills IS NOT NULL AND bu.skills != 'null'
                              THEN bu.skills ELSE '[]' END) jsk
        JOIN dim_skill ds ON ds.skill_name = trim(lower(jsk.value))
        WHERE trim(lower(jsk.value)) != ''
    """)
    logger.info(f"  → bridge_user_skill: {conn.execute('SELECT COUNT(*) FROM bridge_user_skill').fetchone()[0]} rows")

    conn.commit()
    logger.info("=== GOLD COMPLETE ===")


# ─── MAIN RUNNER ──────────────────────────────────────────────────────────────
def run_etl(stage: str = "all", profile_only: bool = False, ext_conn=None):
    db = get_mongo()
    conn = ext_conn if ext_conn is not None else get_dw()

    init_schema(conn)
    populate_date_dim(conn)

    if profile_only:
        report = profile_mongo(db)
        print("\n=== DATA QUALITY PROFILE ===")
        for col, info in report.items():
            print(f"\n[{col}] total={info['total_documents']}")
            for field, stats in info.get("fields", {}).items():
                print(f"  {field}: null={stats['null']}, missing={stats['missing']}, "
                      f"completeness={stats['completeness_pct']}%")
        return report

    if stage in ("all", "bronze"):
        stage_bronze(db, conn)
    if stage in ("all", "silver"):
        stage_silver(conn)
    if stage in ("all", "gold"):
        stage_gold(conn)

    # Summary
    summary = conn.execute("""
        SELECT total_candidates, total_companies, total_applications,
               total_quiz_attempts, avg_quiz_score, total_screenings
        FROM vw_platform_summary
    """).fetchone()
    logger.info(f"\n✓ ETL Complete. Warehouse Summary:")
    logger.info(f"  Candidates: {summary[0]} | Companies: {summary[1]}")
    logger.info(f"  Applications: {summary[2]} | Quiz Attempts: {summary[3]}")
    logger.info(f"  Avg Quiz Score: {summary[4]}% | Screenings: {summary[5]}")
    if ext_conn is None:
        conn.close()
    return {"status": "success"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SkillLens AI Data Warehouse ETL")
    parser.add_argument("--stage", choices=["all", "bronze", "silver", "gold"], default="all")
    parser.add_argument("--profile", action="store_true", help="Print data quality profile and exit")
    args = parser.parse_args()
    run_etl(stage=args.stage, profile_only=args.profile)
