# PROMPT: Best Practice Upload, Simpan & Tampil Gambar (Banner, Promosi, CMS)

> **Reusable prompt** — pola nyata dari aplikasi `fast-absen` yang sudah terbukti hemat storage,
> seragam ukuran, dan cepat ditampilkan. Cocok untuk upload gambar banner, promosi, konten CMS,
> thumbnail artikel, atau gambar produk di website apapun.

---

## 1. Prinsip Utama

| Prinsip | Aturan |
|---|---|
| **Seragam format** | Selalu konversi ke **JPEG** (atau WebP untuk web modern). Jangan simpan PNG kecuali perlu transparansi |
| **Seragam ukuran** | Tetapkan dimensi max per tipe gambar; resize otomatis di backend saat upload |
| **Kompresi** | Quality `85` = sweet spot — mata tidak bisa membedakan vs quality `100`, tapi ukuran file 60-80% lebih kecil |
| **Penamaan file** | Gunakan UUID atau slug deterministik, bukan nama asli dari user (mencegah path traversal & tabrakan nama) |
| **Struktur folder** | Pisahkan folder per tipe konten: `uploads/banners/`, `uploads/promos/`, `uploads/thumbnails/` |
| **Serve via Nginx** | Jangan serve file statis via FastAPI/Python di production — proxy ke Nginx dengan cache header |
| **Cache header** | `Cache-Control: public, max-age=604800` (7 hari) untuk gambar statis |
| **Batas ukuran upload** | Tetapkan `client_max_body_size` di Nginx; validasi di backend sebelum proses |

---

## 2. Ukuran Gambar per Tipe Konten CMS

| Tipe | Dimensi Max | Rasio Ideal | Quality | Format Output |
|---|---|---|---|---|
| Banner hero (fullscreen) | `1920 × 640` | 3:1 | 82 | JPEG |
| Banner kartu / card | `800 × 450` | 16:9 | 85 | JPEG |
| Thumbnail artikel/berita | `600 × 400` | 3:2 | 85 | JPEG |
| Foto promosi/produk | `1200 × 1200` | 1:1 | 85 | JPEG |
| Logo / ikon kecil | `400 × 400` | 1:1 | 90 | JPEG / PNG |
| Avatar / foto profil | `800 × 800` | 1:1 | 85 | JPEG |
| Galeri foto | `1280 × 960` | 4:3 | 80 | JPEG |

> **Catatan**: Nilai di atas adalah `max`. PIL `thumbnail()` mempertahankan aspect ratio — gambar tidak akan dipaksa ke ukuran itu, hanya diciutkan jika melebihi.

---

## 3. Backend — Pipeline Pengolahan Gambar (FastAPI + Pillow)

### 3a. Install dependencies
```txt
# requirements.txt
Pillow==10.3.0
python-multipart==0.0.9   # untuk UploadFile FastAPI
```

### 3b. Utility fungsi — dapat dipakai ulang untuk semua tipe gambar
```python
# utils/image_processor.py
import io
import os
import uuid
from PIL import Image
from fastapi import HTTPException, UploadFile, status

# Konfigurasi per tipe konten
IMAGE_CONFIGS = {
    "banner":    {"max_size": (1920, 640),  "quality": 82, "subdir": "banners"},
    "promo":     {"max_size": (1200, 1200), "quality": 85, "subdir": "promos"},
    "thumbnail": {"max_size": (600, 400),   "quality": 85, "subdir": "thumbnails"},
    "avatar":    {"max_size": (800, 800),   "quality": 85, "subdir": "photos"},
    "gallery":   {"max_size": (1280, 960),  "quality": 80, "subdir": "gallery"},
}

ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024   # 10 MB — tolak sebelum proses


async def save_image(
    file: UploadFile,
    image_type: str,
    upload_root: str = "uploads",
    filename_prefix: str = "",
) -> str:
    """
    Validasi → baca → konversi → resize → kompresi → simpan.
    Mengembalikan nama file yang tersimpan (bukan path penuh).

    Args:
        file         : UploadFile dari FastAPI
        image_type   : kunci dari IMAGE_CONFIGS ("banner", "promo", dst.)
        upload_root  : root folder upload, misal "uploads"
        filename_prefix : prefix opsional untuk nama file (misal ID entitas)

    Returns:
        filename: str  — nama file yang disimpan, misal "abc123_banner.jpg"
    """
    config = IMAGE_CONFIGS.get(image_type)
    if not config:
        raise ValueError(f"image_type tidak dikenal: {image_type}")

    # 1. Validasi MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format tidak didukung. Gunakan: JPEG, PNG, atau WebP.",
        )

    # 2. Baca konten & validasi ukuran file
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Ukuran file maksimal {MAX_FILE_SIZE // (1024*1024)} MB.",
        )

    try:
        # 3. Buka dengan Pillow
        img = Image.open(io.BytesIO(contents))

        # 4. Konversi RGBA / PNG transparan → RGB + latar putih
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # 5. Resize jika melebihi dimensi max (pertahankan aspect ratio)
        max_w, max_h = config["max_size"]
        if img.width > max_w or img.height > max_h:
            img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

        # 6. Buat nama file unik: {prefix}_{uuid8}.jpg
        uid       = uuid.uuid4().hex[:8]
        prefix    = f"{filename_prefix}_" if filename_prefix else ""
        filename  = f"{prefix}{image_type}_{uid}.jpg"

        # 7. Pastikan folder ada, simpan sebagai JPEG
        save_dir = os.path.join(upload_root, config["subdir"])
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, filename)

        img.save(file_path, "JPEG", optimize=True, quality=config["quality"])
        return filename

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal memproses gambar: {str(e)}",
        )


def delete_image(filename: str, image_type: str, upload_root: str = "uploads") -> None:
    """Hapus file gambar jika ada (untuk replace/delete konten)."""
    config = IMAGE_CONFIGS.get(image_type)
    if not config or not filename:
        return
    path = os.path.join(upload_root, config["subdir"], filename)
    if os.path.exists(path):
        os.remove(path)
```

