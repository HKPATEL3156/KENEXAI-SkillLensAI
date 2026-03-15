# library for api
from fastapi import FastAPI, Query  # type: ignore
from pydantic import BaseModel  # type: ignore
import pdfplumber  # type: ignore
import os
import re
from typing import List, Optional, Any, Dict
import joblib  # type: ignore
import pandas as pd  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
import sys
import types

# Load .env (initial load at startup)
from dotenv import load_dotenv, dotenv_values  # type: ignore
load_dotenv(override=True)

from openai import OpenAI  # type: ignore

def get_openrouter_key() -> str:
    """Re-read .env on every call so key changes work without restart."""
    fresh = dotenv_values()
    return fresh.get("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY", "")  # type: ignore[return-value]

app = FastAPI(title="SkillLens AI ML Service", version="2.0.0")  # create app with fastapi

# Enable CORS for development (frontend will call this service directly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# request model
class filedata(BaseModel):
    filepath: str  # path from backend


# Provide a simple tokenize function so pickled models that reference
# `tokenize` in __main__ can load. This is a fallback shim; for
# production the original tokenizer used during training should be
# included or the model should be exported as a self-contained pipeline.
def tokenize(x):
    try:
        if x is None:
            return []
        if isinstance(x, str):
            return x.split()
        return x
    except Exception:
        return x


# Prediction request for job role suggestion
class PredictRequest(BaseModel):
    skills: List[str]
    qualification: str
    experience_years: Optional[float] = 0.0


@app.post("/predict-role")
def predict_role(req: PredictRequest):
    # load model and label encoder from notebooks folder
    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, "notebooks", "job_role_model.pkl")
    le_path = os.path.join(base_dir, "notebooks", "label_encoder.pkl")

    if not os.path.exists(model_path) or not os.path.exists(le_path):
        return {"role": None, "error": "Model not found on server"}

    try:
        # Ensure a `tokenize` symbol is present on the `__main__` module
        # since some pickled models reference functions defined in __main__.
        # We create or reuse the __main__ module and attach our simple shim.
        main_mod = sys.modules.get('__main__')
        if main_mod is None:
            main_mod = types.ModuleType('__main__')
            sys.modules['__main__'] = main_mod
        if not hasattr(main_mod, 'tokenize'):
            setattr(main_mod, 'tokenize', tokenize)

        model = joblib.load(model_path)
        label_encoder = joblib.load(le_path)
    except Exception as e:
        return {"role": None, "error": f"Failed to load model: {str(e)}"}

    # prepare input dataframe expected by the pipeline
    skills_str = ", ".join(req.skills or [])

    # map experience years to categorical level expected by the model
    years = float(req.experience_years or 0)
    if years > 5:
        exp_level = "Senior"
    elif years > 3:
        exp_level = "Mid"
    else:
        exp_level = "Entry"

    df = pd.DataFrame({
        "skills": [skills_str],
        "qualification": [req.qualification or ""],
        "experience_level": [exp_level],
    })

    try:
        pred = model.predict(df)
        label = label_encoder.inverse_transform(pred)[0]
        return {"role": label}
    except Exception as e:
        return {"role": None, "error": f"Prediction error: {str(e)}"}


