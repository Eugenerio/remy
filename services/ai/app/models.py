from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from .shared import JobKind, JobStatus


class JobDispatch(BaseModel):
    job_id: str
    kind: JobKind
    user_id: str
    input: dict[str, Any] = Field(default_factory=dict)


class JobProgress(BaseModel):
    percent: float = Field(ge=0, le=100)
    stage: str
    message: str | None = None
    eta_seconds: float | None = None


class JobOutput(BaseModel):
    video_key: str | None = None
    thumbnail_key: str | None = None
    lora_weights_key: str | None = None
    reference_image_key: str | None = None
    outfit_prompt: str | None = None
    duration_seconds: int | None = None


class JobUpdate(BaseModel):
    job_id: str
    status: JobStatus
    progress: JobProgress | None = None
    output: JobOutput | None = None
    error: str | None = None
    external_job_id: str | None = None


class OutfitAnalysisRequest(BaseModel):
    image_url: str


class OutfitAnalysisResult(BaseModel):
    pose: str
    clothing: str
    environment: str
    lighting: str
    camera: str
    composed_prompt: str


class LoraTrainingInput(BaseModel):
    character_id: str
    dataset_id: str
    face_image_key: str | None = None
    reference_image_keys: list[str] = Field(default_factory=list)


class VideoGenerationInput(BaseModel):
    character_id: str
    lora_weights_key: str | None = None
    reference_video_url: str
    duration_seconds: Literal[5, 10, 15] = 5
    resolution: Literal["720p", "1080p"] = "720p"
    seed: int | None = None
    outfit_override: str | None = None


class TrendIngestInput(BaseModel):
    source_id: str
    kind: Literal["tiktok_creator", "tiktok_hashtag", "category"]
    handle: str
