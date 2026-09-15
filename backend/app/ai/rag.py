from app.ai.llm import get_llm
from app.ai.retriever import get_retriever


SYSTEM_PROMPT = """You are the Aldwyn House AI Concierge.

Answer the user's question using only the hotel information provided in the
context.

If the answer is not available in the context, say:
"I don't have that information in the hotel knowledge base."

Do not invent hotel policies, timings, prices, or services.

Keep answers clear, short, and helpful.
"""


def ask_assistant(question: str) -> str:
    retriever = get_retriever()
    documents = retriever.invoke(question)

    context = "\n\n".join(
        document.page_content for document in documents
    )

    prompt = f"""{SYSTEM_PROMPT}

Hotel knowledge:
{context}

User question:
{question}

Answer:"""

    llm = get_llm()
    response = llm.invoke(prompt)

    return response.content