# complete tech skill list
skill_list = [
    # programming languages
    "python", "java", "c", "c++", "c#", "javascript", "typescript", "go", "rust", "php", "ruby", "kotlin", "swift", "sql",

    # databases & queries
    "mysql", "postgresql", "mongodb", "firebase", "redis", "oracle", "sqlite", "queries", "joins", "indexing", "data verification",

    # data engineering
    "data engineering", "data pipelines", "etl", "etl processes", "data ingestion", "data transformation", "data validation", "data pipeline",
    "hadoop", "spark", "airflow", "kafka", "etl",

    # visualization & BI
    "power bi", "powerbi", "microsoft excel", "excel", "google looker studio", "looker studio", "tableau", "metabase",

    # frontend
    "html", "css", "bootstrap", "tailwind", "sass", "react", "nextjs", "vue", "angular", "redux",

    # backend
    "node", "express", "django", "flask", "spring boot", "asp.net", "laravel", "rest api", "graphql",

    # fullstack / stacks
    "mern", "mean", "mevn", "rest api", "graphql", "jwt", "authentication", "authorization",

    # devops & cloud
    "docker", "kubernetes", "jenkins", "git", "github", "gitlab", "ci/cd", "aws", "azure", "gcp", "s3", "ec2", "iam", "nginx", "linux", "terraform", "ansible",

    # machine learning & data science
    "machine learning", "deep learning", "data science", "data analysis", "pandas", "numpy", "scikit-learn", "scikit learn", "tensorflow", "keras", "pytorch",
    "nlp", "natural language processing", "computer vision", "opencv", "xgboost", "lightgbm",

    # ai tools
    "openai", "gemini", "llm", "langchain", "huggingface", "transformers",

    # cybersecurity
    "cybersecurity", "ethical hacking", "penetration testing", "network security", "cryptography", "firewall", "siem", "kali linux",

    # cloud concepts
    "cloud computing", "serverless", "microservices", "s3", "ec2", "iam",

    # mobile
    "react native", "flutter", "android", "ios",

    # blockchain
    "blockchain", "solidity", "web3",

    # testing
    "jest", "mocha", "selenium", "cypress", "unit testing",

    # core concepts & data modeling
    "data modeling", "schema design", "data quality", "data quality checks", "debugging", "documentation",

    # tools & methodologies
    "jira", "notion", "agile", "scrum", "sdlc",

    # soft skills
    "problem solving", "teamwork", "communication", "leadership",
]



# extract text from pdf
def extract_text(path):
    text = ""  # empty text
    with pdfplumber.open(path) as pdf:  # open pdf
        for page in pdf.pages:  # loop pages
            page_text = page.extract_text()  # get page text
            if page_text:
                text += page_text + " "  # add space
    return text.lower()  # convert to lowercase


# skill matching using regex
def find_skill(text):
    found_skill = []  # store skills

    for skill in skill_list:
        pattern = r"\b" + re.escape(skill) + r"\b"  # exact match
        if re.search(pattern, text):
            found_skill.append(skill)

    return list(set(found_skill))  # remove duplicate


# api route
@app.post("/extract-skills")
def extract_skill(data: filedata):

    # backend root path
    base_path = os.path.abspath("../backend")

    # full resume path
    full_path = os.path.join(base_path, data.filepath)

    # check file exist
    if not os.path.exists(full_path):
        return {"skills": []}

    # extract resume text
    text = extract_text(full_path)

    # find skills
    skills = find_skill(text)

    return {"skills": skills}


# ─────────────────────────────────────────────────────────────────────────────
# DATA SIMULATION ROUTES
# Import simulator lazily so the service still starts if pymongo/faker are missing
# ─────────────────────────────────────────────────────────────────────────────
try:
    import data_simulator as _sim

    class SimulateStartRequest(BaseModel):
        interval_seconds: int = 120  # seconds between batches
        batch_size: int = 3          # synthetic candidates per batch

    @app.post("/simulate/start", tags=["Simulation"])
    def simulate_start(req: SimulateStartRequest):
        """Start the background data simulation loop."""
        return _sim.start_simulation(req.interval_seconds, req.batch_size)

    @app.post("/simulate/stop", tags=["Simulation"])
    def simulate_stop():
        """Stop the running simulation."""
        return _sim.stop_simulation()

    @app.get("/simulate/status", tags=["Simulation"])
    def simulate_status():
        """Return current simulation status and stats."""
        return _sim.get_simulation_status()

    @app.post("/simulate/run-once", tags=["Simulation"])
    def simulate_run_once(batch_size: int = Query(default=3, ge=1, le=50)):
        """Run one immediate batch (without starting the loop)."""
        generated = _sim.run_one_batch(batch_size)
        return {"status": "ok", "generated": generated}

    @app.delete("/simulate/purge", tags=["Simulation"])
    def simulate_purge():
        """Delete all synthetic (_synthetic=True) documents from the DB."""
        return _sim.purge_synthetic_data()

except ImportError as _e:
    import warnings
    warnings.warn(f"data_simulator not available ({_e}). Simulation routes disabled.")

