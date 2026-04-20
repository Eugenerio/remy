from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .logging_config import logger
from .models import JobUpdate
from .settings import settings


def _sign(body: bytes) -> str:
    mac = hmac.new(settings.internal_service_token.encode(), body, hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


class ApiClient:
    """Thin client for our own Node API. The AI service never writes to the
    database directly; everything flows through these calls."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.public_api_url).rstrip("/")
        self._client = httpx.AsyncClient(
            timeout=30,
            headers={"X-Remy-Token": settings.internal_service_token},
        )

    async def close(self) -> None:
        await self._client.aclose()

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(min=0.5, max=10))
    async def post_update(self, update: JobUpdate) -> None:
        # exclude_none=True so Python `None` fields don't serialize to
        # `null` in JSON — the API's Zod schema treats missing and null as
        # different and we want "missing" semantics for optional fields.
        payload = json.dumps(
            update.model_dump(mode="json", exclude_none=True), default=str
        ).encode()
        signature = _sign(payload)
        r = await self._client.post(
            f"{self.base_url}/v1/webhooks/ai",
            content=payload,
            headers={"Content-Type": "application/json", "X-Remy-Signature": signature},
        )
        r.raise_for_status()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=0.5, max=5))
    async def download_url(self, bucket: str, key: str) -> str:
        r = await self._client.get(
            f"{self.base_url}/v1/internal/storage/download",
            params={"bucket": bucket, "key": key},
        )
        r.raise_for_status()
        data: dict[str, Any] = r.json()
        return data["url"]


api_client = ApiClient()


async def emit_progress(
    job_id: str,
    status: str,
    percent: float,
    stage: str,
    message: str | None = None,
) -> None:
    logger.info("progress", job_id=job_id, status=status, percent=percent, stage=stage)
    await api_client.post_update(
        JobUpdate.model_validate(
            {
                "job_id": job_id,
                "status": status,
                "progress": {"percent": percent, "stage": stage, "message": message},
            }
        )
    )
