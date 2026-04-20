import pytest

from app.prompts import _mock_result, _split_sections


def test_mock_result_is_composed():
    r = _mock_result()
    assert r.composed_prompt
    assert "Standing" in r.pose


def test_split_sections_paragraph():
    text = "Standing pose, wearing a red dress in a park under soft light, 50mm eye-level."
    r = _split_sections(text)
    # No headers → everything falls into composed_prompt
    assert r.composed_prompt == text
    assert r.pose == ""


def test_split_sections_structured():
    text = """Pose: standing, arms relaxed.
Clothing: red knit dress.
Environment: sunlit park with trees.
Lighting: soft diffused daylight from above.
Camera: 50mm, eye-level, full body."""
    r = _split_sections(text)
    assert "standing" in r.pose
    assert "knit" in r.clothing
    assert "park" in r.environment
    assert "diffused" in r.lighting
    assert "50mm" in r.camera
    assert r.composed_prompt


@pytest.mark.asyncio
async def test_analyze_returns_mock_when_no_key():
    from app.prompts import OutfitAnalyzer

    analyzer = OutfitAnalyzer()
    # Monkeypatched: no client configured → mock
    analyzer._client = None
    result = await analyzer.analyze_url("https://example.com/x.jpg")
    assert result.composed_prompt
