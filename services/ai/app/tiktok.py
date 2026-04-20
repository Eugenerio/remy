from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass

import httpx

from .settings import settings


@dataclass
class TikTokItem:
    platform_id: str
    url: str
    thumbnail_url: str | None
    creator_handle: str | None
    caption: str | None
    duration_seconds: int | None
    like_count: int | None
    view_count: int | None
    share_count: int | None
    comment_count: int | None
    published_at: str | None


def _mock_items(handle: str, n: int = 15) -> list[TikTokItem]:
    rng = random.Random(handle)
    out: list[TikTokItem] = []
    for i in range(n):
        pid = hashlib.sha1(f"{handle}:{i}".encode()).hexdigest()[:16]
        out.append(
            TikTokItem(
                platform_id=pid,
                url=f"https://tiktok.com/@{handle}/video/{pid}",
                thumbnail_url=f"https://picsum.photos/seed/{pid}/540/960",
                creator_handle=handle,
                caption=f"#{handle} sample caption {i}",
                duration_seconds=rng.choice([7, 12, 15, 20]),
                like_count=rng.randint(500, 500_000),
                view_count=rng.randint(1_000, 3_000_000),
                share_count=rng.randint(0, 20_000),
                comment_count=rng.randint(0, 10_000),
                published_at=None,
            )
        )
    return out


async def fetch_creator_videos(handle: str) -> list[TikTokItem]:
    if settings.mock_tiktok or not settings.tiktok_rapidapi_key:
        return _mock_items(handle)
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(
            f"https://{settings.tiktok_rapidapi_host}/user/posts",
            params={"unique_id": handle, "count": 30},
            headers={
                "x-rapidapi-key": settings.tiktok_rapidapi_key,
                "x-rapidapi-host": settings.tiktok_rapidapi_host,
            },
        )
        r.raise_for_status()
        payload = r.json()
    items: list[TikTokItem] = []
    for raw in payload.get("data", {}).get("videos", []):
        stats = raw.get("statistics", {}) or raw
        items.append(
            TikTokItem(
                platform_id=str(raw["video_id"]),
                url=raw.get("play") or raw.get("share_url") or f"https://tiktok.com/video/{raw['video_id']}",
                thumbnail_url=raw.get("cover"),
                creator_handle=raw.get("author", {}).get("unique_id") or handle,
                caption=raw.get("title"),
                duration_seconds=raw.get("duration"),
                like_count=stats.get("digg_count"),
                view_count=stats.get("play_count"),
                share_count=stats.get("share_count"),
                comment_count=stats.get("comment_count"),
                published_at=None,
            )
        )
    return items


async def fetch_hashtag_videos(tag: str) -> list[TikTokItem]:
    if settings.mock_tiktok or not settings.tiktok_rapidapi_key:
        return _mock_items(tag)
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(
            f"https://{settings.tiktok_rapidapi_host}/hashtag/posts",
            params={"name": tag, "count": 30},
            headers={
                "x-rapidapi-key": settings.tiktok_rapidapi_key,
                "x-rapidapi-host": settings.tiktok_rapidapi_host,
            },
        )
        r.raise_for_status()
        payload = r.json()
    items: list[TikTokItem] = []
    for raw in payload.get("data", {}).get("videos", []):
        stats = raw.get("statistics", {}) or raw
        items.append(
            TikTokItem(
                platform_id=str(raw["video_id"]),
                url=raw.get("play") or f"https://tiktok.com/video/{raw['video_id']}",
                thumbnail_url=raw.get("cover"),
                creator_handle=raw.get("author", {}).get("unique_id"),
                caption=raw.get("title"),
                duration_seconds=raw.get("duration"),
                like_count=stats.get("digg_count"),
                view_count=stats.get("play_count"),
                share_count=stats.get("share_count"),
                comment_count=stats.get("comment_count"),
                published_at=None,
            )
        )
    return items


CATEGORY_SEEDS: dict[str, list[str]] = {
    "dance": ["charlidamelio", "addisonre", "jojosiwa"],
    "transitions": ["bradmondo", "tiktoktransitions"],
    "cosplay": ["cosplayers", "animecosplay"],
}


async def fetch_category_videos(category: str) -> list[TikTokItem]:
    seeds = CATEGORY_SEEDS.get(category, [])
    if not seeds:
        return _mock_items(category)
    out: list[TikTokItem] = []
    for s in seeds:
        out.extend(await fetch_creator_videos(s))
    return out


def simplicity_score(item: TikTokItem) -> float:
    """Heuristic: shorter videos, fewer edits proxy."""
    if not item.duration_seconds:
        return 0.5
    # Prefer 5–15s
    if item.duration_seconds <= 15:
        return 0.9
    if item.duration_seconds <= 30:
        return 0.65
    if item.duration_seconds <= 60:
        return 0.4
    return 0.15


def engagement_score(item: TikTokItem) -> float:
    views = item.view_count or 0
    likes = item.like_count or 0
    if views <= 0:
        return 0.0
    # log-scale normalized; clamp to [0, 1]
    rate = likes / views
    base = min(1.0, rate * 20)  # 5% ratio → 1.0
    return base
