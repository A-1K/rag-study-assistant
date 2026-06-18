import os
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()  


EMBED_MODEL = "all-MiniLM-L6-v2" #embed query w same model as chunks 
CHROMA_PATH = "chroma_db"

embeddings = SentenceTransformerEmbeddings(model_name=EMBED_MODEL)

vecdb = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)


retriever = vecdb.as_retriever(search_kwargs={"k": 4})

PROMPT_TEMPLATE = """You are a study assistant. Answer the question using only the context below.
For every claim, cite the source as [Page X].
If the answer is not in the context, say exactly: "Not covered in the uploaded materials."

Context:
{context}

Question: {question}

Answer:"""



llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

def ask(question: str):
    docs = retriever.invoke(question)            # step 1: get top-4 chunks

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



result = ask("What is tf-idf score?")
print(result[0])           # answer 
print(result[1]) # docs