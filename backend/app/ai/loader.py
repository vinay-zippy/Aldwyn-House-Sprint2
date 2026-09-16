from pathlib import Path

from langchain_community.document_loaders import TextLoader


DOCUMENTS_DIR = Path(__file__).resolve().parents[2] / "documents"


def load_hotel_documents():
    documents = []

    for file_path in DOCUMENTS_DIR.glob("*.txt"):
        loader = TextLoader(file_path, encoding="utf-8")
        loaded_documents = loader.load()

        for document in loaded_documents:
            document.metadata["source"] = file_path.name

        documents.extend(loaded_documents)

    return documents
