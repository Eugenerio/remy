# syntax=docker/dockerfile:1.7
FROM python:3.11-slim-bookworm

# ffmpeg + libs for Pillow codecs used by preprocessing
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg libgl1 libjpeg62-turbo curl \
 && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN pip install uv==0.5.8

COPY services/ai/pyproject.toml services/ai/uv.lock* ./
RUN uv sync --frozen --no-dev || uv pip install --system -r <(uv pip compile pyproject.toml)

COPY services/ai ./

EXPOSE 8001
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
