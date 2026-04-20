import pytest

from app.models import JobUpdate
from app.pipelines import run_trend_ingest


@pytest.mark.asyncio
async def test_trend_ingest_pipeline(monkeypatch):
    posted: list[JobUpdate] = []
    trend_payload: dict = {}

    async def fake_post_update(update: JobUpdate):
        posted.append(update)

    class FakeClient:
        base_url = "http://api"

        async def post(self, url, json, headers):
            trend_payload.update({"url": url, "json": json})

            class _R:
                status_code = 200

                def raise_for_status(self) -> None: ...

            return _R()

    import app.pipelines as p
    import app.api_client as ac

    monkeypatch.setattr(p.api_client, "post_update", fake_post_update)
    monkeypatch.setattr(ac.api_client, "post_update", fake_post_update)
    monkeypatch.setattr(p.api_client, "_client", FakeClient())

    await run_trend_ingest("job-1", "user-1", {
        "source_id": "00000000-0000-0000-0000-000000000001",
        "kind": "category",
        "handle": "dance",
    })

    # Should have posted a terminal success
    assert any(u.status == "completed" for u in posted)
    # Should have posted the ranked result to /internal/trends/ingest-result
    assert "/trends/ingest-result" in trend_payload.get("url", "")
    assert len(trend_payload["json"]["items"]) > 0
