# Prompt Backend WhatsApp Gateway – FastAPI

> Dokumen ini berisi narasi arsitektur, best practice, dan prompt lengkap untuk
> membangun **WhatsApp Gateway** menggunakan FastAPI.  
> Fungsi utama: meneruskan (*proxy/forward*) permintaan kirim WA dari aplikasi internal
> ke provider eksternal (contoh: **WatZap API**).

---

## Referensi Kode Asal (Express.js)

```js
// Express gateway sederhana — dua endpoint utama:
// POST /cekwa  → cek status API Key ke watzap.id
// POST /sendwa → kirim pesan WhatsApp via watzap.id
// Semua request/response di-log ke file nedb (logs.db)
```

---

## Narasi Arsitektur

### Mengapa FastAPI?

| Aspek | Express (asal) | FastAPI (target) |
|---|---|---|
| Type safety | Tidak ada | Pydantic schema — validated otomatis |
| Docs | Manual | `/docs` SwaggerUI gratis otomatis |
| Async | Callback / promise | Native `async/await` + httpx async |
| Logging | Override `res.send` | Middleware standar + structured JSON |
| Config | Hardcode di kode | `pydantic-settings` dari `.env` |
| Rate limiting | Tidak ada | `slowapi` per endpoint |
| Retry + timeout | Tidak ada | `httpx` dengan retry policy |

### Pola Arsitektur

```
Client (internal app / RSUD system)
        │  HTTP POST /send-message
        ▼
┌──────────────────────────────────────┐
│  FastAPI WhatsApp Gateway            │
│                                      │
│  [Middleware]                        │
│    RequestIDMiddleware               │
│    RequestLoggingMiddleware          │
│    RateLimitMiddleware (slowapi)     │
│                                      │
│  [Route]                             │
│    POST /api/v1/whatsapp/send        │
│    POST /api/v1/whatsapp/check-key   │
│    GET  /api/v1/whatsapp/logs        │
│    GET  /health                      │
│                                      │
│  [Service Layer]                     │
│    WatzapService → forward ke luar  │
│    LogService    → simpan ke DB     │
│                                      │
│  [External Call via httpx]           │
│    timeout, retry, error handling   │
└──────────────────────────────────────┘
        │
        ▼
  https://api.watzap.id/v1/...
```

---

## Best Practice yang Wajib Diimplementasikan

### 1. Konfigurasi via `.env` — Jangan Hardcode Credential

```env
# .env
APP_NAME=WA Gateway
APP_VERSION=1.0.0
ENVIRONMENT=production
DEBUG=false

WATZAP_API_KEY=QT28F8HQGJAXHFDP
WATZAP_NUMBER_KEY=zWcjk0BtqE0LkpvY
WATZAP_BASE_URL=https://api.watzap.id/v1
WATZAP_TIMEOUT_SECONDS=15
WATZAP_MAX_RETRIES=3
WATZAP_SEND_DELAY_SECONDS=30         # jeda tetap setelah SETIAP pesan berhasil dikirim (reguler)
WATZAP_RETRY_DELAY_SECONDS=30        # jeda tetap antar percobaan ulang (saat gagal)

DATABASE_URL=postgresql://user:pass@localhost:5432/wa_gateway_db
QUEUE_CLEANUP_AFTER_DAYS=7           # hapus baris 'sent' di message_queue setelah N hari

GATEWAY_API_KEY=<kunci_rahasia_untuk_autentikasi_client_internal>

CORS_ORIGINS=["http://localhost:3000","https://kalijaga.fun"]
RATE_LIMIT_PER_MINUTE=30
```

### 2. Autentikasi Client Internal — API Key Header

Gateway harus dilindungi agar **hanya aplikasi internal** yang bisa menggunakannya.
Gunakan `X-Gateway-API-Key` header:

```python
# utils/dependencies.py
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-Gateway-API-Key", auto_error=False)

def require_gateway_key(key: str = Security(api_key_header)):
    if key != settings.GATEWAY_API_KEY:
        raise HTTPException(status_code=403, detail="Akses ditolak: API key tidak valid")
    return key
```

### 3. Async HTTP Client dengan Dua Lapis Jeda (Kirim + Retry)

