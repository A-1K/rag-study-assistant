# ============================================================
# Multi-stage build for Hugging Face Spaces (Docker SDK).
# Stage 1 builds the React frontend; stage 2 runs Flask + serves it.
# ============================================================

# ---------- Stage 1: build the React frontend ----------
FROM node:20-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# In production the API is same-origin, so the app calls /ask directly.
ENV VITE_API_URL=/ask
RUN npm run build


# ---------- Stage 2: Python backend + server ----------
FROM python:3.11-slim

# build-essential is needed to compile a few deps (e.g. ChromaDB's hnswlib).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run the container as uid 1000 — set that up so the
# model cache and vector store are owned by the runtime user.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface

WORKDIR /home/user/app

COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user backend/ ./backend/
COPY --chown=user data/ ./data/
COPY --chown=user --from=frontend /app/frontend/dist ./frontend/dist

# Build the vector store at image-build time (also caches the embed model).
WORKDIR /home/user/app/backend
RUN python ingest.py

# HF Spaces routes traffic to port 7860.
EXPOSE 7860
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--timeout", "180", "app:app"]
