
-- ─────────────────────────────────────────────────────────────────────────────
-- BRONZE LAYER: raw staging from MongoDB extracts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bronze_users (
    _id             VARCHAR PRIMARY KEY,
    full_name       VARCHAR,
    email           VARCHAR,
    role            VARCHAR,
    location        VARCHAR,
    skills          VARCHAR,         -- JSON array as string
    experience_level INTEGER,
    preferred_role  VARCHAR,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    is_synthetic    BOOLEAN DEFAULT FALSE,
    _loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze_jobs (
    _id             VARCHAR PRIMARY KEY,
    title           VARCHAR,
    company_id      VARCHAR,
    skills          VARCHAR,         -- JSON array as string
    min_exp_years   INTEGER,
    status          VARCHAR,
    created_at      TIMESTAMP,
    _loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze_companies (
    _id             VARCHAR PRIMARY KEY,
    company_name    VARCHAR,
    email           VARCHAR,
    status          VARCHAR,
    created_at      TIMESTAMP,
    _loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze_applications (
    _id             VARCHAR PRIMARY KEY,
    user_id         VARCHAR,
    job_id          VARCHAR,
    company_id      VARCHAR,
    status          VARCHAR,
    quiz_score      DOUBLE,
    applied_at      TIMESTAMP,
    is_synthetic    BOOLEAN DEFAULT FALSE,
    _loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze_quiz_attempts (
    _id             VARCHAR PRIMARY KEY,
    user_id         VARCHAR,
    quiz_name       VARCHAR,
    skills          VARCHAR,         -- JSON array as string
    total_marks     INTEGER,
    obtained_marks  INTEGER,
    percentage      DOUBLE,
    status          VARCHAR,
    submitted_at    TIMESTAMP,
    is_synthetic    BOOLEAN DEFAULT FALSE,
    _loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze_parsed_resumes (
    _id                 VARCHAR PRIMARY KEY,
    user_id             VARCHAR,
    name                VARCHAR,
    email               VARCHAR,
    skills              VARCHAR,     -- JSON array as string
    experience_years    DOUBLE,
    education           VARCHAR,     -- JSON array as string
    certifications      VARCHAR,     -- JSON array as string
    job_role_predicted  VARCHAR,
    parsed_at           TIMESTAMP,
    is_synthetic        BOOLEAN DEFAULT FALSE,
    _loaded_at          TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SILVER LAYER: cleaned dimensional tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Date dimension (date spine)
CREATE TABLE IF NOT EXISTS dim_date (
    date_key        INTEGER PRIMARY KEY,   -- YYYYMMDD
    full_date       DATE,
    day_of_week     VARCHAR,
    day_num         INTEGER,
    week_num        INTEGER,
    month_num       INTEGER,
    month_name      VARCHAR,
    quarter         INTEGER,
    year            INTEGER,
    is_weekend      BOOLEAN
);

-- User dimension
CREATE TABLE IF NOT EXISTS dim_user (
    user_key        VARCHAR PRIMARY KEY,   -- MongoDB _id
    full_name       VARCHAR,
    email           VARCHAR,
    role            VARCHAR,
    location        VARCHAR,
    experience_level INTEGER,
    preferred_role  VARCHAR,
    total_skills    INTEGER,
    created_date_key INTEGER,              -- FK → dim_date
    is_synthetic    BOOLEAN DEFAULT FALSE,
    _updated_at     TIMESTAMP DEFAULT NOW()
);

-- Job dimension
CREATE TABLE IF NOT EXISTS dim_job (
    job_key         VARCHAR PRIMARY KEY,
    title           VARCHAR,
    company_key     VARCHAR,
    min_exp_years   INTEGER,
    required_skill_count INTEGER,
    status          VARCHAR,
    created_date_key INTEGER,
    _updated_at     TIMESTAMP DEFAULT NOW()
);

-- Company dimension
CREATE TABLE IF NOT EXISTS dim_company (
    company_key     VARCHAR PRIMARY KEY,
    company_name    VARCHAR,
    email           VARCHAR,
    status          VARCHAR,
    onboarded_date_key INTEGER,
    _updated_at     TIMESTAMP DEFAULT NOW()
);

-- Skill dimension (one row per unique skill)
CREATE TABLE IF NOT EXISTS dim_skill (
    skill_key       INTEGER PRIMARY KEY,
    skill_name      VARCHAR UNIQUE,
    skill_category  VARCHAR            -- e.g. 'language', 'cloud', 'ml', 'devops'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GOLD LAYER: fact tables (one row per business event)
-- ─────────────────────────────────────────────────────────────────────────────

-- Fact: job applications
CREATE TABLE IF NOT EXISTS fact_applications (
    application_key     VARCHAR PRIMARY KEY,
    user_key            VARCHAR,         -- FK → dim_user
    job_key             VARCHAR,         -- FK → dim_job
    company_key         VARCHAR,         -- FK → dim_company
    applied_date_key    INTEGER,         -- FK → dim_date
    status              VARCHAR,
    quiz_score          DOUBLE,
    is_shortlisted      BOOLEAN,
    is_rejected         BOOLEAN,
    is_synthetic        BOOLEAN DEFAULT FALSE,
    _loaded_at          TIMESTAMP DEFAULT NOW()
);

-- Fact: quiz attempts
CREATE TABLE IF NOT EXISTS fact_quiz_attempts (
    attempt_key         VARCHAR PRIMARY KEY,
    user_key            VARCHAR,         -- FK → dim_user
    submitted_date_key  INTEGER,         -- FK → dim_date
    quiz_name           VARCHAR,
    total_marks         INTEGER,
    obtained_marks      INTEGER,
    score_percent       DOUBLE,
    passed              BOOLEAN,         -- score >= 60%
    is_synthetic        BOOLEAN DEFAULT FALSE,
    _loaded_at          TIMESTAMP DEFAULT NOW()
);

-- Fact: resume screening
CREATE TABLE IF NOT EXISTS fact_resume_screening (
    screening_key       VARCHAR PRIMARY KEY,
    user_key            VARCHAR,         -- FK → dim_user
    job_key             VARCHAR,         -- FK → dim_job
    screened_date_key   INTEGER,         -- FK → dim_date
    predicted_role      VARCHAR,
    skill_score         DOUBLE,
    experience_score    DOUBLE,
    role_score          DOUBLE,
    education_score     DOUBLE,
    total_score         DOUBLE,
    fit_label           VARCHAR,          -- Excellent/Good/Moderate/Low Fit
    is_synthetic        BOOLEAN DEFAULT FALSE,
    _loaded_at          TIMESTAMP DEFAULT NOW()
);

-- Bridge: user × skill (many-to-many)
CREATE TABLE IF NOT EXISTS bridge_user_skill (
    user_key    VARCHAR,
    skill_key   INTEGER,
    source      VARCHAR,   -- 'resume' | 'profile' | 'quiz'
    PRIMARY KEY (user_key, skill_key, source)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GOLD LAYER: KPI views (pre-aggregated for dashboards)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vw_platform_summary AS
SELECT
    (SELECT COUNT(*) FROM dim_user WHERE role = 'student') AS total_candidates,
    (SELECT COUNT(*) FROM dim_company)                     AS total_companies,
    (SELECT COUNT(*) FROM fact_applications)               AS total_applications,
    (SELECT COUNT(*) FROM fact_quiz_attempts)              AS total_quiz_attempts,
    (SELECT ROUND(AVG(score_percent), 1) FROM fact_quiz_attempts WHERE score_percent IS NOT NULL)
                                                           AS avg_quiz_score,
    (SELECT COUNT(*) FROM fact_resume_screening)           AS total_screenings,
    (SELECT ROUND(AVG(total_score), 1) FROM fact_resume_screening WHERE total_score IS NOT NULL)
                                                           AS avg_screening_score;

CREATE OR REPLACE VIEW vw_monthly_applications AS
SELECT
    d.year, d.month_num, d.month_name,
    COUNT(*)                              AS applications,
    COUNT(CASE WHEN fa.is_shortlisted THEN 1 END) AS shortlisted,
    COUNT(CASE WHEN fa.is_rejected    THEN 1 END) AS rejected
FROM fact_applications fa
JOIN dim_date d ON fa.applied_date_key = d.date_key
GROUP BY d.year, d.month_num, d.month_name
ORDER BY d.year, d.month_num;

CREATE OR REPLACE VIEW vw_top_skills AS
SELECT
    s.skill_name,
    COUNT(DISTINCT bus.user_key) AS user_count
FROM bridge_user_skill bus
JOIN dim_skill s ON bus.skill_key = s.skill_key
GROUP BY s.skill_name
ORDER BY user_count DESC
LIMIT 20;

CREATE OR REPLACE VIEW vw_top_candidates AS
SELECT
    u.full_name,
    u.email,
    u.preferred_role,
    u.experience_level,
    AVG(qa.score_percent)   AS avg_quiz_score,
    MAX(rs.total_score)     AS best_resume_score
FROM dim_user u
LEFT JOIN fact_quiz_attempts qa  ON u.user_key = qa.user_key
LEFT JOIN fact_resume_screening rs ON u.user_key = rs.user_key
WHERE qa.user_key IS NOT NULL
GROUP BY u.user_key, u.full_name, u.email, u.preferred_role, u.experience_level
ORDER BY avg_quiz_score DESC
LIMIT 50;

CREATE OR REPLACE VIEW vw_fit_label_distribution AS
SELECT
    fit_label,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM fact_resume_screening
GROUP BY fit_label
ORDER BY count DESC;
