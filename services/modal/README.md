# Remy — Modal apps

GPU-backed functions for LoRA training, image generation, and video
generation. Exposed as `modal.Function`s the AI service calls by name.

## Deploy

```bash
cd services/modal
pip install modal
modal setup
modal deploy app.py
```

After deploy, set `MODAL_APP_NAME=remy` and `MOCK_MODAL=0` in the AI
service so it routes real jobs here.

## Functions

| Function | GPU | Rough cost per call |
|---|---|---|
| `lora_train` | A10G (upgradable) | $2–$3 |
| `img_gen` | L40S | $0.05–$0.10 |
| `video_gen` | H100 | $1–$2 for 5s, $3–$5 for 15s |

## Resources

Each function defines its own `modal.Image` with pinned versions. Shared
models (checkpoints, vaes, controlnets) live on a Modal Volume
(`remy-comfy-assets`) mounted read-only into each function; LoRAs and
video outputs are written to Supabase Storage via a signed URL obtained
from the API's `/v1/internal/storage/*` endpoints.
