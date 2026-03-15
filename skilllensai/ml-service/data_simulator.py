"""
data_simulator.py
=================
Synthetic SkillLens AI data generator.
Generates realistic candidates, job applications, quiz attempts, and
parsed resume records at a configurable interval and inserts them
directly into the MongoDB database.

Usage (standalone):
    python data_simulator.py --interval 120 --count 3

Or import and call start_simulation() / stop_simulation() from app.py.
"""

import os
import random
import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Optional

from faker import Faker
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from bson import ObjectId

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SIMULATOR] %(message)s")
logger = logging.getLogger(__name__)

fake = Faker()

# ─── MongoDB connection ───────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb+srv://hkpatel:hk123456@hk.ooffpcl.mongodb.net/kenexai?retryWrites=true&w=majority")

def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return client["skilllensai"]

# ─── Static domain data for realism ──────────────────────────────────────────
TECH_SKILLS = [
    "python", "java", "javascript", "typescript", "sql", "react", "node",
    "express", "django", "flask", "mongodb", "postgresql", "mysql", "redis",
    "docker", "kubernetes", "aws", "azure", "gcp", "spark", "kafka", "airflow",
    "machine learning", "deep learning", "scikit-learn", "pandas", "numpy",
    "tensorflow", "pytorch", "nlp", "data engineering", "etl", "tableau",
    "power bi", "git", "linux", "rest api", "graphql", "ci/cd", "terraform"
]

JOB_ROLES = [
    "Data Engineer", "Software Engineer", "Data Scientist",
    "Backend Developer", "Frontend Developer", "DevOps Engineer",
    "ML Engineer", "Full Stack Developer", "Cloud Engineer", "Data Analyst"
]

EDUCATION_LEVELS = ["BTech", "MTech", "BSc", "MBA", "MCA", "BCA", "PhD"]

EXPERIENCE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10]

# ─── Simulator state ──────────────────────────────────────────────────────────
_simulation_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_stats = {
    "running": False,
    "started_at": None,
    "records_generated": 0,
    "interval_seconds": 120,
    "batch_size": 3,
    "last_batch_at": None,
}

# ─── Synthetic record generators ─────────────────────────────────────────────

def _random_skills(min_count: int = 3, max_count: int = 10):
    return random.sample(TECH_SKILLS, k=random.randint(min_count, max_count))


def generate_synthetic_user(db) -> Optional[ObjectId]:
    """Insert a synthetic candidate (User document) and return its _id."""
    try:
        skills = _random_skills()
        exp_level = random.choice(EXPERIENCE_LEVELS)
        edu_level = random.choice(EDUCATION_LEVELS)
        first = fake.first_name()
        last = fake.last_name()

        user_doc = {
            "_id": ObjectId(),
            "fullName": f"{first} {last}",
            "username": fake.user_name()[:20],
            "email": fake.unique.email(),
            "password": "hashed_placeholder",
            "role": "student",
            "skills": skills,
            "primaryLocation": fake.city(),
            "experienceLevel": exp_level,
            "preferredRole": random.choice(JOB_ROLES),
            "education": [{
                "level": edu_level,
                "institution": fake.company() + " University",
                "cgpa": round(random.uniform(6.0, 9.5), 2),
                "endYear": random.randint(2015, 2024),
            }],
            "experience": [{
                "company": fake.company(),
                "role": random.choice(JOB_ROLES),
                "startDate": datetime.now() - timedelta(days=random.randint(365, 1825)),
                "currentlyWorking": random.choice([True, False]),
            }] if exp_level > 0 else [],
            "resumeFilePath": None,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "__v": 0,
            "_synthetic": True,  # flag for easy cleanup
        }
        db["users"].insert_one(user_doc)
        logger.info(f"  → User created: {user_doc['fullName']} ({user_doc['email']})")
        return user_doc["_id"]
    except Exception as e:
        logger.warning(f"  ✗ Failed to create user: {e}")
        return None


def generate_synthetic_parsed_resume(db, user_id: ObjectId, skills: list):
    """Insert a synthetic ParsedResume for the given user."""
    try:
        exp = random.choice(EXPERIENCE_LEVELS)
        role = random.choice(JOB_ROLES)
        doc = {
            "_id": ObjectId(),
            "userId": user_id,
            "applicationId": None,
            "name": fake.name(),
            "email": fake.email(),
            "phone": fake.phone_number()[:15],
            "skills": skills,
            "experience_years": exp,
            "experience": [{
                "company": fake.company(),
                "role": role,
                "duration": f"{random.randint(2015,2022)} – {random.randint(2022,2024)}",
            }] if exp > 0 else [],
            "education": [{
                "degree": random.choice(EDUCATION_LEVELS),
                "institution": fake.company() + " University",
                "year": random.randint(2015, 2024),
                "cgpa": round(random.uniform(6.0, 9.5), 2),
            }],
            "certifications": random.sample(
                ["AWS Certified", "Azure Certified", "GCP Certified", "PMP", "Scrum Master"],
                k=random.randint(0, 2)
            ),
            "resume_text": f"Synthetic resume for {role} with skills: {', '.join(skills)}",
            "resume_file_path": None,
            "job_role_predicted": role,
            "parsed_at": datetime.now(),
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "_synthetic": True,
        }
        db["parsedresumes"].insert_one(doc)
        logger.info(f"  → ParsedResume created for userId={user_id}, role={role}")
    except Exception as e:
        logger.warning(f"  ✗ Failed to create ParsedResume: {e}")


