from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings for the AI orchestration service.

    Values come from env vars; a `.env` file is respected in development.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    log_level: str = "info"
    port: int = 8001

    public_api_url: str = "http://localhost:8000"
    internal_service_token: str = Field(..., min_length=16)

    supabase_url: str = "http://localhost:54321"
    supabase_service_role_key: str = ""
    supabase_bucket_uploads: str = "uploads"
    supabase_bucket_generations: str = "generations"
    supabase_bucket_datasets: str = "datasets"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    modal_token_id: str = ""
    modal_token_secret: str = ""
    modal_app_name: str = "remy"
    mock_modal: bool = False

    tiktok_rapidapi_key: str = ""
    tiktok_rapidapi_host: str = "tiktok-scraper7.p.rapidapi.com"
    mock_tiktok: bool = False

    sentry_dsn: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
