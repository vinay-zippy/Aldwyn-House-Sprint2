from app.ai.loader import load_hotel_documents
from app.ai.chunker import split_documents
from app.ai.vector_store import get_vector_store


def ingest_documents():
    documents = load_hotel_documents()
    chunks = split_documents(documents)

    vector_store = get_vector_store()
    vector_store.add_documents(chunks)

    print(f"Documents loaded: {len(documents)}")
    print(f"Chunks created: {len(chunks)}")
    print("Documents added to vector store")


if __name__ == "__main__":
    ingest_documents()
