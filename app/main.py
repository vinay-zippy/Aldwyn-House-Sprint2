from fastapi import FastAPI

app = FastAPI(title="Aldwyn House API")


@app.get("/health")
def health_check():
    return {"status": "ok"}