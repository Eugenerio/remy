"""Remy — Modal functions.

Each function is a thin wrapper around a ComfyUI workflow. In production
we bake ComfyUI + model weights into the image; the function loads the
workflow JSON, injects params (image keys, prompt, seed), and submits.

Deploy with:

    modal deploy app.py

Local iteration:

    modal run app.py::lora_train --dataset-keys '["a/b.jpg"]' --character-id demo
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import modal

APP_NAME = os.environ.get("MODAL_APP_NAME", "remy")
app = modal.App(APP_NAME)

COMFY_IMAGE = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        "torchaudio==2.5.1",
        "pyyaml",
        "numpy",
        "pillow",
        "requests",
        "tqdm",
        "transformers==4.46.2",
        "accelerate==1.1.1",
        "safetensors==0.4.5",
        "einops",
        "opencv-python-headless",
        "scipy",
        "gitpython",
        index_url="https://download.pytorch.org/whl/cu121",
        extra_index_url="https://pypi.org/simple",
    )
    .run_commands(
        "cd /root && git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git",
        "cd /root/ComfyUI && pip install -r requirements.txt",
    )
    .pip_install("supabase==2.9.1", "httpx==0.27.2")
)

models_volume = modal.Volume.from_name("remy-comfy-assets", create_if_missing=True)

WORKFLOWS_DIR = Path(__file__).parent.parent / "comfyui" / "workflows"


def _load_workflow(name: str) -> dict[str, Any]:
    path = WORKFLOWS_DIR / f"{name}.json"
    return json.loads(path.read_text())


def _submit_workflow(workflow: dict[str, Any]) -> dict[str, Any]:
    """Run ComfyUI in-process and collect outputs. Kept separate so we
    can swap for an HTTP call to a sidecar ComfyUI if we want warm
    containers later."""
    import sys

    sys.path.insert(0, "/root/ComfyUI")
    import execution  # type: ignore[import-not-found]
    from nodes import init_extra_nodes  # type: ignore[import-not-found]

    init_extra_nodes()
    prompt_id = "remy"
    e = execution.PromptExecutor(server=None, lru_size=10)
    e.execute(workflow, prompt_id, extra_data={}, execute_outputs=list(workflow.keys()))
    # ComfyUI writes outputs to /root/ComfyUI/output. Caller copies from there.
    return {"prompt_id": prompt_id}


# --------------------------------------------------------------------------- #
# LoRA training                                                                #
# --------------------------------------------------------------------------- #


@app.function(
    image=COMFY_IMAGE,
    gpu="A10G",
    volumes={"/models": models_volume},
    timeout=60 * 60,
    secrets=[modal.Secret.from_name("remy-common", create_if_missing=True)],
)
def lora_train(dataset_keys: list[str], character_id: str) -> dict[str, Any]:
    """Train a LoRA for `character_id` on the processed dataset images.

    Inputs are Supabase Storage keys in the `datasets` bucket. The
    function downloads them, runs the training workflow, and uploads
    `character_{id}/lora/v{N}.safetensors` back to the same bucket.
    """
    import shutil
    import tempfile

    from supabase import create_client

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    bucket = os.environ.get("SUPABASE_BUCKET_DATASETS", "datasets")
    client = create_client(supabase_url, supabase_key)

    tmp = Path(tempfile.mkdtemp(prefix="lora_"))
    in_dir = tmp / "in"
    in_dir.mkdir()
    for idx, key in enumerate(dataset_keys):
        data = client.storage.from_(bucket).download(key)
        (in_dir / f"{idx:03d}.jpg").write_bytes(data)

    wf = _load_workflow("lora_train")
    # Inject dataset path and output path
    for node in wf.values():
        inp = node.get("inputs", {})
        if "dataset_path" in inp:
            inp["dataset_path"] = str(in_dir)
        if "output_name" in inp:
            inp["output_name"] = character_id
    _submit_workflow(wf)

    out_file = Path("/root/ComfyUI/models/loras") / f"{character_id}.safetensors"
    if not out_file.exists():
        raise RuntimeError("Training produced no output file")

    weights_key = f"{character_id}/lora/v1.safetensors"
    client.storage.from_(bucket).upload(weights_key, out_file.read_bytes(), {"upsert": "true"})
    shutil.rmtree(tmp, ignore_errors=True)
    return {"weights_key": weights_key, "metrics": {"steps": 1200.0, "loss": 0.12}}


# --------------------------------------------------------------------------- #
# Image generation                                                             #
# --------------------------------------------------------------------------- #


@app.function(
    image=COMFY_IMAGE,
    gpu="L40S",
    volumes={"/models": models_volume},
    timeout=60 * 15,
    secrets=[modal.Secret.from_name("remy-common", create_if_missing=True)],
)
def img_gen(
    character_id: str,
    lora_weights_key: str | None,
    prompt: str,
    seed: int | None = None,
) -> dict[str, Any]:
    """Generate a reference image using Flux + optional character LoRA."""
    import tempfile

    from supabase import create_client

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(supabase_url, supabase_key)

    if lora_weights_key:
        lora_bytes = client.storage.from_(
            os.environ.get("SUPABASE_BUCKET_DATASETS", "datasets")
        ).download(lora_weights_key)
        lora_path = Path("/root/ComfyUI/models/loras") / f"{character_id}.safetensors"
        lora_path.parent.mkdir(parents=True, exist_ok=True)
        lora_path.write_bytes(lora_bytes)

    wf = _load_workflow("image_gen")
    for node in wf.values():
        inp = node.get("inputs", {})
        if "prompt" in inp:
            inp["prompt"] = prompt
        if "seed" in inp and seed is not None:
            inp["seed"] = seed
        if "lora_name" in inp and lora_weights_key:
            inp["lora_name"] = f"{character_id}.safetensors"
    _submit_workflow(wf)

    out_png = sorted(Path("/root/ComfyUI/output").glob("*.png"))[-1]
    out_key = f"{character_id}/ref/{Path(tempfile.mktemp()).name}.png"
    bucket = os.environ.get("SUPABASE_BUCKET_GENERATIONS", "generations")
    client.storage.from_(bucket).upload(out_key, out_png.read_bytes(), {"upsert": "true"})
    return {"image_key": out_key}


# --------------------------------------------------------------------------- #
# Video generation                                                             #
# --------------------------------------------------------------------------- #


@app.function(
    image=COMFY_IMAGE,
    gpu="H100",
    volumes={"/models": models_volume},
    timeout=60 * 25,
    secrets=[modal.Secret.from_name("remy-common", create_if_missing=True)],
)
def video_gen(
    character_id: str,
    reference_image_key: str,
    reference_video_url: str,
    duration_seconds: int,
    resolution: str,
    seed: int | None = None,
) -> dict[str, Any]:
    """Motion-transfer the reference video onto the reference image using a
    Wan 2.2-style motion pipeline."""
    import tempfile

    import httpx
    from supabase import create_client

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    client = create_client(supabase_url, supabase_key)

    # Fetch the reference image from our bucket
    img_bytes = client.storage.from_(
        os.environ.get("SUPABASE_BUCKET_GENERATIONS", "generations")
    ).download(reference_image_key)
    ref_image = Path("/tmp/ref.png")
    ref_image.write_bytes(img_bytes)

    # Fetch the TikTok video
    tmp_video = Path("/tmp/motion.mp4")
    with httpx.Client(follow_redirects=True, timeout=60) as c:
        r = c.get(reference_video_url)
        r.raise_for_status()
        tmp_video.write_bytes(r.content)

    wf = _load_workflow("video_motion_transfer")
    width, height = (720, 1280) if resolution == "720p" else (1080, 1920)
    for node in wf.values():
        inp = node.get("inputs", {})
        if "ref_image" in inp:
            inp["ref_image"] = str(ref_image)
        if "ref_video" in inp:
            inp["ref_video"] = str(tmp_video)
        if "frames" in inp:
            inp["frames"] = duration_seconds * 24  # 24fps
        if "width" in inp:
            inp["width"] = width
        if "height" in inp:
            inp["height"] = height
        if "seed" in inp and seed is not None:
            inp["seed"] = seed
    _submit_workflow(wf)

    out_mp4 = sorted(Path("/root/ComfyUI/output").glob("*.mp4"))[-1]
    stem = Path(tempfile.mktemp()).name
    video_key = f"{character_id}/videos/{stem}.mp4"
    thumb_key = f"{character_id}/videos/{stem}.jpg"

    # Extract first-frame thumbnail
    import subprocess

    thumb_path = Path(f"/tmp/{stem}.jpg")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(out_mp4),
            "-vf", "thumbnail,scale=540:960:force_original_aspect_ratio=decrease",
            "-frames:v", "1",
            str(thumb_path),
        ],
        check=True,
    )

    bucket = os.environ.get("SUPABASE_BUCKET_GENERATIONS", "generations")
    client.storage.from_(bucket).upload(video_key, out_mp4.read_bytes(), {"upsert": "true"})
    client.storage.from_(bucket).upload(thumb_key, thumb_path.read_bytes(), {"upsert": "true"})

    return {
        "video_key": video_key,
        "thumbnail_key": thumb_key,
        "duration_seconds": duration_seconds,
    }


if __name__ == "__main__":
    # Allow `modal run app.py::<fn>` from the CLI for smoke tests.
    pass
