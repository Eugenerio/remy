import pytest

from app.tiktok import (
    TikTokItem,
    engagement_score,
    fetch_category_videos,
    fetch_creator_videos,
    simplicity_score,
)


@pytest.mark.asyncio
async def test_mock_creator_videos():
    items = await fetch_creator_videos("charlidamelio")
    assert len(items) >= 10
    for it in items:
        assert it.platform_id
        assert it.url.startswith("https://")


@pytest.mark.asyncio
async def test_mock_category_videos_uses_seeds():
    items = await fetch_category_videos("dance")
    # dance has 3 seeds × 15 items each
    assert len(items) >= 30


def test_simplicity_prefers_short():
    short = TikTokItem("a", "", None, None, None, 10, 0, 0, 0, 0, None)
    long_ = TikTokItem("b", "", None, None, None, 120, 0, 0, 0, 0, None)
    assert simplicity_score(short) > simplicity_score(long_)


def test_engagement_ratio():
    it = TikTokItem("a", "", None, None, None, 10, 100_000, 1_000_000, 0, 0, None)
    assert 0 <= engagement_score(it) <= 1
