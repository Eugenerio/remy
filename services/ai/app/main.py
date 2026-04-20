from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .api_client import api_client
from .logging_config import configure_logging, logger
from .models import JobDispatch, OutfitAnalysisRequest, OutfitAnalysisResult
from .pipelines import run_lora_training, run_trend_ingest, run_video_generation
from .prompts import outfit_analyzer
from .settings import settings
from .shared import JobKind


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    logger.info("ai service starting", env=settings.app_env)
    yield
    await api_client.close()


app = FastAPI(title="Remy AI", lifespan=lifespan)


def require_internal_token(x_remy_token: str | None = Header(default=None)) -> None:
    if not x_remy_token or x_remy_token != settings.internal_service_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@app.get("/internal/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "remy-ai"}


_PIPELINES = {
    JobKind.lora_training: run_lora_training,
    JobKind.video_generation: run_video_generation,
    JobKind.video_regeneration: run_video_generation,
    JobKind.trend_ingest: run_trend_ingest,
}


@app.post("/internal/jobs", dependencies=[Depends(require_internal_token)])
async def create_job(dispatch: JobDispatch) -> dict[str, Any]:
    handler = _PIPELINES.get(dispatch.kind)
    if not handler:
        raise HTTPException(status_code=400, detail=f"Unknown job kind: {dispatch.kind}")

    # Fire-and-forget: the API tolerates an eventual webhook. We return fast
    # so BullMQ's dispatch can free the worker slot.
    asyncio.create_task(handler(dispatch.job_id, dispatch.user_id, dispatch.input))
    return {"ok": True, "accepted": dispatch.job_id}


class OutfitIn(BaseModel):
    image_url: str


@app.post(
    "/internal/prompts/outfit",
    response_model=OutfitAnalysisResult,
    dependencies=[Depends(require_internal_token)],
)
async def outfit_prompt(body: OutfitAnalysisRequest) -> OutfitAnalysisResult:
    return await outfit_analyzer.analyze_url(body.image_url)


@app.post(
    "/internal/jobs/{job_id}/cancel",
    dependencies=[Depends(require_internal_token)],
)
async def cancel_job(job_id: str) -> dict[str, Any]:
    # Current pipelines are cooperative-only; we rely on the API's
    # cancellation endpoint to flip the reservation. Modal handles
    # external cancellation at the function level.
    logger.info("cancel requested", job_id=job_id)
    return {"ok": True}


@app.exception_handler(Exception)
async def catch_all(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal", "message": str(exc)}},
    )