Gunakan `httpx` (bukan `requests`) karena fully async.  
Ada **dua env var jeda yang berbeda fungsi** — keduanya wajib diimplementasikan:

| Env Var | Kapan aktif | Default |
|---|---|---|
| `WATZAP_SEND_DELAY_SECONDS` | Setelah **setiap** pesan berhasil dikirim (reguler) | 30 detik |
| `WATZAP_RETRY_DELAY_SECONDS` | Antar percobaan ulang saat **gagal** | 30 detik |

```python
# utils/http_client.py
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

@retry(
    stop=stop_after_attempt(settings.WATZAP_MAX_RETRIES),      # default 3x
    wait=wait_fixed(settings.WATZAP_RETRY_DELAY_SECONDS),      # jeda antar retry
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    reraise=True
)
async def forward_request(url: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=settings.WATZAP_TIMEOUT_SECONDS) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()
```

```python
# services/watzap_service.py
import asyncio

async def send_message(phone_no: str, message: str) -> dict:
    result = await forward_request(
        url=f"{settings.WATZAP_BASE_URL}/send_message",
        payload={ ... }
    )
    # ← Jeda reguler setelah SETIAP pesan berhasil dikirim keluar
    # (berlaku untuk semua pesan, bukan hanya retry)
    await asyncio.sleep(settings.WATZAP_SEND_DELAY_SECONDS)  # default 30 detik
    return result
```

> **Mengapa dua jeda terpisah?**  
> `WATZAP_SEND_DELAY_SECONDS` → pacing normal, diterapkan bahkan saat sukses pertama kali.  
> `WATZAP_RETRY_DELAY_SECONDS` → cooldown khusus setelah error, boleh diset lebih panjang jika provider butuh recovery time.  
> Memisahkan keduanya memudahkan tuning tanpa harus ubah kode.

### 4. Logging Terstruktur ke Database

Setiap request dan response disimpan ke DB untuk audit trail dan debugging:

```python
# models/gateway_log.py — tabel log
class GatewayLog(BaseModel):
    __tablename__ = "gateway_logs"

    request_id   = Column(String(36), index=True)
    phone_no     = Column(String(20), nullable=True)
    message_text = Column(Text, nullable=True)
    provider_url = Column(String(255))
    status_code  = Column(Integer)
    request_body = Column(JSON)
    response_body= Column(JSON)
    duration_ms  = Column(Integer)
    is_success   = Column(Boolean, default=False)
    error_detail = Column(Text, nullable=True)
```

### 5. Rate Limiting per IP / per Key

```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/send")
@limiter.limit("30/minute")
async def send_message(request: Request, ...):
    ...
```

### 6. Validasi Input Ketat dengan Pydantic

```python
import re
from pydantic import field_validator

class SendMessageRequest(BaseSchema):
    phone_no: str       # Nomor internasional: 628123456789
    message:  str

    @field_validator("phone_no")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace("+", "").replace("-", "").replace(" ", "")
        if not re.match(r"^62\d{8,13}$", v):
            raise ValueError("Format nomor tidak valid. Gunakan format 628xxx (tanpa + atau 0 di depan)")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if len(v.strip()) == 0:
            raise ValueError("Pesan tidak boleh kosong")
        if len(v) > 4000:
            raise ValueError("Pesan maksimal 4000 karakter")
        return v.strip()
```

### 7. Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
```

### 8. Idempotency Key (Cegah Kirim Pesan Duplikat)

Client menyertakan `Idempotency-Key` header. Jika request dengan key yang sama sudah
pernah sukses, kembalikan response lama tanpa mengirim ulang ke WatZap:

```python
# Header: Idempotency-Key: <uuid-unik-per-pesan>
# Jika key ditemukan di cache/DB dan status sukses → return response lama
# Jika tidak ada → proses normal → simpan hasilnya
```

---

## PostgreSQL sebagai Antrian Sementara — Best Practice Multi-App

### Konteks: Banyak Aplikasi, Satu Gateway, < 1.000 Pesan/Hari

```
  Aplikasi Absensi ──┐
  Aplikasi Klinik  ──┼──→ POST /api/v1/whatsapp/send (+ X-Gateway-API-Key)
  Aplikasi Farmasi ──┘             │
                                   ↓
                        message_queue (PostgreSQL)
                        status: pending → sent → DIHAPUS
                                              ↘
                                        gateway_logs (audit trail permanen)
