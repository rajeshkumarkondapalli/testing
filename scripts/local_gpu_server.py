"""
VeoGen Local GPU Server
=======================
Runs a local video generation API using your own GPU via diffusers.
The Next.js app calls this server when LOCAL_GPU_URL is set.

Requirements:
    pip install fastapi uvicorn diffusers transformers accelerate torch torchvision
    pip install imageio imageio-ffmpeg   # for MP4 export

    GPU: CUDA-capable GPU recommended
         ~6 GB VRAM  → use MODEL=zeroscope_576w  (default)
         ~15 GB VRAM → use MODEL=zeroscope_xl
         ~16 GB VRAM → use MODEL=cogvideox_2b

Usage:
    python scripts/local_gpu_server.py
    # Server starts on http://localhost:7860

    # Then set in .env.local:
    # LOCAL_GPU_URL=http://localhost:7860

Optional env vars:
    PORT=7860               (default)
    MODEL=zeroscope_576w    (zeroscope_576w | zeroscope_xl | cogvideox_2b)
    DEVICE=cuda             (cuda | cpu | mps)
    MAX_FRAMES=24
"""

import os
import io
import base64
import tempfile
import logging
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("local-gpu")

# ── Config ────────────────────────────────────────────────────────────────────
PORT       = int(os.getenv("PORT", 7860))
MODEL_KEY  = os.getenv("MODEL", "zeroscope_576w")
MAX_FRAMES = int(os.getenv("MAX_FRAMES", 24))

DEVICE = os.getenv(
    "DEVICE",
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu",
)

MODELS = {
    "zeroscope_576w": {
        "repo": "cerspense/zeroscope_v2_576w",
        "width": 576, "height": 320,
        "dtype": torch.float16,
        "pipeline": "TextToVideoSDPipeline",
    },
    "zeroscope_xl": {
        "repo": "cerspense/zeroscope_v2_XL",
        "width": 1024, "height": 576,
        "dtype": torch.float16,
        "pipeline": "TextToVideoSDPipeline",
    },
    "cogvideox_2b": {
        "repo": "THUDM/CogVideoX-2b",
        "width": 720, "height": 480,
        "dtype": torch.bfloat16,
        "pipeline": "CogVideoXPipeline",
    },
}

if MODEL_KEY not in MODELS:
    raise ValueError(f"Unknown MODEL={MODEL_KEY}. Choose from: {list(MODELS)}")

cfg = MODELS[MODEL_KEY]

# ── Load model (once at startup) ──────────────────────────────────────────────
log.info(f"Loading {MODEL_KEY} ({cfg['repo']}) on {DEVICE} …")

if cfg["pipeline"] == "CogVideoXPipeline":
    from diffusers import CogVideoXPipeline
    pipe = CogVideoXPipeline.from_pretrained(cfg["repo"], torch_dtype=cfg["dtype"])
else:
    from diffusers import TextToVideoSDPipeline
    pipe = TextToVideoSDPipeline.from_pretrained(cfg["repo"], torch_dtype=cfg["dtype"])

pipe = pipe.to(DEVICE)

# Memory optimisations
if DEVICE == "cuda":
    pipe.enable_model_cpu_offload()
    try:
        pipe.enable_xformers_memory_efficient_attention()
    except Exception:
        pass  # xformers not installed — fine

log.info("Model ready ✓")

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="VeoGen Local GPU Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    duration_seconds: int = 5
    num_inference_steps: int = 25
    guidance_scale: float = 7.5
    seed: Optional[int] = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_KEY,
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "vram_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
        if torch.cuda.is_available() else None,
    }


@app.post("/generate")
def generate(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    # Frames: ~8fps for the chosen duration (capped at MAX_FRAMES)
    num_frames = min(int(req.duration_seconds * 8), MAX_FRAMES)
    num_frames = max(num_frames, 8)

    generator = torch.Generator(device=DEVICE)
    if req.seed is not None:
        generator.manual_seed(req.seed)

    log.info(f"Generating: '{req.prompt[:80]}…' | {num_frames} frames")

    try:
        with torch.inference_mode():
            if cfg["pipeline"] == "CogVideoXPipeline":
                output = pipe(
                    prompt=req.prompt,
                    num_frames=num_frames,
                    num_inference_steps=req.num_inference_steps,
                    guidance_scale=req.guidance_scale,
                    generator=generator,
                )
                frames = output.frames[0]  # list of PIL images
            else:
                output = pipe(
                    req.prompt,
                    num_frames=num_frames,
                    num_inference_steps=req.num_inference_steps,
                    guidance_scale=req.guidance_scale,
                    height=cfg["height"],
                    width=cfg["width"],
                    generator=generator,
                )
                frames = output.frames[0]
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        raise HTTPException(
            status_code=500,
            detail=f"Out of GPU memory. Try a smaller model (currently {MODEL_KEY})."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Export frames → MP4 in memory
    video_b64 = frames_to_mp4_base64(frames, fps=8)
    log.info("Generation complete ✓")

    return {
        "video_url": f"data:video/mp4;base64,{video_b64}",
        "model": MODEL_KEY,
        "frames": num_frames,
        "device": DEVICE,
    }


def frames_to_mp4_base64(frames, fps: int = 8) -> str:
    """Convert a list of PIL images to a base64-encoded MP4."""
    import imageio
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        path = tmp.name

    writer = imageio.get_writer(path, fps=fps, codec="libx264", quality=7)
    for frame in frames:
        writer.append_data(np.array(frame))
    writer.close()

    with open(path, "rb") as f:
        data = f.read()
    os.unlink(path)

    return base64.b64encode(data).decode()


if __name__ == "__main__":
    log.info(f"Starting server on http://localhost:{PORT}")
    log.info(f"Set LOCAL_GPU_URL=http://localhost:{PORT} in your .env.local")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
