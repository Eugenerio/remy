from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .logging_config import logger
from .models import OutfitAnalysisResult
from .settings import settings
from .shared import OUTFIT_ANALYSIS_PROMPT


class OutfitAnalyzer:
    """Uses Gemini 2.0 (via google-genai) to produce a structured, reusable
    outfit description from a reference frame. If no API key is configured,
    returns a deterministic mock so local dev works end-to-end.
    """

    def __init__(self) -> None:
        self._client = None
        if settings.gemini_api_key:
            try:
                from google import genai  # type: ignore[import-not-found]

                self._client = genai.Client(api_key=settings.gemini_api_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning("gemini sdk unavailable, falling back to mock", error=str(exc))
                self._client = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def analyze_url(self, image_url: str) -> OutfitAnalysisResult:
        if not self._client:
            return _mock_result()

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as c:
            r = await c.get(image_url)
            r.raise_for_status()
            mime_type = r.headers.get("content-type", "image/jpeg").split(";")[0]
            image_bytes = r.content

        from google.genai import types  # type: ignore[import-not-found]

        response = await self._client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=[
                OUTFIT_ANALYSIS_PROMPT,
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                max_output_tokens=1200,
                temperature=0.4,
            ),
        )
        text = getattr(response, "text", None) or _extract_text(response)
        return _split_sections(text)


def _extract_text(response: object) -> str:
    # google-genai returns a `.text` helper; fall back to traversal if it's
    # missing on a given version.
    candidates = getattr(response, "candidates", None) or []
    parts: list[str] = []
    for cand in candidates:
        content = getattr(cand, "content", None)
        for part in getattr(content, "parts", []) or []:
            if getattr(part, "text", None):
                parts.append(part.text)
    return "".join(parts)


def _split_sections(text: str) -> OutfitAnalysisResult:
    """Best-effort split into the five structured sections. Our prompt asks
    for a single paragraph, so we usually just store it in `composed_prompt`."""
    sections: dict[str, list[str]] = {
        "pose": [],
        "clothing": [],
        "environment": [],
        "lighting": [],
        "camera": [],
    }
    current: str | None = None
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        low = line.lower()
        if low.startswith("pose"):
            current = "pose"
            continue
        if low.startswith("clothing"):
            current = "clothing"
            continue
        if low.startswith("environment") or low.startswith("setting"):
            current = "environment"
            continue
        if low.startswith("lighting") or low.startswith("atmosphere"):
            current = "lighting"
            continue
        if low.startswith("camera") or low.startswith("composition"):
            current = "camera"
            continue
        if current:
            sections[current].append(line)

    def join(name: str) -> str:
        return " ".join(sections[name]).strip()

    parts = {k: join(k) for k in sections}
    if all(not v for v in parts.values()):
        composed = text.strip()
        return OutfitAnalysisResult(
            pose="",
            clothing="",
            environment="",
            lighting="",
            camera="",
            composed_prompt=composed,
        )

    composed = " ".join(
        v
        for v in (
            parts["pose"],
            parts["clothing"],
            parts["environment"],
            parts["lighting"],
            parts["camera"],
        )
        if v
    )
    return OutfitAnalysisResult(
        pose=parts["pose"],
        clothing=parts["clothing"],
        environment=parts["environment"],
        lighting=parts["lighting"],
        camera=parts["camera"],
        composed_prompt=composed,
    )


def _mock_result() -> OutfitAnalysisResult:
    composed = (
        "Subject stands centered in full frame, weight on right foot, left "
        "hip slightly raised, arms relaxed. Wearing a cropped oversized "
        "cream knit sweater over a black pleated mini skirt and white "
        "chunky sneakers, small silver hoop earrings. Plain neutral studio "
        "backdrop, no foreground props. Soft, diffuse key light from the "
        "upper-left, gentle fill from the right, minimal shadows. Eye-level "
        "50mm lens, full-body framing, straight-on perspective."
    )
    return OutfitAnalysisResult(
        pose="Standing, weight on right foot, relaxed arms.",
        clothing="Cropped cream knit sweater, black pleated mini skirt, white sneakers.",
        environment="Neutral studio backdrop, no props.",
        lighting="Soft diffuse key upper-left, gentle fill right.",
        camera="50mm eye-level, full body, straight-on.",
        composed_prompt=composed,
    )


outfit_analyzer = OutfitAnalyzer()
