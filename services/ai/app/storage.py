from __future__ import annotations

import io
from pathlib import Path

import httpx

from .logging_config import logger
from .settings import settings


async def upload_bytes(bucket: str, key: str, data: bytes, content_type: str) -> str:
    """Upload via Supabase Storage's REST API using the service-role key.

    Returns the object key (not the public URL). Reads/writes go through
    signed URLs that the API hands out.
    """
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{key}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            url,
            content=data,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
        if r.status_code >= 400:
            logger.error("upload failed", status=r.status_code, body=r.text[:200])
            r.raise_for_status()
    return key


async def upload_file(bucket: str, key: str, path: Path, content_type: str) -> str:
    return await upload_bytes(bucket, key, path.read_bytes(), content_type)


async def fetch_url(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


class Buffer(io.BytesIO):
    """BytesIO that reports a given name to PIL/ffmpeg, for nicer logs."""

    def __init__(self, content: bytes, name: str = "buffer") -> None:
        super().__init__(content)
        self.name = name
