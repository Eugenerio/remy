/**
 * Canonical prompt templates. The exact text lives here and is shared between
 * the Node API (to render in UI "why these instructions?" popover) and the
 * FastAPI AI service (to send to the multimodal analyzer and ComfyUI).
 *
 * Do NOT edit these casually — they are the product. Changes warrant an A/B test.
 */

export const OUTFIT_ANALYSIS_PROMPT = `Analyze the provided image and describe it in a reusable way for image generation.

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

Return a single paragraph of plain text suitable for direct injection into an image-generation prompt.`;

export const VIDEO_MOTION_PROMPT = `Use the provided reference video strictly as the motion template and transfer its movement onto the character from the input image(s).

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
- Consistent frames`;

export const REFERENCE_IMAGE_PROMPT = `A full-body, standing, front-facing reference photograph of the character. Neutral pose with arms relaxed at the sides. Plain light-gray seamless studio background. Soft, even lighting with no harsh shadows. Eye-level camera, 50mm lens, shallow depth of field. Photorealistic. No text, no watermarks, no accessories unless specified.`;

export interface OutfitAnalysisResult {
  pose: string;
  clothing: string;
  environment: string;
  lighting: string;
  camera: string;
  /** concatenated single-paragraph prompt used downstream */
  composed_prompt: string;
}

export interface GenerationRequest {
  character_id: string;
  reference_video_url?: string | null;
  reference_image_url?: string | null;
  duration_seconds: 5 | 10 | 15;
  resolution: '720p' | '1080p';
  seed?: number | null;
  outfit_override?: string | null;
}
