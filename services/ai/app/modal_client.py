from __future__ import annotations

import asyncio
import random
from dataclasses import dataclass
from typing import Any

from .logging_config import logger
from .settings import settings


@dataclass
class ModalLoraResult:
    weights_key: str
    metrics: dict[str, float]


@dataclass
class ModalImageResult:
    image_key: str


@dataclass
class ModalVideoResult:
    video_key: str
    thumbnail_key: str
    duration_seconds: int


class ModalClient:
    """Abstraction over the Modal app in services/modal/*.

    In development/test (MOCK_MODAL=1) this returns deterministic fake
    keys so the rest of the pipeline can be exercised end-to-end without
    a GPU bill.
    """

    def __init__(self) -> None:
        self.mock = settings.mock_modal
        self._apps: dict[str, Any] | None = None

    def _load_apps(self) -> dict[str, Any]:
        if self._apps is not None:
            return self._apps
        if self.mock:
            self._apps = {}
            return self._apps
        # Lazy import so tests can run without modal installed.
        import modal  # noqa: PLC0415

        self._apps = {
            "lora": modal.Function.lookup(settings.modal_app_name, "lora_train"),
            "img": modal.Function.lookup(settings.modal_app_name, "img_gen"),
            "video": modal.Function.lookup(settings.modal_app_name, "video_gen"),
        }
        return self._apps

    async def train_lora(
        self,
        dataset_keys: list[str],
        character_id: str,
        on_progress=None,
    ) -> ModalLoraResult:
        if self.mock:
            for pct in (5, 25, 50, 75, 100):
                if on_progress:
                    await on_progress(pct, f"step {pct}% of 100%")
                await asyncio.sleep(0.05)
            return ModalLoraResult(
                weights_key=f"{character_id}/lora/v1.safetensors",
                metrics={"loss": 0.124, "steps": 1200.0},
            )
        apps = self._load_apps()
        call = apps["lora"].spawn.aio(dataset_keys=dataset_keys, character_id=character_id)
        handle = await call
        async for event in handle.events.aio():
            if on_progress and event.kind == "progress":
                await on_progress(event.percent, event.stage)
        result = await handle.result.aio()
        return ModalLoraResult(weights_key=result["weights_key"], metrics=result.get("metrics", {}))

    async def generate_image(
        self,
        character_id: str,
        lora_weights_key: str | None,
        prompt: str,
        seed: int | None = None,
    ) -> ModalImageResult:
        if self.mock:
            await asyncio.sleep(0.05)
            return ModalImageResult(image_key=f"{character_id}/ref/{random.randint(1, 99_999):05d}.png")
        apps = self._load_apps()
        call = apps["img"].spawn.aio(
            character_id=character_id,
            lora_weights_key=lora_weights_key,
            prompt=prompt,
            seed=seed,
        )
        handle = await call
        result = await handle.result.aio()
        return ModalImageResult(image_key=result["image_key"])

    async def generate_video(
        self,
        character_id: str,
        reference_image_key: str,
        reference_video_url: str,
        duration_seconds: int,
        resolution: str,
        seed: int | None = None,
        on_progress=None,
    ) -> ModalVideoResult:
        if self.mock:
            for pct, stage in [(10, "decoding"), (40, "sampling"), (80, "rendering"), (100, "uploading")]:
                if on_progress:
                    await on_progress(pct, stage)
                await asyncio.sleep(0.05)
            return ModalVideoResult(
                video_key=f"{character_id}/videos/{random.randint(1, 99_999):05d}.mp4",
                thumbnail_key=f"{character_id}/videos/{random.randint(1, 99_999):05d}.jpg",
                duration_seconds=duration_seconds,
            )
        apps = self._load_apps()
        call = apps["video"].spawn.aio(
            character_id=character_id,
            reference_image_key=reference_image_key,
            reference_video_url=reference_video_url,
            duration_seconds=duration_seconds,
            resolution=resolution,
            seed=seed,
        )
        handle = await call
        async for event in handle.events.aio():
            if on_progress and event.kind == "progress":
                await on_progress(event.percent, event.stage)
        result = await handle.result.aio()
        return ModalVideoResult(
            video_key=result["video_key"],
            thumbnail_key=result["thumbnail_key"],
            duration_seconds=result.get("duration_seconds", duration_seconds),
        )


modal_client = ModalClient()
