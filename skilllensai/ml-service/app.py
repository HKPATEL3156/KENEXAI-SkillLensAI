# library for api
from fastapi import FastAPI
from pydantic import BaseModel
import pdfplumber  # library for read pdf
import os  # library for path
import re  # library for regex

app = FastAPI()  # create app with fastapi


# request model
class filedata(BaseModel):
    filepath: str  # path from backend


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
