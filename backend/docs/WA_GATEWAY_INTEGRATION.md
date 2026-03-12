# Integrasi WhatsApp Gateway

Dokumen ini menjadi titik lanjutan untuk implementasi notifikasi WhatsApp ke pegawai,
menggunakan field `nohp` yang sudah ditambahkan ke tabel `pegawai`.

---

## 1. Migrasi Database — Jalankan ini dulu!

Field `nohp` **belum ada** di database yang sudah berjalan. Jalankan perintah SQL berikut
satu kali pada database PostgreSQL sebelum deploy backend terbaru:

```sql
-- Tambah kolom nohp pada tabel pegawai
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS nohp VARCHAR(20);

-- Opsional: tambah index jika sering dicari by nohp
-- CREATE INDEX IF NOT EXISTS ix_pegawai_nohp ON pegawai (nohp);
```

> **Cara eksekusi via Docker:**
> ```bash
> docker exec -it <nama_container_db> psql -U sultan -d attendance_db -c \
>   "ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS nohp VARCHAR(20);"
> ```
> Atau masuk ke psql:
> ```bash
> docker exec -it <nama_container_db> psql -U sultan -d attendance_db
> attendance_db=# ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS nohp VARCHAR(20);
> ```

---

## 2. Status Saat Ini

| Item                          | Status  |
|-------------------------------|---------|
| Kolom `nohp` di model ORM     | ✅ Done  |
| Kolom `nohp` di Pydantic schema | ✅ Done |
| `nohp` di endpoint CRUD pegawai | ✅ Done |
| `nohp` di template & import Excel | ✅ Done |
| Migrasi ALTER TABLE di DB     | ⏳ Manual (jalankan SQL di atas) |
| Service WA Gateway            | ❌ TODO  |
| Endpoint kirim notif WA       | ❌ TODO  |
| Integrasi trigger notif absensi | ❌ TODO |

---

## 3. Rencana Implementasi WA Gateway

### 3.1 Pilihan WA Gateway

Beberapa opsi yang bisa digunakan:

| Gateway          | Keterangan                                      |
|------------------|-------------------------------------------------|
| **Fonnte**       | Berbayar, API sederhana, stabil                 |
| **WA-JS / WAHA** | Self-hosted (Docker), gratis, pakai WA Web      |
| **Whapi.cloud**  | Berbayar SaaS, multi-device                     |
| **Baileys**      | Library Node.js, perlu microservice terpisah    |

Rekomendasi: **WAHA (WhatsApp HTTP API)** — self-hosted, bisa dijalankan via Docker,
tidak perlu biaya per pesan.

---

### 3.2 Contoh Service Class (TODO: implementasi)

```python
# backend/services/wa_service.py
"""
WhatsApp Gateway Service
Kirim notifikasi WA ke pegawai menggunakan nohp dari tabel pegawai.
"""
import httpx
from config.settings import settings


class WAService:
    """Kirim pesan WhatsApp ke nomor pegawai."""

    BASE_URL = settings.WA_GATEWAY_URL          # e.g. http://localhost:3000
    API_KEY  = settings.WA_GATEWAY_API_KEY      # token / API key gateway
    SESSION  = settings.WA_GATEWAY_SESSION      # nama session (WAHA: "default")

    @classmethod
    def _normalize_nohp(cls, nohp: str) -> str:
        """Ubah format nomor ke format internasional tanpa '+' (62xxx)."""
        nohp = nohp.strip().replace("-", "").replace(" ", "")
        if nohp.startswith("0"):
            nohp = "62" + nohp[1:]
        elif nohp.startswith("+"):
            nohp = nohp[1:]
        return nohp

    @classmethod
    async def send_text(cls, nohp: str, pesan: str) -> dict:
        """Kirim pesan teks ke nomor WA."""
        nomor = cls._normalize_nohp(nohp)
        # Format WAHA: chatId = "6281234567890@c.us"
        chat_id = f"{nomor}@c.us"

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{cls.BASE_URL}/api/sendText",
                json={
                    "session": cls.SESSION,
                    "chatId": chat_id,
                    "text": pesan,
                },
                headers={"X-Api-Key": cls.API_KEY},
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def notify_checkin(cls, nohp: str, nama: str, jam: str) -> None:
        """Kirim notifikasi check-in ke pegawai."""
        if not nohp:
            return
        pesan = (
            f"✅ *Konfirmasi Check-In*\n\n"
            f"Halo *{nama}*, kehadiran Anda telah tercatat.\n"
            f"🕐 Jam Masuk: *{jam} WIB*\n\n"
            f"_RSUD Sulfat – Sistem Absensi_"
        )
        await cls.send_text(nohp, pesan)

    @classmethod
    async def notify_checkout(cls, nohp: str, nama: str, jam: str) -> None:
        """Kirim notifikasi check-out ke pegawai."""
        if not nohp:
            return
        pesan = (
            f"🏁 *Konfirmasi Check-Out*\n\n"
            f"Halo *{nama}*, check-out Anda telah tercatat.\n"
            f"🕐 Jam Keluar: *{jam} WIB*\n\n"
            f"_RSUD Sulfat – Sistem Absensi_"
        )
        await cls.send_text(nohp, pesan)

    @classmethod
    async def notify_approval(cls, nohp: str, nama: str, status_approval: str, keterangan: str = "") -> None:
        """Kirim notifikasi hasil approval pengajuan absensi."""
        if not nohp:
            return
        icon = "✅" if status_approval.upper() == "DISETUJUI" else "❌"
        pesan = (
            f"{icon} *Pengajuan Absensi {status_approval}*\n\n"
            f"Halo *{nama}*, pengajuan absensi Anda telah diproses.\n"
            f"Status: *{status_approval}*\n"
        )
        if keterangan:
            pesan += f"Catatan: {keterangan}\n"
        pesan += "\n_RSUD Sulfat – Sistem Absensi_"
        await cls.send_text(nohp, pesan)
```

