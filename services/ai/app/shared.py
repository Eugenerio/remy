"""Python mirror of @remy/shared.

This file is generated manually when the TS shared package changes.
Keep in sync with `packages/shared/src/credits.ts`,
`packages/shared/src/jobs.ts`, `packages/shared/src/prompts.ts`.
"""

from __future__ import annotations

from enum import Enum
from typing import Final

# --------------------------------------------------------------------------- #
# Credits                                                                      #
# --------------------------------------------------------------------------- #

CREDIT_COSTS: Final[dict[str, int]] = {
    "LORA_TRAINING": 200,
    "OUTFIT_IMAGE": 5,
    "REFERENCE_IMAGE": 8,
    "VIDEO_GENERATION_SHORT": 40,
    "VIDEO_GENERATION_LONG": 90,
    "VIDEO_REGENERATION": 30,
    "TREND_INGEST": 0,
    "TREND_DEEP_ANALYSIS": 3,
}


class JobKind(str, Enum):
    lora_training = "lora_training"
    outfit_analysis = "outfit_analysis"
    reference_image = "reference_image"
    outfit_image = "outfit_image"
    video_generation = "video_generation"
    video_regeneration = "video_regeneration"
    trend_ingest = "trend_ingest"
    trend_analysis = "trend_analysis"


class JobStatus(str, Enum):
    queued = "queued"
    reserved = "reserved"
    preparing = "preparing"
    running = "running"
    rendering = "rendering"
    uploading = "uploading"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"
    refunded = "refunded"


TERMINAL_STATUSES: Final[set[JobStatus]] = {
    JobStatus.completed,
    JobStatus.failed,
    JobStatus.cancelled,
    JobStatus.refunded,
}

# --------------------------------------------------------------------------- #
# Prompts                                                                      #
# --------------------------------------------------------------------------- #

OUTFIT_ANALYSIS_PROMPT: Final[
    str
] = """Analyze the provided image and describe it in a reusable way for image generation.

Focus ONLY on:

1. Pose and Body Position
  - Full posture, weight distribution, limb placement
  - Angles (torso rotation, head tilt, arms)
  - Interaction with environment

2. Clothing and Accessories
  - Separate items (top, bottom, shoes, accessories)
  - Materials, fit, folds, textures
  - Colors and condition

3. Environment and Setting
  - Foreground, midground, background
  - Objects and layout

4. Lighting and Atmosphere
  - Light direction, intensity
  - Shadows and highlights

5. Camera and Composition
  - Angle (eye-level, low-angle, etc.)
  - Framing (full body, portrait, close-up)
  - Perspective

Important Rules:
- Do NOT describe identity or face
- Do NOT describe artistic style
- Do NOT infer emotions or personality
- Keep identity-neutral

Return a single paragraph of plain text suitable for direct injection into an image-generation prompt."""

VIDEO_MOTION_PROMPT: Final[
    str
] = """Use the provided reference video strictly as the motion template and transfer its movement onto the character from the input image(s).

Preserve identity fully — body, face, hair, skin, clothing. No distortion or style drift.

Match motion precisely:
- Timing and speed
- Acceleration and deceleration
- Weight distribution
- Center of mass
- Foot placement
- Hand and finger movement
- Head and gaze direction
- Micro-movements

Physics Constraints:
- Realistic inertia
- Proper joint limits
- Correct gravity interaction

Restrictions:
- No exaggerated animation
- No stretching, sliding, or jitter
- No added gestures

Rendering:
- No flicker
- No artifacts
- Consistent frames"""

REFERENCE_IMAGE_PROMPT: Final[
    str
] = "A full-body, standing, front-facing reference photograph of the character. Neutral pose with arms relaxed at the sides. Plain light-gray seamless studio background. Soft, even lighting with no harsh shadows. Eye-level camera, 50mm lens, shallow depth of field. Photorealistic. No text, no watermarks, no accessories unless specified."