```

**Prinsip utama:** `message_queue` adalah tabel **kerja sementara** — bersih dari baris
yang sudah selesai. `gateway_logs` adalah tabel **audit permanen** — tidak pernah dihapus.

### Skema Tabel yang Direkomendasikan

```sql
-- Tabel antrian SEMENTARA — baris sent dihapus otomatis
CREATE TABLE message_queue (
    id               SERIAL PRIMARY KEY,
    phone_no         VARCHAR(20)   NOT NULL,
    message_text     TEXT          NOT NULL,
    source_app       VARCHAR(50)   NOT NULL DEFAULT 'unknown',
      -- nama app pengirim: 'absensi', 'klinik', 'farmasi', dll.
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',
      -- pending | processing | sent | failed | cancelled
    retry_count      INTEGER       NOT NULL DEFAULT 0,
    max_retries      INTEGER       NOT NULL DEFAULT 3,
    next_retry_at    TIMESTAMP,
    sent_at          TIMESTAMP,
    error_detail     TEXT,
    idempotency_key  VARCHAR(64)   UNIQUE,
    created_at       TIMESTAMP     NOT NULL DEFAULT now()
);

-- Index untuk query scheduler (ambil baris pending yang sudah waktunya)
CREATE INDEX idx_mq_status_next ON message_queue (status, next_retry_at)
    WHERE status IN ('pending', 'processing');

-- Tabel log PERMANEN — tidak pernah dihapus, untuk audit & debug
CREATE TABLE gateway_logs (
    id             SERIAL PRIMARY KEY,
    request_id     VARCHAR(36)   NOT NULL,
    source_app     VARCHAR(50)   NOT NULL DEFAULT 'unknown',
    phone_no       VARCHAR(20),
    message_text   TEXT,
    provider_url   VARCHAR(255),
    status_code    INTEGER,
    is_success     BOOLEAN       NOT NULL DEFAULT FALSE,
    retry_count    INTEGER       NOT NULL DEFAULT 0,
    duration_ms    INTEGER,
    error_detail   TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT now()
);
```

### Strategi Cleanup Otomatis (APScheduler)

```python
# utils/scheduler.py
async def cleanup_sent_messages():
    """
    Hapus baris 'sent' dari message_queue setelah QUEUE_CLEANUP_AFTER_DAYS hari.
    Data audit permanen tetap ada di gateway_logs.
    Jalankan: sekali sehari (jam 02.00)
    """
    cutoff = datetime.now() - timedelta(days=settings.QUEUE_CLEANUP_AFTER_DAYS)
    deleted = db.execute(
        "DELETE FROM message_queue WHERE status = 'sent' AND sent_at < :cutoff",
        {"cutoff": cutoff}
    ).rowcount
    logger.info(f"Cleanup: {deleted} sent messages removed from queue")

async def cleanup_failed_messages():
    """
    Hapus baris 'failed' yang sudah > 30 hari.
    Biarkan lebih lama agar admin sempat review.
    """
    cutoff = datetime.now() - timedelta(days=30)
    db.execute(
        "DELETE FROM message_queue WHERE status = 'failed' AND created_at < :cutoff",
        {"cutoff": cutoff}
    )
