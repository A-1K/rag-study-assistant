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


# Doc Loading
loader = PyPDFLoader(PDF_PATH)
docs = loader.load()
print(docs[0].page_content[:500])

print(f"Loaded {len(docs)} pages")

# Chunking
splitter = RecursiveCharacterTextSplitter(
    chunk_size = 500,
    chunk_overlap = 60,
    separators=["\n\n", "\n", ". ", " ", ""],
   # length = len,
) 

chunks = splitter.split_documents(docs)

print(chunks[0].page_content)
print("-" * 50)
print(chunks[1].page_content)

# Embed + Store
embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

vecdb = Chroma.from_documents(chunks, embeddings, persist_directory=CHROMA_PATH)
#vecdb.persist()    manual not supported any longer
