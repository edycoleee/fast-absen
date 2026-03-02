#!/usr/bin/env python3
"""
Pre-download InsightFace buffalo_l models during Docker build.
Files land at: /app/models_seed/models/buffalo_l/*.onnx
The entrypoint.sh seeds these into the runtime volume on first boot.
"""
import os

SEED_ROOT = "/app/models_seed"
os.makedirs(SEED_ROOT, exist_ok=True)

print(f"[download_models] Downloading buffalo_l → {SEED_ROOT}/models/buffalo_l/")

from insightface.app import FaceAnalysis  # noqa: E402 – import after path setup

app = FaceAnalysis(
    name="buffalo_l",
    root=SEED_ROOT,
    providers=["CPUExecutionProvider"],
    allowed_modules=["detection", "recognition"],
)
app.prepare(ctx_id=0, det_size=(640, 640))

# Verify expected ONNX files are present
import glob
onnx_files = glob.glob(f"{SEED_ROOT}/models/buffalo_l/*.onnx")
if not onnx_files:
    raise RuntimeError(f"No ONNX files found in {SEED_ROOT}/models/buffalo_l/ after download!")

print("[download_models] Downloaded files:")
for f in sorted(onnx_files):
    size_mb = os.path.getsize(f) / (1024 * 1024)
    print(f"  {os.path.basename(f)}: {size_mb:.1f} MB")

print("[download_models] buffalo_l ready.")