### 3c. Endpoint FastAPI — contoh Banner CMS
```python
# api/v1/endpoints/banners.py
import os
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session
from config.database import get_db
from utils.image_processor import save_image, delete_image
from utils.response import success_response
from utils.dependencies import require_super_admin
from repositories.banner_repository import BannerRepository

router = APIRouter(prefix="/banners", tags=["Banners"])

UPLOAD_ROOT = os.path.join(os.getcwd(), "uploads")


@router.post("/", status_code=201, dependencies=[Depends(require_super_admin)])
async def create_banner(
    judul:    str        = Form(...),
    deskripsi: str       = Form(""),
    urutan:   int        = Form(0),
    aktif:    bool       = Form(True),
    gambar:   UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload banner baru. Gambar otomatis diresize ke max 1920×640, kualitas 82."""
    filename = await save_image(gambar, image_type="banner", upload_root=UPLOAD_ROOT)
    repo  = BannerRepository(db)
    item  = repo.create({
        "judul": judul, "deskripsi": deskripsi,
        "urutan": urutan, "aktif": aktif, "gambar": filename,
    })
    return success_response(data=item, message="Banner berhasil dibuat")


@router.put("/{banner_id}", dependencies=[Depends(require_super_admin)])
async def update_banner(
    banner_id: int,
    judul:     str              = Form(None),
    deskripsi: str              = Form(None),
    urutan:    int              = Form(None),
    aktif:     bool             = Form(None),
    gambar:    UploadFile | None = File(None),   # opsional — hanya kirim jika ganti gambar
    db: Session = Depends(get_db),
):
    repo   = BannerRepository(db)
    banner = repo.get(banner_id)          # raise 404 jika tidak ada
    data   = {}

    if gambar:
        # Hapus gambar lama sebelum simpan yang baru
        delete_image(banner.gambar, "banner", UPLOAD_ROOT)
        data["gambar"] = await save_image(gambar, "banner", UPLOAD_ROOT)

    if judul     is not None: data["judul"]     = judul
    if deskripsi is not None: data["deskripsi"] = deskripsi
    if urutan    is not None: data["urutan"]    = urutan
    if aktif     is not None: data["aktif"]     = aktif

    item = repo.update(banner_id, data)
    return success_response(data=item, message="Banner diperbarui")


@router.delete("/{banner_id}", status_code=204, dependencies=[Depends(require_super_admin)])
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    repo   = BannerRepository(db)
    banner = repo.get(banner_id)
    delete_image(banner.gambar, "banner", UPLOAD_ROOT)
    repo.delete(banner_id)


@router.get("/", )
def list_banners(aktif: bool | None = None, db: Session = Depends(get_db)):
    repo  = BannerRepository(db)
    items = repo.get_all(aktif=aktif)
    return success_response(data=items)
```

