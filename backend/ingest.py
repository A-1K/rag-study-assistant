import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
CHROMA_PATH = "chroma_db"
PDF_PATH = "data/sample_slide.pdf"
