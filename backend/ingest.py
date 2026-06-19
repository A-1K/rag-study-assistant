import shutil
import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings


#Config

PDF_PATH = "../data/sample_slide.pdf"
CHROMA_PATH = "chroma_db"
EMBED_MODEL = "all-MiniLM-L6-v2" 
if os.path.exists(CHROMA_PATH):
    shutil.rmtree(CHROMA_PATH)  



embeddings = SentenceTransformerEmbeddings(model_name=EMBED_MODEL)



# Chunking
splitter = RecursiveCharacterTextSplitter(
    chunk_size = 500,
    chunk_overlap = 60,
    separators=["\n\n", "\n", ". ", " ", ""],
) 



def ingest_pdf (pdf_path, chroma_path=CHROMA_PATH):
    if os.path.exists(chroma_path):
        shutil.rmtree(chroma_path) # wipe old pdf index

    # Doc Loading
    loader = PyPDFLoader(PDF_PATH)
    docs = loader.load()
    chunks = splitter.split_documents(docs)
    #print(docs[0].page_content[:500])

    # Embed + Store
    Chroma.from_documents(chunks, embeddings, persist_directory=chroma_path)
    #vecdb.persist()    manual not supported any longer

   # print(f"Loaded {len(docs)} pages")
    return len(docs), len(chunks)



if __name__ == "__main__":
    pages, n_chunks = ingest_pdf(PDF_PATH)
    print(f"Indexed {pages} pages -> {n_chunks} chunks")