```

### Identifikasi Aplikasi Pengirim (`source_app`)

Karena banyak aplikasi mengirim ke gateway yang sama, tambahkan kolom `source_app`
di request body agar log mudah difilter:

```json
// Body request dari aplikasi pengirim
{
  "phone_no": "628123456789",
  "message": "Jadwal sholat hari ini...",
  "source_app": "absensi"   // ← nama aplikasi pengirim
}
```

Alternatif: deduksi otomatis dari `X-Gateway-API-Key` jika setiap app punya key berbeda:

```python
# Satu key per aplikasi (lebih aman, audit lebih granular)
APP_KEYS = {
    "key_absensi_xxx": "absensi",
    "key_klinik_xxx":  "klinik",
    "key_farmasi_xxx": "farmasi",
}
```

### Mengapa PostgreSQL, Bukan SQLite?

| Aspek | SQLite | PostgreSQL |
|---|---|---|
| Write concurrent (multi-app) | ❌ Lock saat write, sering conflict | ✅ MVCC — aman multi-app simultan |
| DELETE + SELECT bersamaan | ❌ Bisa corrupt / deadlock | ✅ Aman |
| Partial index (`WHERE status IN`) | ❌ Tidak support | ✅ Support — scheduler query lebih cepat |
| Sudah ada di stack RSUD | — | ✅ PostgreSQL sudah jalan untuk absensi |
| Backup & restore | File copy | pg_dump — standar |
| Volume < 1.000/hari | Cukup | Lebih dari cukup |

**Kesimpulan: gunakan PostgreSQL yang sudah ada.** Cukup buat database baru
`wa_gateway_db` di server PostgreSQL yang sama — tidak perlu server baru.

---

## Perlu Message Broker atau FastAPI Sudah Cukup?

### Kapan FastAPI Saja Sudah Cukup

Untuk **gateway RSUD internal** dengan traffic rendah-menengah (ratusan pesan/hari),
FastAPI + BackgroundTask **sudah cukup** selama:

| Kondisi | Solusi FastAPI Native |
|---|---|
| Volume pesan < 500/hari | `BackgroundTasks` — fire and forget |
| Retry 3x, jeda 30 detik | `tenacity` dengan `wait_fixed` |
| Jeda antar pesan | `asyncio.sleep()` di service |
| Log pengiriman | Simpan ke PostgreSQL |
| Status per pesan | Kolom `status` + `retry_count` di tabel |
| Restart aman | Tandai pesan `pending` di DB saat startup, lanjutkan |

```python
# Contoh: endpoint /send menggunakan BackgroundTasks
@router.post("/send")
async def send_message(
    body: SendMessageRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _key = Depends(require_gateway_key)
):
    # Simpan dulu ke DB dengan status "pending"
    log = log_service.create_pending(db, body)

    # Kirim di background — tidak blokir response ke client
    background_tasks.add_task(watzap_service.send_with_retry, log.id, db)

    return success_response("Pesan masuk antrian", data={"log_id": log.id})
```

### Kapan Perlu Message Broker (Redis/RabbitMQ/Kafka)

Tambahkan message broker **hanya jika** salah satu kondisi ini terjadi:

| Kondisi | Alasan Butuh Broker |
|---|---|
| Volume > 5.000 pesan/hari | BackgroundTask tidak punya antrean persisten — restart = hilang |
| Multi-instance / horizontal scaling | Dua instance bisa kirim pesan yang sama dua kali |
| Blast ke banyak nomor sekaligus | Perlu worker pool + rate control terpusat |
| Prioritas pesan (urgent vs normal) | Broker punya native priority queue |
| Integrasi sistem lain (notifikasi lab, dll) | Broker jadi event bus antar service |

### Rekomendasi Bertahap

```
Tahap 1 — FastAPI + BackgroundTask + DB Queue
  Cocok untuk: RSUD internal, volume rendah, satu server
  Stack: FastAPI + PostgreSQL + tenacity
  Waktu implementasi: 1-2 hari

Tahap 2 — FastAPI + Celery + Redis  (jika volume naik)
  Cocok untuk: blast notifikasi ke banyak pegawai/pasien
  Stack: FastAPI + Celery + Redis + Flower (monitoring)
  Waktu implementasi: 2-3 hari tambahan

Tahap 3 — FastAPI + RabbitMQ/Kafka  (enterprise scale)
  Cocok untuk: multi-sistem, event-driven architecture
  Stack: FastAPI + RabbitMQ + konsumer terpisah
  Waktu implementasi: 1+ minggu
```

**Untuk RSUD Sulfat saat ini → Tahap 1 sudah lebih dari cukup.**

### Pola DB Queue (Tanpa Broker Eksternal)

Simpan pesan di tabel `message_queue` dengan kolom `status` dan `retry_count`.
Saat startup, FastAPI otomatis lanjutkan pesan yang tertunda:

```sql
-- Tabel message_queue
CREATE TABLE message_queue (
    id            SERIAL PRIMARY KEY,
    phone_no      VARCHAR(20)  NOT NULL,
    message_text  TEXT         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
      -- pending | processing | sent | failed | cancelled
    retry_count   INTEGER      NOT NULL DEFAULT 0,
    max_retries   INTEGER      NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    sent_at       TIMESTAMP,
    error_detail  TEXT,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);
