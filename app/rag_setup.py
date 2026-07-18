import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

load_dotenv()

embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
PERSIST_DIR = "./chroma_db"

def get_loader(file_path):
    """Selects the correct loader based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return PyPDFLoader(file_path)
    elif ext == ".docx":
        return Docx2txtLoader(file_path)
    elif ext == ".txt":
        return TextLoader(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def setup_vector_db(file_path):
    print(f"--- STARTING RAG SETUP FOR: {file_path} ---")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # 1. Load based on file type
    loader = get_loader(file_path)
    docs = loader.load()
    print(f"--- DOCUMENT LOADED: {len(docs)} pages/sections ---")

    # 2. Split
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    # 3. Store (Force delete old DB to ensure clean state for new file)
    # In a real production app, we would use unique collection names per session
    if os.path.exists(PERSIST_DIR):
        import shutil
        try:
            shutil.rmtree(PERSIST_DIR)
        except:
            pass # Handle windows lock issues gracefully

    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embedding_function,
        persist_directory=PERSIST_DIR
    )
    
    print(f"--- VECTOR DB UPDATED ---")
    return vectorstore.as_retriever()

def get_retriever():
    vectorstore = Chroma(
        persist_directory=PERSIST_DIR,
        embedding_function=embedding_function
    )
    return vectorstore.as_retriever()