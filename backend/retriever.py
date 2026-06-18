import os
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()  


EMBED_MODEL = "all-MiniLM-L6-v2" #embed query w same model as chunks 
CHROMA_PATH = "chroma_db"

embeddings = SentenceTransformerEmbeddings(EMBED_MODEL)

vecdb = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)


retriever = vecdb.as_retriever(search_kwargs={"k": 4})

PROMPT_TEMPLATE = """You are a study assistant. Answer the question using only the context below.
For every claim, cite the source as [Page X].
If the answer is not in the context, say exactly: "Not covered in the uploaded materials."

Context:
{context}

Question: {question}

Answer:"""

