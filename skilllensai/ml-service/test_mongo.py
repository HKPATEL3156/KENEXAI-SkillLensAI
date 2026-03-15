import os
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/skilllensai")
print(f"Connecting to {MONGO_URI}...")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client["skilllensai"]
    count = db["users"].count_documents({})
    print(f"Success! Found {count} users.")
except Exception as e:
    print(f"Error connecting: {e}")