### 3d. Model SQLAlchemy
```python
# models/banner.py
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func
from config.database import Base

class Banner(Base):
    __tablename__ = "banners"
    id          = Column(Integer, primary_key=True)
    judul       = Column(String(200), nullable=False)
    deskripsi   = Column(String(500), nullable=True)
    gambar      = Column(String(200), nullable=False)   # hanya nama file, bukan full URL
    urutan      = Column(Integer, default=0)
    aktif       = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
```

> **Aturan penting**: Simpan **hanya nama file** di database (bukan full URL). URL dibentuk
> secara dinamis di frontend: `${BASE_URL}/uploads/banners/${item.gambar}`.
> Ini memudahkan migrasi domain atau CDN di masa depan tanpa update database.

### 3e. Serve static files via FastAPI (development only)
```python
# main.py — hanya untuk development
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Production: serve via Nginx (lihat Section 5)
```

---

## 4. Frontend — Upload Image dengan Preview

### 4a. Repository
```js
// src/data/repositories/BannerRepository.js
import apiClient from '../api/client';

const BannerRepository = {
  getAll: (aktif = null) => {
    const params = aktif !== null ? `?aktif=${aktif}` : '';
    return apiClient.get(`/banners/${params}`).then(r => r.data);
  },

  create: (formData) =>
    // FormData — jangan set Content-Type manual; axios/browser set multipart otomatis
    apiClient.post('/banners/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  update: (id, formData) =>
    apiClient.put(`/banners/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/banners/${id}`).then(r => r.data),
};
export default BannerRepository;
```

### 4b. Komponen upload dengan preview
```jsx
// src/presentation/components/ImageUploadField.jsx
import { useRef, useState } from 'react';

/**
 * Field upload gambar dengan:
 * - Preview thumbnail sebelum upload
 * - Tampil gambar existing jika mode edit
 * - Validasi tipe & ukuran di frontend (double-check sebelum kirim ke backend)
 *
 * Props:
 *   imageType  : "banner" | "promo" | "thumbnail" | "avatar"   (untuk hint label)
 *   existingUrl: URL gambar existing (mode edit), misal "/uploads/banners/xyz.jpg"
 *   onChange   : (file: File | null) => void
 *   maxMB      : batas ukuran file dalam MB (default 10)
 */
const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp";

const SIZE_HINTS = {
  banner:    "Ideal: 1920×640 px · Maks 10 MB",
  promo:     "Ideal: 1200×1200 px · Maks 10 MB",
  thumbnail: "Ideal: 600×400 px · Maks 10 MB",
  avatar:    "Ideal: 800×800 px · Maks 5 MB",
};

const ImageUploadField = ({
  imageType = "banner",
  existingUrl = null,
  onChange,
  maxMB = 10,
}) => {
  const inputRef   = useRef(null);
  const [preview,  setPreview]  = useState(null);   // blob URL untuk preview
  const [error,    setError]    = useState('');

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi di frontend (backend juga memvalidasi — defence in depth)
    if (!["image/jpeg","image/jpg","image/png","image/webp"].includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPEG, PNG, atau WebP.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${maxMB} MB.`);
      return;
    }

    setError('');
    // Buat blob URL untuk preview lokal (tidak butuh upload dulu)
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    onChange?.(file);
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayUrl = preview || existingUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
      <p className="text-xs text-gray-400 mb-2">{SIZE_HINTS[imageType] ?? "Maks 10 MB"}</p>

      {/* Preview area */}
      {displayUrl ? (
        <div className="relative inline-block mb-3">
          <img
            src={displayUrl}
            alt="Preview"
            className="rounded-lg border border-gray-200 object-cover"
            style={{ maxWidth: 320, maxHeight: 180 }}
          />
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            title="Hapus pilihan"
          >✕</button>
          {preview && (
            <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
              Preview — belum disimpan
            </span>
          )}
        </div>
      ) : (
        // Drop zone / tombol pilih
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          <div className="text-3xl mb-1">🖼️</div>
          <p className="text-sm text-gray-500">Klik untuk pilih gambar</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP</p>
        </button>
      )}

      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
};

export default ImageUploadField;
```

### 4c. Gunakan di halaman CMS
```jsx
// src/presentation/pages/admin/BannerPage.jsx  (pola kunci)
import { useState } from 'react';
import ImageUploadField from '../../../presentation/components/ImageUploadField';
import BannerRepository from '../../../data/repositories/BannerRepository';

const BASE_URL = import.meta.env.VITE_API_URL ?? window.location.origin;

// URL gambar dari nama file yang tersimpan di DB
const imageUrl = (filename, type = 'banners') =>
  filename ? `${BASE_URL}/uploads/${type}/${filename}` : null;