def generate_synthetic_application(db, user_id: ObjectId) -> Optional[ObjectId]:
    """Create a synthetic job application attached to a real or synthetic job."""
    try:
        # Try to pick a real job; if none, skip application
        jobs = list(db["jobroles"].find({}, {"_id": 1, "title": 1, "companyId": 1}).limit(20))
        if not jobs:
            logger.info("  ↷ No jobs found in DB, skipping application creation")
            return None

        job = random.choice(jobs)
        doc = {
            "_id": ObjectId(),
            "userId": user_id,
            "jobId": job["_id"],
            "companyId": job.get("companyId"),
            "status": random.choice(["applied", "reviewing", "shortlisted", "rejected"]),
            "coverLetter": fake.paragraph(nb_sentences=3),
            "quizScore": None,
            "resumeFilePath": None,
            "appliedAt": datetime.now(),
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "_synthetic": True,
        }
        db["applications"].insert_one(doc)
        logger.info(f"  → Application created: userId={user_id} → job '{job.get('title', '?')}'")
        return doc["_id"]
    except Exception as e:
        logger.warning(f"  ✗ Failed to create application: {e}")
        return None


def generate_synthetic_quiz_attempt(db, user_id: ObjectId, skills: list):
    """Create a synthetic quiz attempt record."""
    try:
        total_marks = random.choice([50, 75, 100])
        obtained = random.randint(int(total_marks * 0.3), total_marks)
        doc = {
            "_id": ObjectId(),
            "userId": user_id,
            "quizName": f"{random.choice(skills).title()} Assessment",
            "skills": skills[:3],
            "questionSet": [],
            "totalMarks": total_marks,
            "obtainedMarks": obtained,
            "percentage": round((obtained / total_marks) * 100, 1),
            "status": "submitted",
            "startedAt": datetime.now() - timedelta(minutes=random.randint(10, 60)),
            "submittedAt": datetime.now(),
            "createdAt": datetime.now(),
            "_synthetic": True,
        }
        db["quizattempts"].insert_one(doc)
        logger.info(f"  → QuizAttempt created: userId={user_id}, score={obtained}/{total_marks}")
    except Exception as e:
        logger.warning(f"  ✗ Failed to create QuizAttempt: {e}")


# ─── Batch generation ─────────────────────────────────────────────────────────

def run_one_batch(batch_size: int = 3):
    """Generate one batch of synthetic records across all collections."""
    try:
        db = get_db()
    except ConnectionFailure as e:
        logger.error(f"Cannot connect to MongoDB: {e}")
        return 0

    generated = 0
    for i in range(batch_size):
        logger.info(f"Generating synthetic record {i+1}/{batch_size}...")
        user_id = generate_synthetic_user(db)
        if user_id is None:
            continue

        # Fetch the skills we just stored for this user
        user = db["users"].find_one({"_id": user_id}, {"skills": 1})
        skills = user.get("skills", _random_skills()) if user else _random_skills()

        generate_synthetic_parsed_resume(db, user_id, skills)
        generate_synthetic_application(db, user_id)
        generate_synthetic_quiz_attempt(db, user_id, skills)
        generated += 1

    _stats["records_generated"] += generated
    _stats["last_batch_at"] = datetime.now().isoformat()
    logger.info(f"✓ Batch complete — {generated} candidate profiles generated.")
    return generated


# ─── Scheduler loop ───────────────────────────────────────────────────────────

def _simulation_loop(interval: int, batch_size: int):
    logger.info(f"Simulation started — interval={interval}s, batch_size={batch_size}")
    while not _stop_event.is_set():
        run_one_batch(batch_size)
        _stop_event.wait(timeout=interval)
    logger.info("Simulation stopped.")


def start_simulation(interval_seconds: int = 120, batch_size: int = 3):
    global _simulation_thread
    if _stats["running"]:
        return {"status": "already_running", **_stats}

    _stop_event.clear()
    _stats.update({
        "running": True,
        "started_at": datetime.now().isoformat(),
        "interval_seconds": interval_seconds,
        "batch_size": batch_size,
    })
    _simulation_thread = threading.Thread(
        target=_simulation_loop,
        args=(interval_seconds, batch_size),
        daemon=True,
    )
    _simulation_thread.start()
    return {"status": "started", **_stats}


def stop_simulation():
    _stop_event.set()
    _stats["running"] = False
    return {"status": "stopped", **_stats}


def get_simulation_status():
    return {"status": "running" if _stats["running"] else "stopped", **_stats}


def purge_synthetic_data():
    """Remove all documents flagged as _synthetic=True."""
    try:
        db = get_db()
        results = {}
        for col in ["users", "parsedresumes", "applications", "quizattempts"]:
            r = db[col].delete_many({"_synthetic": True})
            results[col] = r.deleted_count
        logger.info(f"Purged synthetic data: {results}")
        return {"status": "purged", "deleted": results}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="SkillLens AI Data Simulator")
    parser.add_argument("--interval", type=int, default=120, help="Seconds between batches")
    parser.add_argument("--count", type=int, default=3, help="Records per batch")
    parser.add_argument("--once", action="store_true", help="Run one batch then exit")
    parser.add_argument("--purge", action="store_true", help="Purge synthetic data and exit")
    args = parser.parse_args()

    if args.purge:
        print(purge_synthetic_data())
    elif args.once:
        print(f"Running one batch of {args.count} records...")
        run_one_batch(args.count)
    else:
        start_simulation(args.interval, args.count)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop_simulation()
            print("Simulation stopped.")