---

### 3.3 Variabel Environment yang perlu ditambahkan

Tambahkan ke `.env` dan `config/settings.py`:

```env
# WhatsApp Gateway
WA_GATEWAY_URL=http://localhost:3000
WA_GATEWAY_API_KEY=your-api-key-here
WA_GATEWAY_SESSION=default
WA_ENABLED=false
```

```python
# Di class Settings (config/settings.py):
WA_GATEWAY_URL: str = "http://localhost:3000"
WA_GATEWAY_API_KEY: str = ""
WA_GATEWAY_SESSION: str = "default"
WA_ENABLED: bool = False
```

---

### 3.4 Titik integrasi di kode yang sudah ada

Setelah `WAService` siap, tambahkan panggilan di:

| File                                    | Fungsi / Lokasi                        | Aksi                          |
|-----------------------------------------|----------------------------------------|-------------------------------|
| `services/absensi_service.py`           | Setelah check-in berhasil              | `notify_checkin()`            |
| `services/absensi_service.py`           | Setelah check-out berhasil             | `notify_checkout()`           |
| `services/approval_pengajuan_service.py`| Setelah approval diproses              | `notify_approval()`           |

Contoh pemanggilan (fire-and-forget, tidak blokir request):

```python
import asyncio
from services.wa_service import WAService

# Di dalam fungsi check-in (setelah absensi tersimpan):
if settings.WA_ENABLED and pegawai and pegawai.nohp:
    asyncio.create_task(
        WAService.notify_checkin(
            nohp=pegawai.nohp,
            nama=pegawai.nama or username,
            jam=jam_masuk_wib,
        )
    )
```

---

### 3.5 Docker Compose — WAHA (self-hosted)

Tambahkan service berikut ke `docker/docker-compose.yml` atau `deploy/docker-compose.yml`:

```yaml
  waha:
    image: devlikeapro/waha
    container_name: waha
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      WHATSAPP_DEFAULT_ENGINE: WEBJS
      WAHA_API_KEY: "your-api-key-here"
    volumes:
      - waha_data:/app/.waha/sessions
    networks:
      - app_network

volumes:
  waha_data:
```

Setelah container berjalan, buka `http://localhost:3000/dashboard` untuk scan QR code.

---

## 4. Checklist sebelum go-live

- [ ] Jalankan `ALTER TABLE` di database (lihat bagian 1)
- [ ] Isi `nohp` pegawai via halaman admin atau import Excel
- [ ] Deploy WAHA / pilih gateway lain
- [ ] Tambahkan `WA_*` env vars di server
- [ ] Buat `services/wa_service.py` dari template di atas
- [ ] Tambahkan `WA_ENABLED`, `WA_GATEWAY_*` ke `config/settings.py`
- [ ] Tambahkan pemanggilan notif di `absensi_service.py` dan `approval_pengajuan_service.py`
- [ ] Test kirim pesan manual: `POST /api/v1/wa/test` (endpoint opsional untuk testing)
