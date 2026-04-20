"""The end-to-end pipelines the API dispatches. Each function:

1. Emits progress updates (streamed back to the API via webhook).
2. Uses `storage`/`modal_client` for heavy lifting.
3. Terminates by emitting a final completed/failed update.

None of these open DB connections — the API is the sole writer.
"""

from __future__ import annotations

from typing import Any

from .api_client import api_client, emit_progress
from .logging_config import logger
from .models import JobOutput, JobUpdate, LoraTrainingInput, TrendIngestInput, VideoGenerationInput
from .modal_client import modal_client
from .preprocess import preprocess_dataset
from .prompts import outfit_analyzer
from .settings import settings
from .shared import JobStatus, REFERENCE_IMAGE_PROMPT, VIDEO_MOTION_PROMPT
from .tiktok import (
    TikTokItem,
    engagement_score,
    fetch_category_videos,
    fetch_creator_videos,
    fetch_hashtag_videos,
    simplicity_score,
)


async def run_lora_training(job_id: str, user_id: str, raw_input: dict[str, Any]) -> None:
    params = LoraTrainingInput.model_validate(raw_input)
    try:
        await emit_progress(job_id, JobStatus.preparing, 5, "preparing dataset")

        processed = await preprocess_dataset(
            api_client=api_client,
            face_image_key=params.face_image_key or "",
            reference_image_keys=params.reference_image_keys,
            datasets_bucket=settings.supabase_bucket_datasets,
            uploads_bucket=settings.supabase_bucket_uploads,
            character_id=params.character_id,
        )
        if not processed:
            raise RuntimeError("No usable images after preprocessing")

        await emit_progress(job_id, JobStatus.running, 15, f"training lora on {len(processed)} images")

        async def _progress(pct: float, stage: str) -> None:
            # Scale 0..100 from Modal onto 15..95
            await emit_progress(
                job_id,
                JobStatus.running,
                15 + pct * 0.8,
                stage,
            )

        result = await modal_client.train_lora(
            dataset_keys=[p.key for p in processed],
            character_id=params.character_id,
            on_progress=_progress,
        )

        await emit_progress(job_id, JobStatus.uploading, 97, "uploading weights")

        await api_client.post_update(
            JobUpdate(
                job_id=job_id,
                status=JobStatus.completed,
                progress=None,
                output=JobOutput(lora_weights_key=result.weights_key),
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("lora training failed", job_id=job_id)
        await api_client.post_update(
            JobUpdate(job_id=job_id, status=JobStatus.failed, error=str(exc))
        )


async def run_video_generation(job_id: str, user_id: str, raw_input: dict[str, Any]) -> None:
    params = VideoGenerationInput.model_validate(raw_input)
    try:
        await emit_progress(job_id, JobStatus.preparing, 5, "fetching reference video")

        # Outfit analysis — pull frame from the reference video via a lightweight
        # probe. In MVP we rely on TikTok's `cover` thumbnail as the outfit
        # source; it captures the first relevant frame accurately enough.
        outfit_prompt = params.outfit_override
        if not outfit_prompt:
            await emit_progress(job_id, JobStatus.preparing, 15, "analyzing outfit")
            analysis = await outfit_analyzer.analyze_url(params.reference_video_url)
            outfit_prompt = analysis.composed_prompt

        await emit_progress(job_id, JobStatus.preparing, 30, "generating reference image")
        ref_prompt = f"{REFERENCE_IMAGE_PROMPT} {outfit_prompt}"
        ref_image = await modal_client.generate_image(
            character_id=params.character_id,
            lora_weights_key=params.lora_weights_key,
            prompt=ref_prompt,
            seed=params.seed,
        )

        async def _progress(pct: float, stage: str) -> None:
            await emit_progress(job_id, JobStatus.running, 40 + pct * 0.55, stage)

        await emit_progress(job_id, JobStatus.running, 40, "rendering video")

        # Motion prompt is a strong guide for the model; the reference_video
        # URL is the actual motion source Modal re-fetches directly.
        _ = VIDEO_MOTION_PROMPT  # referenced to satisfy linter + documents intent

        video = await modal_client.generate_video(
            character_id=params.character_id,
            reference_image_key=ref_image.image_key,
            reference_video_url=params.reference_video_url,
            duration_seconds=params.duration_seconds,
            resolution=params.resolution,
            seed=params.seed,
            on_progress=_progress,
        )

        await emit_progress(job_id, JobStatus.uploading, 97, "uploading video")

        await api_client.post_update(
            JobUpdate(
                job_id=job_id,
                status=JobStatus.completed,
                output=JobOutput(
                    video_key=video.video_key,
                    thumbnail_key=video.thumbnail_key,
                    reference_image_key=ref_image.image_key,
                    outfit_prompt=outfit_prompt,
                    duration_seconds=video.duration_seconds,
                ),
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("video generation failed", job_id=job_id)
        await api_client.post_update(
            JobUpdate(job_id=job_id, status=JobStatus.failed, error=str(exc))
        )


async def run_trend_ingest(job_id: str, user_id: str, raw_input: dict[str, Any]) -> None:
    params = TrendIngestInput.model_validate(raw_input)
    try:
        await emit_progress(job_id, JobStatus.running, 20, "fetching trending videos")
        items: list[TikTokItem]
        if params.kind == "tiktok_creator":
            items = await fetch_creator_videos(params.handle)
        elif params.kind == "tiktok_hashtag":
            items = await fetch_hashtag_videos(params.handle)
        else:
            items = await fetch_category_videos(params.handle)

        await emit_progress(job_id, JobStatus.running, 75, f"scoring {len(items)} videos")
        scored: list[dict[str, Any]] = []
        for it in items:
            es = engagement_score(it)
            ss = simplicity_score(it)
            rank = 0.6 * es + 0.4 * ss
            scored.append(
                {
                    **it.__dict__,
                    "engagement_score": es,
                    "simplicity_score": ss,
                    "rank_score": rank,
                }
            )

        await api_client.post_update(
            JobUpdate(
                job_id=job_id,
                status=JobStatus.completed,
                output=JobOutput(),
            )
        )
        # Results are written via /internal/trends, which the AI service
        # calls out separately when an ingest completes.
        await api_client._client.post(  # type: ignore[attr-defined]
            f"{api_client.base_url}/v1/internal/trends/ingest-result",
            json={"source_id": params.source_id, "items": scored},
            headers={
                "X-Remy-Token": settings.internal_service_token,
                "Content-Type": "application/json",
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("trend ingest failed", job_id=job_id)
        await api_client.post_update(
            JobUpdate(job_id=job_id, status=JobStatus.failed, error=str(exc))
        )