// ── Di dalam form modal ───────────────────────────────────────────────────────
const [gambarFile, setGambarFile] = useState(null);  // File object (baru dipilih)
const [formData,   setFormData]   = useState({ judul: '', deskripsi: '', aktif: true });

const handleSubmit = async (e) => {
  e.preventDefault();

  // Mode create: gambar wajib
  if (modalMode === 'create' && !gambarFile) {
    setFormError('Gambar wajib dipilih.');
    return;
  }

  // Kirim sebagai FormData (multipart)
  const fd = new FormData();
  fd.append('judul',     formData.judul);
  fd.append('deskripsi', formData.deskripsi);
  fd.append('aktif',     formData.aktif);
  if (gambarFile) fd.append('gambar', gambarFile);  // hanya append jika ada file baru

  try {
    if (modalMode === 'create') await BannerRepository.create(fd);
    else                        await BannerRepository.update(editingId, fd);
    closeModal();
    fetchBanners();
  } catch (err) {
    setFormError(formatErrorMessage(err, 'Gagal menyimpan banner'));
  }
};

// ── JSX dalam modal ────────────────────────────────────────────────────────
<ImageUploadField
  imageType="banner"
  existingUrl={modalMode === 'edit' ? imageUrl(editingItem?.gambar) : null}
  onChange={setGambarFile}
/>

// ── Tampilkan gambar di tabel ────────────────────────────────────────────────
{item.gambar ? (
  <img
    src={imageUrl(item.gambar)}
    alt={item.judul}
    className="w-20 h-12 object-cover rounded border border-gray-200"
    loading="lazy"                       // lazy load — penting di tabel panjang
    onError={(e) => { e.currentTarget.style.display = 'none'; }}
  />
) : (
  <span className="text-gray-400 text-xs">Tidak ada gambar</span>
)}
```

### 4d. Cache-busting setelah replace gambar
```jsx
// Jika filename sama setelah update (misal pakai ID sebagai filename),
// paksa browser reload dengan query string versi:
const [imgVersion, setImgVersion] = useState(Date.now());

// Setelah upload sukses:
setImgVersion(Date.now());

// Di img src:
<img src={`${imageUrl(item.gambar)}?v=${imgVersion}`} ... />
```

---

## 5. Nginx — Serve Upload + Cache Header

```nginx
# nginx.conf

# Upload gambar — serve langsung oleh Nginx (atau proxy ke backend)
location /uploads/ {
    # Opsi A: serve langsung dari filesystem (lebih cepat)
    alias /app/uploads/;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";

    # Keamanan: blokir eksekusi script di folder upload
    location ~* \.(php|py|sh|cgi|pl)$ {
        return 403;
    }

    # Hanya izinkan akses file gambar
    location ~* \.(jpg|jpeg|png|webp|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }
}

# Opsi B: proxy ke backend (pola dari aplikasi ini)
location /uploads/ {
    proxy_pass         http://backend:8000/uploads/;
    proxy_read_timeout 30s;
    add_header Cache-Control "public, max-age=604800, immutable";
}

# Batas ukuran upload di Nginx (harus >= batas di backend)
client_max_body_size 15m;
```

---

## 6. Struktur Folder Upload

```
uploads/
├── banners/           # 1920×640  — banner hero homepage
│   └── banner_a3f8c1.jpg
├── promos/            # 1200×1200 — banner promosi/produk
│   └── promo_7d2e09.jpg
├── thumbnails/        # 600×400   — thumbnail artikel/berita
│   └── thumbnail_4b1c88.jpg
├── photos/            # 800×800   — foto profil/avatar
│   └── EMP001.jpg
└── gallery/           # 1280×960  — galeri foto event
    └── gallery_9f33aa.jpg
```

**Aturan penamaan file:**
- Gunakan `{prefix}_{type}_{uuid8}.jpg` — contoh: `banner_a3f8c1.jpg`
- Atau deterministik: `{entity_id}.jpg` — contoh: `EMP001.jpg` (overwrite saat update)
- **Jangan** gunakan nama asli file dari user (`foto liburan baru.jpg`) — risiko path traversal & tabrakan

---

## 7. Model Database — Pola Umum

```python
# Simpan hanya nama file, bukan full URL
class Banner(Base):
    gambar = Column(String(200), nullable=False)   # "banner_a3f8c1.jpg"
    # ❌ JANGAN: Column(String(500))  → "https://domain.com/uploads/banners/banner_a3f8c1.jpg"
    # ✅ Benar:  Column(String(200))  → "banner_a3f8c1.jpg"
