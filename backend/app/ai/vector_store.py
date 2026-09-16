from pathlib import Path

from langchain_chroma import Chroma

from app.ai.embeddings import get_embeddings


VECTOR_STORE_DIR = Path(__file__).resolve().parents[2] / "chroma_db"


def get_vector_store():
    return Chroma(
        collection_name="aldwyn_house_knowledge",
        embedding_function=get_embeddings(),
        persist_directory=str(VECTOR_STORE_DIR),
    )
