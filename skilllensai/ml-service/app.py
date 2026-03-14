# library for api
from fastapi import FastAPI
from pydantic import BaseModel
import pdfplumber  # library for read pdf
import os  # library for path
import re  # library for regex
from typing import List, Optional
import joblib
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import sys
import types

app = FastAPI()  # create app with fastapi

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
    "python","java","c","c++","c#","javascript","typescript","go","rust","php","ruby","kotlin","swift",

    # frontend
    "html","css","bootstrap","tailwind","sass","react","nextjs","vue","angular","redux",

    # backend
    "node","express","django","flask","spring boot","asp.net","laravel",

    # database
    "mysql","postgresql","mongodb","firebase","redis","oracle","sqlite",

    # mern stack
    "mern","rest api","graphql","jwt","authentication","authorization",

    # devops
    "docker","kubernetes","jenkins","git","github","gitlab","ci/cd",
    "aws","azure","gcp","nginx","linux","terraform","ansible",

    # machine learning
    "machine learning","deep learning","data science","data analysis",
    "pandas","numpy","scikit learn","tensorflow","keras","pytorch",
    "nlp","computer vision","opencv","xgboost","lightgbm",

    # ai tools
    "openai","gemini","llm","langchain","huggingface","transformers",

    # cybersecurity
    "cybersecurity","ethical hacking","penetration testing",
    "network security","cryptography","firewall","siem","kali linux",

    # cloud
    "cloud computing","serverless","microservices",

    # mobile
    "react native","flutter","android","ios",

    # blockchain
    "blockchain","solidity","web3",

    # testing
    "jest","mocha","selenium","cypress","unit testing",

    # data engineering
    "hadoop","spark","airflow","kafka","etl",

    # soft skills
    "problem solving","teamwork","communication","leadership",
    
    
    
    
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
