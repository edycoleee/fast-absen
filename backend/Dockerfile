# =============================================================
# Backend – FastAPI + InsightFace
# =============================================================
FROM python:3.11-slim

# --- System dependencies for OpenCV / InsightFace / psycopg2 ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Python dependencies (cached layer) ---
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# --- Pre-download InsightFace buffalo_l models (baked into image) ---
# This runs once at build time; images without internet access at runtime
# will still work because models are seeded from here into the volume.
COPY scripts/download_models.py /tmp/download_models.py
RUN python /tmp/download_models.py && rm /tmp/download_models.py

# --- Application source (excluding venv / tests / etc.) ---
COPY . .
RUN rm -rf venv tests pytest.ini .pytest_cache htmlcov .coverage

# --- Entrypoint: seeds volume with models on first boot ---
RUN chmod +x /app/scripts/entrypoint.sh

# --- Runtime environment ---
# INSIGHTFACE_MODEL_DIR = where FaceAnalysis looks at runtime
# Volume backend_models is mounted here; entrypoint copies seed → volume on first boot
ENV INSIGHTFACE_MODEL_DIR=/app/.insightface \
    ENVIRONMENT=production \
    DEBUG=false \
    RELOAD=false \
    PORT=8000

EXPOSE 8000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]

# 1 worker: InsightFace model is large; multiple workers = multiple copies in RAM
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

