#!/bin/sh
# =============================================================
# Docker entrypoint – seeds InsightFace models on first boot
# =============================================================
set -e

SEED_DIR=/app/models_seed/models
DEST_DIR=/app/.insightface/models
MARKER="$DEST_DIR/buffalo_l/det_10g.onnx"

if [ -d "$SEED_DIR/buffalo_l" ] && [ ! -f "$MARKER" ]; then
    echo "[entrypoint] First boot detected – seeding InsightFace buffalo_l models from image..."
    mkdir -p "$DEST_DIR"
    cp -r "$SEED_DIR/." "$DEST_DIR/"
    echo "[entrypoint] Models seeded:"
    ls -lh "$DEST_DIR/buffalo_l/"
else
    echo "[entrypoint] InsightFace models already present in volume – skipping seed."
fi

exec "$@"