# ── Gemini RAG Chat Endpoint ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    role: str = "candidate"   # "candidate" or "recruiter"
    context: Dict[str, Any] = {}


def build_system_prompt(role: str, context: dict) -> str:
    """Build a role-specific system prompt with context embedded as readable text."""
    if role == "recruiter":
        company = context.get("company_name", "your company")
        jobs = context.get("active_jobs", [])
        candidates = context.get("candidates", [])

        jobs_text = "\n".join(
            f"- {j.get('title','?')} | Skills: {', '.join(j.get('skills',[]))} | Min exp: {j.get('min_experience',0)} yrs"
            for j in jobs
        ) or "No active jobs."

        cands_text = "\n".join(
            (
                f"- {c.get('name','?')} | Skills: {', '.join(c.get('skills',[])[:8])} | "
                f"Exp: {c.get('experience_years',0)} yrs | "
                f"Predicted role: {c.get('predicted_role','unknown')} | "
                f"Certifications: {len(c.get('certifications',[]))}"
            )
            for c in candidates
        ) or "No candidate data yet."

        return (
            f"You are a smart recruitment assistant for {company}. "
            f"Help the recruiter make data-driven hiring decisions.\n\n"
            f"ACTIVE JOB ROLES:\n{jobs_text}\n\n"
            f"CANDIDATE POOL ({len(candidates)} candidates):\n{cands_text}\n\n"
            f"Answer concisely and factually based only on the data above. "
            f"If comparing candidates, rank them clearly."
        )
    else:
        # candidate persona
        profile = context.get("profile", {})
        parsed = context.get("parsed_resume", {})
        jobs = context.get("available_jobs", [])

        name = profile.get("name", "the candidate")
        skills = profile.get("skills", []) or (parsed or {}).get("skills", [])
        exp_years = profile.get("experience_years", 0) or (parsed or {}).get("experience_years", 0)
        predicted_role = (parsed or {}).get("job_role_predicted", "unknown")
        education = profile.get("education", [])
        edu_text = ", ".join(
            f"{e.get('level',e.get('degree',''))} from {e.get('institution','')}"
            for e in education[:2]
            if e.get("institution")
        ) or "Not specified"

        resume_text = (parsed or {}).get("resume_text", "")
        resume_snippet = resume_text[:800] if resume_text else "Not available"  # type: ignore[index]

        jobs_text = "\n".join(
            f"- {j.get('title','?')} @ {j.get('company','?')} | Skills: {', '.join(j.get('skills',[]))} | Min exp: {j.get('min_experience',0)} yrs"
            for j in jobs[:10]
        ) or "No jobs available."

        return (
            f"You are a helpful AI career assistant for {name}.\n\n"
            f"CANDIDATE PROFILE:\n"
            f"- Name: {name}\n"
            f"- Skills: {', '.join(skills[:15]) or 'None listed'}\n"  # type: ignore[index]
            f"- Experience: {exp_years} years\n"
            f"- Education: {edu_text}\n"
            f"- Predicted role: {predicted_role}\n"
            f"- Resume excerpt: {resume_snippet}\n\n"
            f"AVAILABLE JOBS ON PLATFORM:\n{jobs_text}\n\n"
            f"Give personalised, actionable career advice. Be concise and encouraging."
        )


@app.post("/chat")
def chat(req: ChatRequest):
    # Re-read key from .env on every request so changes work without restart
    api_key = get_openrouter_key()
    if not api_key:
        return {"reply": None, "error": "OPENROUTER_API_KEY not configured in ml-service/.env"}

    context = req.context or {}
    system_prompt = build_system_prompt(req.role, context)

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )

        response = client.chat.completions.create(
            model="mistralai/mistral-small-3.1-24b-instruct:free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": req.message},
            ],
            temperature=0.7,
            max_tokens=1024,
        )

        reply = response.choices[0].message.content or "I couldn't generate a response. Please try again."
        return {"reply": reply.strip()}

    except Exception as e:
        err_str = str(e)
        import traceback
        traceback.print_exc()
        if "429" in err_str or "rate" in err_str.lower() or "quota" in err_str.lower():
            return {"reply": None, "error": "RATE_LIMITED: " + err_str}
        return {"reply": None, "error": err_str}
