FROM python:3.12-slim

# Pull the uv binary from Astral's official image rather than pip-installing it,
# per uv's documented Docker pattern. Pinned to match the version dev machines use
# (see the pyproject.toml/uv.lock this image installs from).
COPY --from=ghcr.io/astral-sh/uv:0.11.30 /uv /uvx /usr/local/bin/

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/usr/local

# Install deps first (better layer caching) straight from the lockfile — no
# requirements.txt in this project, uv.lock is the single source of truth.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

EXPOSE 8000

# --reload is for local/dev convenience (paired with the app/ volume mount in
# docker-compose.yml). Drop it for a production image in later sprints.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
