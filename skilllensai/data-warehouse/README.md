# SkillLens AI — Data Warehouse & Simulation

## Architecture Overview

```
MongoDB (source)
     │
     ▼  [etl.py]
┌────────────────────────────────────────────────────────┐
│                 DuckDB Data Warehouse                  │
│                                                        │
│  BRONZE LAYER (staging)     SILVER LAYER (dimensions)  │
│  ├─ bronze_users            ├─ dim_user                │
│  ├─ bronze_jobs             ├─ dim_job                 │
│  ├─ bronze_companies        ├─ dim_company             │
│  ├─ bronze_applications     ├─ dim_skill               │
│  ├─ bronze_quiz_attempts    └─ dim_date                │
│  └─ bronze_parsed_resumes                              │
│                                                        │
│  GOLD LAYER (facts + views)                            │
│  ├─ fact_applications                                  │
│  ├─ fact_quiz_attempts                                 │
│  ├─ fact_resume_screening                              │
│  ├─ bridge_user_skill                                  │
│  ├─ vw_platform_summary      (KPI view)                │
│  ├─ vw_monthly_applications  (trend view)              │
│  ├─ vw_top_skills            (skill frequency)         │
│  ├─ vw_top_candidates        (leaderboard)             │
│  └─ vw_fit_label_distribution                          │
└────────────────────────────────────────────────────────┘
     │
     ▼  [server.py :8001]
Express Backend (proxy) ──► Frontend Data Warehouse Dashboard
```

## Star Schema

| Table | Type | Description |
|-------|------|-------------|
| `fact_applications` | Fact | One row per job application |
| `fact_quiz_attempts` | Fact | One row per completed quiz |
| `fact_resume_screening` | Fact | One row per parsed resume |
| `dim_user` | Dimension (SCD1) | Candidate/user profile |
| `dim_job` | Dimension (SCD1) | Job listing |
| `dim_company` | Dimension (SCD1) | Hiring company |
| `dim_skill` | Dimension | Skill reference + category |
| `dim_date` | Dimension | Date spine 2020–2027 |
| `bridge_user_skill` | Bridge | M:M user ↔ skill |

## Setup

```bash
# 1. Install dependencies
cd data-warehouse
pip install -r requirements.txt

# 2. Run ETL (MongoDB → DuckDB)
python etl.py

# 3. Start warehouse query server
uvicorn server:app --port 8001 --reload
```

## ETL Stages

| Stage | Command | What it does |
|-------|---------|-------------|
| Bronze | `python etl.py --stage bronze` | Extract raw data from MongoDB |
| Silver | `python etl.py --stage silver` | Clean + normalise → dimensions |
| Gold | `python etl.py --stage gold` | Aggregates → fact tables |
| All | `python etl.py` | Full pipeline (default) |
| Profile | `python etl.py --profile` | Data quality report |

## Data Simulator (Point 2)

```bash
# Run one batch of 5 synthetic candidates
cd ml-service
python data_simulator.py --once --count 5

# Run continuously every 60s
python data_simulator.py --interval 60 --count 3

# Purge all synthetic data
python data_simulator.py --purge
```

Or use the Admin Dashboard → 🏛️ Data Warehouse → Simulator Controls.

## API Endpoints (port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/warehouse/etl?stage=all` | Run ETL pipeline |
| GET | `/warehouse/summary` | Platform KPIs |
| GET | `/warehouse/monthly-applications` | Trend data |
| GET | `/warehouse/top-skills` | Skill frequency |
| GET | `/warehouse/fit-distribution` | Fit label distribution |
| GET | `/warehouse/data-quality` | MongoDB quality profile |
| GET | `/warehouse/quality-metrics` | Post-ETL quality check |
| GET | `/warehouse/schema` | Table row counts |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/skilllensai` | MongoDB connection |
| `DW_PATH` | `./skilllensai_dw.duckdb` | DuckDB file path |
| `DW_SERVICE_URL` | `http://localhost:8001` | Warehouse server URL |
