from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image

from .logging_config import logger
from .storage import fetch_url, upload_bytes


@dataclass
class ProcessedImage:
    key: str
    width: int
    height: int


async def _signed_source_for(api_client, bucket: str, key: str) -> bytes:
    url = await api_client.download_url(bucket, key)
    return await fetch_url(url)


def _center_crop_square(image: Image.Image, size: int = 768) -> Image.Image:
    w, h = image.size
    short = min(w, h)
    left = (w - short) // 2
    top = (h - short) // 2
    right = left + short
    bottom = top + short
    return image.crop((left, top, right, bottom)).resize((size, size), Image.LANCZOS)


async def preprocess_dataset(
    api_client,
    face_image_key: str,
    reference_image_keys: list[str],
    datasets_bucket: str,
    uploads_bucket: str,
    character_id: str,
) -> list[ProcessedImage]:
    """Downloads raw uploads, center-crops to 768x768, re-encodes to JPEG
    at quality 92, and writes under `datasets/{character_id}/processed/*`."""

    out: list[ProcessedImage] = []
    for idx, src_key in enumerate([face_image_key, *reference_image_keys]):
        if not src_key:
            continue
        data = await _signed_source_for(api_client, uploads_bucket, src_key)
        try:
            img = Image.open(io.BytesIO(data)).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            logger.warn("skip image", key=src_key, error=str(exc))
            continue
        processed = _center_crop_square(img, 768)
        buf = io.BytesIO()
        processed.save(buf, format="JPEG", quality=92)
        out_key = f"{character_id}/processed/{idx:03d}.jpg"
        await upload_bytes(datasets_bucket, out_key, buf.getvalue(), "image/jpeg")
        out.append(ProcessedImage(key=out_key, width=768, height=768))
    return out
