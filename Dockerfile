
#  build the React frontend
FROM node:20-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
ENV VITE_API_URL=/ask
RUN npm run build


# Python backend + serve
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface

WORKDIR /home/user/app

COPY --chown=user requirements.txt ./
# Install the CPU-only build of torch FIRST, so sentence-transformers doesn't pull
# the ~2.5GB CUDA/GPU build (useless on a CPU Space, and the image bloat breaks startup).
RUN pip install --no-cache-dir --user torch --index-url https://download.pytorch.org/whl/cpu
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