```

```python
# utils/scheduler.py — jalankan setiap menit via APScheduler
async def process_pending_messages():
    """Ambil pesan pending/retry yang sudah waktunya, kirim satu per satu."""
    messages = queue_repo.get_due_messages(limit=10)  # ambil 10 per batch
    for msg in messages:
        await watzap_service.send_with_retry(msg.id)
        await asyncio.sleep(settings.WATZAP_INTER_MESSAGE_DELAY_SECONDS)  # jeda 30 detik
```

---

## Prompt Lengkap untuk AI Coding Assistant

```
Kamu adalah senior backend engineer Python. Bangun REST API WhatsApp Gateway
menggunakan FastAPI yang berfungsi sebagai proxy/forwarder ke provider WhatsApp
eksternal (watzap.id). Ikuti semua standar dan struktur di bawah ini.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNGSI UTAMA GATEWAY

Gateway menerima HTTP request dari aplikasi internal, mem-forward ke watzap API,
menyimpan log, dan mengembalikan response ke client.

Endpoint yang dibutuhkan:

  POST /api/v1/whatsapp/send
    → Kirim pesan WhatsApp ke nomor tujuan
    → Body: { "phone_no": "628xxx", "message": "teks pesan" }
    → Response: hasil dari watzap + metadata log

  POST /api/v1/whatsapp/check-key
    → Cek status & validitas API Key ke watzap
    → Tidak butuh body (gunakan key dari .env)

  GET  /api/v1/whatsapp/logs
    → List log pengiriman (pagination: page, limit)
    → Filter opsional: phone_no, is_success, date_from, date_to
    → Dilindungi API Key

  GET  /health
    → Status service, versi, environment (no auth needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARSITEKTUR — CLEAN ARCHITECTURE 4 LAPIS

Buat file terpisah untuk setiap lapisan:

  models/         → SQLAlchemy ORM (tabel gateway_logs, dll)
  repositories/   → Query DB (LogRepository)
  services/       → Business logic (WatzapService, LogService)
  api/v1/         → FastAPI router & endpoints
  schemas/        → Pydantic request/response schema
  config/         → settings.py (pydantic-settings dari .env)
  utils/          → dependencies.py, response.py, middleware.py,
                    http_client.py, exception_handlers.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STANDAR AUTENTIKASI CLIENT

Semua endpoint (kecuali /health) wajib memiliki header:
  X-Gateway-API-Key: <nilai dari env GATEWAY_API_KEY>

Implementasikan sebagai FastAPI dependency:
  def require_gateway_key(key: str = Security(api_key_header)):
      if key != settings.GATEWAY_API_KEY:
          raise HTTPException(403, "Akses ditolak")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STANDAR HTTP CLIENT KE WATZAP

Gunakan httpx (BUKAN requests) secara async.
Ada DUA jeda yang berbeda, keduanya wajib diimplementasikan:

  WATZAP_SEND_DELAY_SECONDS (default 30)
    → asyncio.sleep() setelah SETIAP pesan sukses dikirim (reguler)
    → Diterapkan di watzap_service.send_message(), setelah forward_request berhasil
    → Berlaku untuk semua pesan, bukan hanya retry

  WATZAP_RETRY_DELAY_SECONDS (default 30)
    → wait_fixed() antar percobaan ulang saat gagal (tenacity)
    → Diterapkan di http_client.forward_request() sebagai wait_fixed

Wajib implementasikan:
  - Timeout: WATZAP_TIMEOUT_SECONDS (default 15 detik)
  - Retry: WATZAP_MAX_RETRIES kali (default 3)
  - Gunakan wait_fixed (bukan exponential) — predictable, tidak spam provider
  - Error mapping:
      httpx.TimeoutException  → 504 Gateway Timeout
      httpx.ConnectError      → 502 Bad Gateway
      4xx dari watzap         → teruskan status + pesan error
      5xx dari watzap         → 502 Bad Gateway + log error

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STANDAR LOGGING KE DATABASE

Setiap request ke endpoint /send dan /check-key harus disimpan ke tabel
gateway_logs dengan kolom:

  id            SERIAL PRIMARY KEY
  request_id    VARCHAR(36)     -- dari X-Request-ID middleware
  phone_no      VARCHAR(20)
  message_text  TEXT
  provider_url  VARCHAR(255)
  status_code   INTEGER
  request_body  JSONB
  response_body JSONB
  duration_ms   INTEGER
  is_success    BOOLEAN
  error_detail  TEXT
  retry_count   INTEGER DEFAULT 0
  created_at    TIMESTAMP

Implementasikan via LogService yang dipanggil di akhir setiap request
(gunakan background_task FastAPI agar tidak memblokir response).

TABEL ANTRIAN PESAN (DB QUEUE — PostgreSQL, bukan SQLite)

Dua tabel dengan peran berbeda:

  message_queue — tabel KERJA SEMENTARA, baris sent dihapus otomatis
  ───────────────────────────────────────────────────────────────────
  id               SERIAL PRIMARY KEY
  phone_no         VARCHAR(20)  NOT NULL
  message_text     TEXT         NOT NULL
  source_app       VARCHAR(50)  NOT NULL DEFAULT 'unknown'  ← nama app pengirim
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   -- pending | processing | sent | failed | cancelled
  retry_count      INTEGER      NOT NULL DEFAULT 0
  max_retries      INTEGER      NOT NULL DEFAULT 3   -- dari env WATZAP_MAX_RETRIES
  next_retry_at    TIMESTAMP    -- kapan boleh dicoba lagi
  sent_at          TIMESTAMP
  error_detail     TEXT
  idempotency_key  VARCHAR(64)  UNIQUE
  created_at       TIMESTAMP    NOT NULL DEFAULT now()

  gateway_logs — tabel AUDIT PERMANEN, tidak pernah dihapus
  ────────────────────────────────────────────────────────────
  id, request_id, source_app, phone_no, message_text,
  provider_url, status_code, is_success, retry_count,
  duration_ms, error_detail, created_at

Alur:
  1. /send masuk → simpan ke message_queue status=pending → return 202 Accepted
     (response cepat ke client — tidak tunggu WA terkirim)
  2. APScheduler (tiap 1 menit) ambil baris pending FIFO → set status=processing
  3. Kirim ke watzap:
     - Sukses → status=sent, sent_at=now + simpan ke gateway_logs
               → asyncio.sleep(WATZAP_SEND_DELAY_SECONDS) sebelum pesan berikutnya
     - Gagal  → retry_count++, next_retry_at = now + WATZAP_RETRY_DELAY_SECONDS
               → asyncio.sleep(WATZAP_RETRY_DELAY_SECONDS)
  4. Jika retry_count >= max_retries → status=failed
  5. Cleanup harian (jam 02.00):
     - DELETE FROM message_queue WHERE status='sent'
       AND sent_at < now() - INTERVAL 'QUEUE_CLEANUP_AFTER_DAYS days'
     - DELETE FROM message_queue WHERE status='failed'
       AND created_at < now() - INTERVAL '30 days'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDASI INPUT

Gunakan Pydantic dengan @field_validator:

  phone_no:
    - Strip +, -, spasi
    - Harus format 62xxxxxxxx (8–13 digit setelah 62)
    - Regex: ^62\d{8,13}$

  message:
    - Wajib tidak kosong setelah strip
    - Maksimal 4000 karakter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RATE LIMITING

Gunakan slowapi:
  - /send        : 30 request/menit per IP
  - /check-key   : 10 request/menit per IP
  - /logs        : 60 request/menit per IP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEMPOTENCY (OPSIONAL TAPI DIREKOMENDASIKAN)

Client boleh menyertakan header: Idempotency-Key: <uuid>
Jika key sama sudah ada di DB dan is_success=true:
  → Return response lama (HTTP 200) tanpa hit watzap lagi
  → Tambahkan header X-Idempotent-Replayed: true di response
Jika belum ada → proses normal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STANDAR RESPONSE FORMAT

Semua response gunakan helper:

  // Sukses kirim pesan
  {
    "success": true,
    "message": "Pesan berhasil dikirim",
    "data": {
      "request_id": "uuid",
      "phone_no": "628123456789",
      "provider_response": { ...dari watzap... },
      "duration_ms": 342
    }
  }

  // Error (dari exception handler)
  {
    "success": false,
    "message": "Deskripsi error",
    "error_code": "TIMEOUT" | "INVALID_PHONE" | "PROVIDER_ERROR" | ...
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MIDDLEWARE (urutan di main.py)

  1. RequestIDMiddleware    — inject X-Request-ID UUID4 ke setiap request & response
  2. RequestLoggingMiddleware — log: method, path, status, duration, request_id
  3. CORSMiddleware
  4. SlowAPI (rate limit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXCEPTION HANDLER

  app.add_exception_handler(StarletteHTTPException, http_exception_handler)
  app.add_exception_handler(RequestValidationError, validation_exception_handler)
  app.add_exception_handler(Exception, general_exception_handler)

Semua handler return format { success: false, message, error_code }.
general_exception_handler harus log full traceback tapi return pesan generik ke client.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KONFIGURASI (.env)

  APP_NAME=WA Gateway
  APP_VERSION=1.0.0
  ENVIRONMENT=production
  DEBUG=false

  WATZAP_API_KEY=<isi>
  WATZAP_NUMBER_KEY=<isi>
  WATZAP_BASE_URL=https://api.watzap.id/v1
  WATZAP_TIMEOUT_SECONDS=15
  WATZAP_MAX_RETRIES=3
  WATZAP_SEND_DELAY_SECONDS=30           # jeda setelah SETIAP pesan berhasil dikirim (reguler)
  WATZAP_RETRY_DELAY_SECONDS=30          # jeda khusus antar percobaan ulang (saat gagal)

  DATABASE_URL=postgresql://user:pass@localhost:5432/wa_gateway_db
  QUEUE_CLEANUP_AFTER_DAYS=7             # hapus baris 'sent' dari message_queue setelah N hari

  # Satu key per aplikasi pengirim (lebih aman dari satu key shared)
  # Key absensi:
  GATEWAY_API_KEY_ABSENSI=<key_absensi_32_karakter>
  # Key klinik:
  GATEWAY_API_KEY_KLINIK=<key_klinik_32_karakter>
  # Atau gunakan satu key shared + field source_app di request body
  GATEWAY_API_KEY=<kunci_panjang_random_minimal_32_karakter>

  CORS_ORIGINS=["http://localhost:3000"]
  RATE_LIMIT_PER_MINUTE=30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRUKTUR DIREKTORI

  wa-gateway/
  ├── main.py
  ├── run.py
  ├── requirements.txt
  ├── .env.example
  ├── Dockerfile
  │
  ├── api/v1/
  │   ├── router.py
  │   └── endpoints/
  │       └── whatsapp.py
  │
  ├── models/
  │   ├── base.py
  │   ├── gateway_log.py
  │   └── message_queue.py    ← tabel antrian pesan persisten
  │
  ├── repositories/
  │   ├── base.py
  │   ├── log_repository.py
  │   └── queue_repository.py ← get_due_messages(), update_status(), increment_retry()
  │
  ├── services/
  │   ├── watzap_service.py   ← forward ke watzap API + retry logic
  │   ├── queue_service.py    ← enqueue, process, retry scheduling
  │   └── log_service.py      ← simpan & query log
  │
  ├── schemas/
  │   ├── base.py
  │   └── whatsapp.py         ← SendMessageRequest, SendMessageResponse, LogResponse
  │
  ├── config/
  │   ├── settings.py
  │   └── database.py
  │
  └── utils/
      ├── dependencies.py     ← require_gateway_key()
      ├── response.py         ← success_response(), error_response(), paginated_response()
      ├── middleware.py       ← RequestIDMiddleware, RequestLoggingMiddleware
      ├── exception_handlers.py
      ├── http_client.py      ← httpx async + tenacity wait_fixed retry
      ├── scheduler.py        ← APScheduler:
      │                           process_pending_messages() tiap 1 menit
      │                           cleanup_sent_messages()   tiap hari jam 02.00
      │                           cleanup_failed_messages() tiap hari jam 02.05
      └── logger.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIREMENTS

  # requirements.txt
  fastapi>=0.110.0
  uvicorn[standard]>=0.27.0
  httpx>=0.27.0
  tenacity>=8.2.0
  sqlalchemy>=2.0.0
  psycopg2-binary>=2.9.9
  pydantic>=2.6.0
  pydantic-settings>=2.2.0
  slowapi>=0.1.9
  python-multipart>=0.0.9
  alembic>=1.13.0
  apscheduler>=3.10.4        ← scheduler untuk process antrian pesan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHECKLIST SEBELUM PRODUCTION

  [ ] GATEWAY_API_KEY minimal 32 karakter random (bukan default)
  [ ] WATZAP_API_KEY dan WATZAP_NUMBER_KEY di .env, TIDAK di kode
  [ ] DEBUG=false di production
  [ ] CORS allow_origins tidak menggunakan wildcard *
  [ ] Rate limit aktif di /send
  [ ] Semua error external (watzap down/timeout) di-handle gracefully
  [ ] Retry 3x dengan WATZAP_RETRY_DELAY_SECONDS (wait_fixed, bukan exponential)
  [ ] WATZAP_SEND_DELAY_SECONDS diterapkan setelah SETIAP pesan sukses (reguler)
  [ ] Tabel message_queue dan gateway_logs ter-migrate via Alembic
  [ ] APScheduler: process_pending, cleanup_sent, cleanup_failed terjadwal
  [ ] Pesan status=pending/processing di-recover saat service restart
  [ ] Kolom source_app terisi untuk semua request (identifikasi app pengirim)
  [ ] Gunakan PostgreSQL (BUKAN SQLite) — aman untuk banyak app menulis bersamaan
  [ ] gateway_logs TIDAK pernah dihapus (audit permanen)
  [ ] message_queue dibersihkan otomatis setelah QUEUE_CLEANUP_AFTER_DAYS hari
  [ ] Log sensitif (nomor HP, isi pesan) di-mask jika perlu (PDPA/GDPR)
  [ ] Dockerfile menggunakan non-root user
  [ ] Health check /health aktif untuk load balancer / docker healthcheck
  [ ] Alembic migration sudah di-run
```

---

## Ringkasan Perbedaan Express → FastAPI

| Fitur | Express (asal) | FastAPI (target) |
|---|---|---|
| Credential | Hardcode di kode | `.env` via pydantic-settings |
| Auth client | Tidak ada | `X-Gateway-API-Key` header |
| HTTP client | `axios` (sync-style) | `httpx` async + retry (tenacity) |
| Retry logic | Tidak ada | 3x retry, jeda `WATZAP_RETRY_DELAY_SECONDS` (`wait_fixed`) |
| Jeda reguler per pesan | Tidak ada | `WATZAP_SEND_DELAY_SECONDS` setelah setiap pesan sukses |
| Antrian pesan | Tidak ada | `message_queue` PostgreSQL + APScheduler + auto-cleanup |
| Audit log | `logs.db` (nedb file) | `gateway_logs` PostgreSQL — permanen, tidak dihapus |
| Multi-app support | Tidak ada | `source_app` di kolom + satu GATEWAY_API_KEY per app |
| Cleanup otomatis | Tidak ada | APScheduler hapus baris `sent` setelah N hari |
| Logging | Override `res.send` + nedb file | Middleware + PostgreSQL via SQLAlchemy |
| Validasi phone | Tidak ada | Pydantic `@field_validator` + regex |
| Rate limiting | Tidak ada | slowapi per IP |
| Docs API | Tidak ada | SwaggerUI `/docs` otomatis |
| Error handling | try/catch manual | Centralized exception handler |
| Idempotency | Tidak ada | Idempotency-Key header + DB check |
| Message broker | Tidak ada | **Tidak perlu** — DB Queue + APScheduler cukup untuk RSUD |

---

*Dokumen ini dibuat berdasarkan kode Express.js WhatsApp Gateway bestehend.*  
*Tanggal: 3 Maret 2026*
