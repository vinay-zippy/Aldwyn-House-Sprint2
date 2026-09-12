from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app configuration, loaded from environment variables (see .env.example
    at the repo root). Extend this as your team adds vertical-specific config
    (e.g. third-party API keys for Sprint 3's RAG/agent features).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://meridian:meridian@localhost:5432/meridian"
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db_name: str = "meridian"

    seed_on_startup: bool = True
    default_property_capacity: int = 20
    upcoming_arrivals_days: int = 7
    cors_origins: list[str] = ["http://localhost:5173"]

    # Set to true only by the test suite (see tests/conftest.py) to skip touching
    # the real Postgres/Mongo services during startup.
    testing: bool = False


settings = Settings()
