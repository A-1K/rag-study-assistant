import os
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from functools import lru_cache


load_dotenv()  


EMBED_MODEL = "all-MiniLM-L6-v2" #embed query w same model as chunks 
CHROMA_PATH = "chroma_db"

embeddings = SentenceTransformerEmbeddings(model_name=EMBED_MODEL)

vecdb = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)


retriever = vecdb.as_retriever(search_kwargs={"k": 6})

PROMPT_TEMPLATE = """You are a study assistant. Answer the question using only the context below.
For every claim, cite the source as [Page X]. Respond in plain text, no markdown. Format properly.
New line after every claim.  If the context contains relevant information, answer with it - even if it only partially
covers the question. In that case do NOT add any disclaimer.
Only if NONE of the context is relevant should you reply with exactly:
"Not covered in the uploaded materials."

Context:
{context}

Question: {question}

Answer:"""



llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

max_relevant = 1.3

@lru_cache(maxsize=256)
def ask(question: str):
    score = vecdb.similarity_search_with_score(question, k=6)
    docs = [doc for doc, dist in score if dist <= max_relevant]            # step 1: get top-6 chunks

    if not docs:
        return "Not covered in the uploaded materials.", []
    
    context = "\n\n".join(                        # step 2: build context string
        f"[Page {d.metadata.get('page')}] {d.page_content}"
        for d in docs
    )

    prompt = PROMPT_TEMPLATE.format(              # step 3: fill the template
        context=context,
        question=question,
    )

    response = llm.invoke(prompt)                 # step 4: ask Gemini
    return response.content, docs



# result = ask("What is tf-idf score?")
# print(result[0])           # answer 
# print(result[1]) # docs