```

**Kenapa hanya nama file?**
- Mudah pindah domain (CDN, subdomain baru) — cukup update `BASE_URL` di frontend
- Tidak ada dead link di database jika URL berubah
- Query database lebih bersih

---

## 8. Checklist Implementasi

### Backend
- [ ] Install `Pillow` dan `python-multipart` di `requirements.txt`
- [ ] Buat `utils/image_processor.py` dengan `IMAGE_CONFIGS` per tipe konten
- [ ] Validasi MIME type (bukan hanya ekstensi) di `save_image()`
- [ ] Validasi ukuran file maksimal sebelum proses PIL
- [ ] Konversi RGBA/PNG → RGB + background putih sebelum simpan JPEG
- [ ] Resize dengan `thumbnail()` + `LANCZOS` (bukan `resize()` — agar tidak stretch)
- [ ] Simpan dengan `optimize=True, quality=85` (sesuaikan per tipe)
- [ ] Nama file: UUID atau ID entitas, **bukan** nama asli dari user
- [ ] Buat folder dengan `os.makedirs(exist_ok=True)` sebelum simpan
- [ ] Hapus file lama saat update/delete entitas (`delete_image()`)
- [ ] Simpan **hanya nama file** (bukan URL) di kolom database
- [ ] Mount static files di `main.py` (development only) atau proxy via Nginx

### Frontend
- [ ] Kirim gambar sebagai `FormData` dengan field name yang sesuai
- [ ] Jangan set `Content-Type` manual — biarkan browser/axios yang set boundary
- [ ] Validasi tipe & ukuran di frontend (defence in depth)
- [ ] Gunakan `URL.createObjectURL()` untuk preview lokal sebelum upload
- [ ] Revoke blob URL dengan `URL.revokeObjectURL()` setelah tidak dipakai (mencegah memory leak)
- [ ] Tambah `loading="lazy"` pada `<img>` di dalam tabel/list
- [ ] Cache-busting dengan `?v=${timestamp}` saat gambar di-replace dengan nama sama
- [ ] Tampilkan fallback (`onError`) jika gambar gagal load

### Nginx (production)
- [ ] Set `client_max_body_size` ≥ batas max file di backend
- [ ] Tambah `Cache-Control: public, max-age=604800` untuk folder uploads
- [ ] Blokir eksekusi `.php`, `.py`, `.sh` di folder uploads
- [ ] Gunakan `alias` atau `proxy_pass` untuk serve file statis (bukan lewat Python)

---

## 9. Perbandingan Ukuran File (estimasi nyata)

| Skenario | Ukuran Asli | Setelah Optimasi | Hemat |
|---|---|---|---|
| Foto DSLR 4000×3000 | 5 MB | ≈ 120 KB | **97%** |
| Screenshot 1920×1080 | 2 MB | ≈ 80 KB | **96%** |
| Screenshot PNG 800×600 | 800 KB | ≈ 60 KB | **92%** |
| Foto HP 2000×2000 | 1.5 MB | ≈ 100 KB | **93%** |
| Banner desainer 1920×640 JPEG | 400 KB | ≈ 150 KB | **62%** |

> Dengan 100 banner/promosi: **tanpa** optimasi ≈ 200 MB, **dengan** optimasi ≈ 12 MB.

---

## 10. Tabel Referensi Pola

| Pola | Sumber di Aplikasi | Berlaku Untuk |
|---|---|---|
| `img.thumbnail(max_size, LANCZOS)` | `pegawai_service._save_photo()` | Semua resize gambar |
| `img.save("JPEG", optimize=True, quality=85)` | `pegawai_service._save_photo()` | Semua output gambar |
| RGBA → RGB + background putih | `pegawai_service._save_photo()` | Upload PNG transparan |
| Simpan hanya nama file di DB | `pegawai.foto` column | Semua entitas dengan gambar |
| `os.makedirs(exist_ok=True)` | `pegawai_service.__init__` | Inisialisasi folder upload |
| `Cache-Control: max-age=604800` | `deploy/nginx.conf /uploads/` | Semua file upload statis |
| `URL.createObjectURL()` preview | `AttendanceDashboardPage` foto upload | Preview gambar sebelum kirim |
| `loading="lazy"` | Best practice web | Gambar di tabel/list panjang |
| `?v=${timestamp}` cache-bust | `AttendanceDashboardPage` fotoKey | Replace gambar nama sama |
