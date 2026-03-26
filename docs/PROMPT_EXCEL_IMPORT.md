# Prompt: Fitur Import & Download Template Excel — Hybrid Backend (Best Practice)

Dokumen ini adalah **prompt reusable** untuk mengimplementasikan fitur import data massal via Excel beserta download template, menggunakan stack **FastAPI (backend)** dan **React + Tailwind CSS (frontend)**.

> **⚠️ Pendekatan Hybrid — Wajib Baca:**
> Jangan gunakan library Excel frontend (SheetJS / exceljs) karena **berbayar untuk penggunaan komersial**.
> Gunakan **openpyxl di backend** untuk generate & parse Excel.
> Frontend hanya bertugas:
> 1. **Trigger download** → terima blob dari backend, auto-klik `<a>` tag
> 2. **Upload file** → kirim multipart `FormData` ke backend
> 3. **Tampilkan hasil parse** → load ke grid/preview, bukan langsung simpan ke DB

---

## Konteks Teknis

- **Backend**: FastAPI, SQLAlchemy, `openpyxl==3.1.5`, Pydantic
- **Frontend**: React (hooks + useCallback), Tailwind CSS, axios (`apiClient`)
- **Pattern**: Repository → Service → Router (Clean Architecture)
- **File format**: `.xlsx` (Office Open XML)
- **Alasan hybrid**: Frontend Excel library (SheetJS Pro) berbayar; openpyxl gratis dan menghasilkan output lebih rapi (styled header, freeze pane, alt-row color, multi-sheet)

---

## 1. Backend — FastAPI

### 1.1 Dependency

```
openpyxl==3.1.5
```

### 1.2 Import yang dibutuhkan di endpoint file

```python
import calendar
from io import BytesIO
from datetime import date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
```

### 1.3 Endpoint: Download Template (Styled Excel)

> **Penting**: Daftarkan endpoint ini **sebelum** route `/{id}` agar tidak tertubruk oleh path parameter FastAPI.

```python
@router.get("/template/download", dependencies=[Depends(require_permission(PermissionKeys.[ENTITAS]_READ))])
def download_[entitas]_template(
    # Sesuaikan parameter filter yang relevan, contoh:
    tahun: int = Query(...),
    bulan: int = Query(..., ge=1, le=12),
    id_unit: Optional[int] = Query(None),
    # Untuk filter daftar spesifik (misal dari grid aktif di frontend):
    id_[entitas]: Optional[List[str]] = Query(None, description="Filter spesifik ID (array, opsional)"),
    db: Session = Depends(get_db),
):
    """
    Generate template Excel roster via openpyxl (backend).
    Frontend hanya menerima blob dan trigger download — tidak generate Excel sendiri.
    """
    # ── Ambil data dari DB ──────────────────────────────────────────
    # Jika ada filter array spesifik (dari grid frontend):
    if id_[entitas]:
        item_map = {
            item.id: item
            for item in db.query([Model]).filter([Model].id.in_(id_[entitas])).all()
        }
        # Pertahankan urutan sesuai yang dikirim frontend
        data_list = [item_map[iid] for iid in id_[entitas] if iid in item_map]
    else:
        q = db.query([Model]).filter([Model].status != 'Tidak Aktif')
        if id_unit:
            q = q.filter([Model].id_unit == id_unit)
        data_list = q.order_by([Model].nama).all()

    total_days = calendar.monthrange(tahun, bulan)[1]
    NAMA_BULAN = ["","Januari","Februari","Maret","April","Mei","Juni",
                  "Juli","Agustus","September","Oktober","November","Desember"]
    HARI_SHORT = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"]

    # ── Build workbook ─────────────────────────────────────────────
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"[Entitas] {NAMA_BULAN[bulan]} {tahun}"

    thin       = Side(border_style="thin", color="CCCCCC")
    thick_r    = Side(border_style="medium", color="888888")
    border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

    fill_header = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    fill_sunday = PatternFill(start_color="FFF0F0", end_color="FFF0F0", fill_type="solid")
    fill_alt    = PatternFill(start_color="F7FAFF", end_color="F7FAFF", fill_type="solid")
    white_bold  = Font(color="FFFFFF", bold=True, size=9)
    title_font  = Font(bold=True, size=13, color="1F4E79")
    normal_font = Font(size=9)
    bold_font   = Font(bold=True, size=9)
    center      = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align  = Alignment(horizontal="left", vertical="center")

    # Row 1: Judul (merge semua kolom)
    total_cols = 3 + total_days  # kolom tetap + kolom tanggal
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
    ws.cell(row=1, column=1).value = (
        f"TEMPLATE [NAMA ENTITAS] — {NAMA_BULAN[bulan].upper()} {tahun}\n"
        f"Isi kolom tanggal dengan kode yang sesuai. Jangan ubah kolom A–C."
    )
    ws.cell(row=1, column=1).font = title_font
    ws.cell(row=1, column=1).alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 45

    # Row 2: Header kolom tetap
    fixed_headers = ["Nama", "ID", "Unit/Kategori"]
    for ci, hdr in enumerate(fixed_headers, start=1):
        c = ws.cell(row=2, column=ci, value=hdr)
        c.fill = fill_header
        c.font = white_bold
        c.alignment = center
        c.border = Border(left=thin, right=thick_r if ci == 3 else thin, top=thin, bottom=thin)

    # Row 2: Header tanggal (kolom D dst.)
    for d in range(1, total_days + 1):
        hari = date_type(tahun, bulan, d).weekday()
        col  = 3 + d
        c = ws.cell(row=2, column=col, value=f"{HARI_SHORT[hari]}\n{d}")
        c.fill = fill_header
        c.font = white_bold
        c.alignment = center
        c.border = border_all
    ws.row_dimensions[2].height = 28

    # Freeze: kolom A–C tetap saat scroll
    ws.freeze_panes = "D3"

    # Rows 3+: Data
    for ri, item in enumerate(data_list):
        row = ri + 3
        fill_row = fill_alt if ri % 2 == 0 else None

        def _cell(col, val, font=normal_font, align=left_align, fill=fill_row):
            c = ws.cell(row=row, column=col, value=val)
            c.font = font
            c.alignment = align
            c.border = border_all
            if fill:
                c.fill = fill
            return c

        _cell(1, item.nama or item.id, font=bold_font)
        _cell(2, item.id, align=center)
        _cell(3, item.unit.nama_unit if item.unit else "")

        for d in range(1, total_days + 1):
            col  = 3 + d
            hari = date_type(tahun, bulan, d).weekday()
            c = ws.cell(row=row, column=col, value="")
            c.border = border_all
            c.alignment = center
            if hari == 6:  # Minggu
                c.fill = fill_sunday
            elif fill_row:
                c.fill = fill_row

    # Lebar kolom
    ws.column_dimensions["A"].width = 28
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 18
    for i in range(1, total_days + 1):
        ws.column_dimensions[get_column_letter(3 + i)].width = 5.5

    # Sheet 2: Legend / Kamus (opsional tapi sangat membantu user)
    ws2 = wb.create_sheet(title="Kode & Keterangan")
    ws2.cell(row=1, column=1, value="Kode").font = Font(bold=True)
    ws2.cell(row=1, column=2, value="Keterangan").font = Font(bold=True)
    # → isi dengan data kamus dari DB sesuai kebutuhan entitas

    # ── Stream response ────────────────────────────────────────────
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    fname = f"template_[entitas]_{NAMA_BULAN[bulan].lower()}_{tahun}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
```

### 1.4 Endpoint: Parse / Import Excel

> **Filosofi**: Endpoint ini **hanya parsing, tidak menyimpan ke DB**.
> Data dikembalikan ke frontend untuk ditampilkan di grid preview — user masih bisa review/edit sebelum klik "Simpan".
> Ini mencegah import salah yang sulit di-rollback.

```python
@router.post("/template/parse", dependencies=[Depends(require_permission(PermissionKeys.[ENTITAS]_READ))])
async def parse_[entitas]_template(
    file: UploadFile = File(...),
    tahun: int = Query(...),
    bulan: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    """
    Parse file Excel template yang sudah diisi user.
    Mengembalikan data baris untuk diload ke grid/preview di frontend.
    TIDAK menyimpan ke DB — hanya parsing + validasi.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File harus berformat .xlsx atau .xls")

    content = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="File Excel tidak valid atau rusak")

    ws         = wb.worksheets[0]
    total_days = calendar.monthrange(tahun, bulan)[1]

    # Ambil kamus validasi dari DB (sesuaikan dengan entitas)
    kamus_rows = db.query(KamusKodeShift).filter(KamusKodeShift.is_active == True).all()
    kamus_map  = {k.kode.upper(): k for k in kamus_rows}

    rows_out = []
    errors   = []

    def cell_str(val):
        """Normalisasi nilai sel: None / string kosong / 'none' → None"""
        if val is None:
            return None
        s = str(val).strip()
        return s if s and s.lower() != "none" else None

    # Mulai dari baris 3 (baris 1=judul, baris 2=header)
    for excel_row_idx, row in enumerate(ws.iter_rows(min_row=3, values_only=True), start=3):
        if not row or not any(row):  # skip baris kosong trailing
            continue

        nama       = cell_str(row[0])
        id_item    = cell_str(row[1])
        if not id_item:
            continue

        # Validasi existensi di DB
        item_db = db.query([Model]).filter([Model].id == id_item).first()
        if not item_db:
            errors.append({"baris": excel_row_idx, "id": id_item, "pesan": "Data tidak ditemukan di database"})
            continue

        # Parse kolom tanggal (kolom D = index 3, E = index 4, dst.)
        grid = {}
        kode_tidak_dikenal = []
        for d in range(1, total_days + 1):
            col_idx = 3 + d - 1
            val     = row[col_idx] if len(row) > col_idx else None
            kode    = cell_str(val)
            if not kode:
                continue
            kode = kode.upper()
            if kode not in kamus_map:
                kode_tidak_dikenal.append(kode)
            grid[str(d)] = kode

        if kode_tidak_dikenal:
            errors.append({
                "baris": excel_row_idx, "id": id_item,
                "pesan": f"Kode tidak dikenal: {', '.join(set(kode_tidak_dikenal))}",
            })

        rows_out.append({
            "id": id_item,
            "nama": item_db.nama or nama,
            "id_unit": item_db.id_unit,
            "grid": grid,
        })

    return success_response(
        message=f"{len(rows_out)} baris berhasil diparsing",
        data={
            "rows":       rows_out,
            "total_rows": len(rows_out),
            "errors":     errors,
            "tahun":      tahun,
            "bulan":      bulan,
        },
    )
```

### 1.5 Response Format Parse

```json
{
  "success": true,
  "message": "17 baris berhasil diparsing",
  "data": {
    "total_rows": 17,
    "rows": [
      { "id": "RSF00115", "nama": "AMINUDIN", "id_unit": 3, "grid": {"1": "P1", "2": "S1"} }
    ],
    "errors": [
      { "baris": 5, "id": "RSF00120", "pesan": "Kode tidak dikenal: XX" }
    ],
    "tahun": 2026,
    "bulan": 3
  }
}
```

---

## 2. Frontend — Repository Layer

```js
// [Nama]Repository.js

/**
 * Download template Excel — diproses sepenuhnya oleh backend (openpyxl).
 * Frontend hanya menerima blob dan trigger auto-download.
 *
 * PENTING: Jika perlu kirim array param (misal id_item=[x,y,z]),
 * gunakan paramsSerializer custom agar axios tidak stringify jadi "x,y,z".
 */
const downloadTemplate = async ({ tahun, bulan, id_unit, id_item } = {}) => {
  const params = { tahun, bulan };
  if (id_unit) params.id_unit = id_unit;

  const response = await apiClient.get('/[nama-entitas]/template/download', {
    params: id_item?.length ? { ...params, id_item } : params,
    // Custom serializer: array → ?id_item=x&id_item=y (bukan ?id_item=x,y)
    paramsSerializer: p => {
      const sp = new URLSearchParams();
      Object.entries(p).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach(val => sp.append(k, val));
        else if (v !== undefined && v !== null) sp.append(k, v);
      });
      return sp.toString();
    },
    responseType: 'blob',
  });

  // Auto-download
  const BULAN = ['','januari','februari','maret','april','mei','juni',
                 'juli','agustus','september','oktober','november','desember'];
  const fname = `template_[entitas]_${BULAN[bulan] || bulan}_${tahun}.xlsx`;
  const url = URL.createObjectURL(new Blob([response.data]));
  const a   = document.createElement('a');
  a.href        = url;
  a.download    = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);  // ← wajib untuk cegah memory leak
};

/**
 * Upload Excel → backend parsing → kembalikan data rows.
 * Frontend menampilkan hasil di grid preview, bukan langsung simpan DB.
 */
const parseTemplate = async (file, { tahun, bulan } = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/[nama-entitas]/template/parse', formData, {
    params:  { tahun, bulan },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

---

## 3. Frontend — State & Handlers

### 3.1 State

```jsx
// Download
const [downloadingTemplate, setDownloadingTemplate] = useState(false);

// Upload / parse
const [uploadLoading,  setUploadLoading]  = useState(false);
const [uploadError,    setUploadError]    = useState('');
const [uploadResult,   setUploadResult]   = useState(null);  // { total_rows, errors }
const uploadInputRef = useRef(null);
```

### 3.2 Handler: Download Template

```jsx
// PENTING: sertakan semua state yang dipakai di dalam handler sebagai dependency useCallback.
// Jika state tidak ada di deps, closure akan stale → data lama yang terkirim ke backend.
const handleDownloadTemplate = useCallback(async () => {
  setDownloadingTemplate(true);
  try {
    // Contoh: prioritaskan item yang sudah ada di grid
    const gridIds = rows.map(r => r.id).filter(Boolean);
    await [Nama]Repository.downloadTemplate({
      tahun,
      bulan,
      id_unit:  gridIds.length === 0 ? (idUnit || undefined) : undefined,
      id_item:  gridIds.length > 0   ? gridIds               : undefined,
    });
  } catch {
    alert('Gagal mengunduh template. Coba lagi.');
  } finally {
    setDownloadingTemplate(false);
  }
}, [tahun, bulan, idUnit, rows]);  // ← rows WAJIB ada di sini!
//                          ^^^^
// BUG UMUM: Lupa tambahkan "rows" → stale closure → selalu download semua pegawai
// meskipun grid sudah diisi. Tambahkan semua state yang dibaca di dalam handler.
```

### 3.3 Handler: Upload & Parse Excel

```jsx
const handleUploadExcel = useCallback(async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';  // reset input agar file yang sama bisa di-upload ulang
  setUploadError('');
  setUploadResult(null);
  setUploadLoading(true);
  try {
    const res        = await [Nama]Repository.parseTemplate(file, { tahun, bulan });
    const data       = res?.data ?? res;
    const parsedRows = data?.rows ?? [];

    if (parsedRows.length === 0) {
      setUploadError('Tidak ada data yang ditemukan. Pastikan file menggunakan template yang benar.');
      return;
    }

    // Merge ke grid yang ada (update existing + tambah baru)
    setRows(prev => {
      const existingMap = Object.fromEntries(prev.map(r => [r.id, r]));
      const result      = [...prev];
      for (const r of parsedRows) {
        if (existingMap[r.id]) {
          const idx = result.findIndex(x => x.id === r.id);
          if (idx >= 0) result[idx] = { ...result[idx], grid: { ...r.grid } };
        } else {
          result.push({ id: r.id, nama: r.nama, id_unit: r.id_unit, grid: r.grid });
        }
      }
      return result;
    });

    setUploadResult({ total_rows: parsedRows.length, errors: data?.errors ?? [] });
  } catch (err) {
    const msg = err?.response?.data?.detail || err?.message || 'Gagal memproses file Excel.';
    setUploadError(typeof msg === 'string' ? msg : JSON.stringify(msg));
  } finally {
    setUploadLoading(false);
  }
}, [tahun, bulan]);
```

---

## 4. Frontend — Tombol & UI

### 4.1 Tombol Pemicu di Header

```jsx
{/* Download template */}
<button
  onClick={handleDownloadTemplate}
  disabled={downloadingTemplate}
  className="btn-secondary flex items-center gap-1.5 disabled:opacity-60"
>
  {downloadingTemplate ? '⏳ Mengunduh…' : '📥 Template Excel'}
</button>

{/* Upload — pakai hidden input + label sebagai tombol */}
<label className={`btn-secondary flex items-center gap-1.5 cursor-pointer ${uploadLoading ? 'opacity-60 pointer-events-none' : ''}`}>
  {uploadLoading ? '⏳ Memproses…' : '📤 Upload Excel'}
  <input
    ref={uploadInputRef}
    type="file"
    accept=".xlsx,.xls"
    className="hidden"
    onChange={handleUploadExcel}
  />
</label>
```

### 4.2 Banner Hasil Upload

```jsx
{/* Banner hasil sukses */}
{uploadResult && (
  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex justify-between items-start">
    <div>
      <p className="font-semibold">✅ {uploadResult.total_rows} baris berhasil diload ke grid</p>
      {uploadResult.errors?.length > 0 && (
        <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
          {uploadResult.errors.slice(0, 5).map((e, i) => (
            <li key={i}>Baris {e.baris}: {e.pesan}</li>
          ))}
          {uploadResult.errors.length > 5 && (
            <li>…dan {uploadResult.errors.length - 5} peringatan lainnya</li>
          )}
        </ul>
      )}
    </div>
    <button onClick={() => setUploadResult(null)} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
  </div>
)}

{/* Banner error */}
{uploadError && (
  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex justify-between items-center">
    <span>❌ {uploadError}</span>
    <button onClick={() => setUploadError('')} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
  </div>
)}
```

---

## 5. Alur Kerja Lengkap (User Flow)

```
1. User klik "📥 Template Excel"
   → Frontend panggil backend GET /template/download (blob)
   → Backend generate Excel styled dengan openpyxl (header biru, freeze pane, alt-row)
   → Browser auto-download file

2. User isi kode di kolom tanggal, simpan file

3. User klik "📤 Upload Excel" → pilih file
   → Frontend POST /template/parse (multipart FormData)
   → Backend: load workbook → validasi -> parse grid per baris
   → Return { rows, errors } — TIDAK simpan ke DB

4. Frontend merge hasil parse ke grid state
   → User review, edit jika perlu
   → User klik "Preview & Simpan" → batch POST ke endpoint create
```

---

## 6. Checklist Implementasi

- [ ] `openpyxl==3.1.5` ada di `requirements.txt`
- [ ] Endpoint `GET /template/download` didaftarkan **sebelum** `/{id}`
- [ ] Endpoint `POST /template/parse` didaftarkan **sebelum** `/{id}`
- [ ] Template Excel: judul merged row 1, header row 2 (dark fill + white bold), freeze panes D3
- [ ] Template Excel: alt-row coloring, Minggu = fill merah muda, kolom tetap (A–C) lebih lebar
- [ ] Sheet 2 berisi legend/kamus kode untuk referensi user
- [ ] `paramsSerializer` custom di repository axios jika ada parameter array
- [ ] `responseType: 'blob'` saat download
- [ ] `URL.revokeObjectURL(url)` setelah trigger download (cegah memory leak)
- [ ] Parse: mulai dari baris 3 (`min_row=3`) — baris 1=judul, baris 2=header
- [ ] Skip baris kosong dengan `if not any(row): continue`
- [ ] Helper `cell_str()` untuk normalisasi nilai sel (None / kosong / "none" → None)
- [ ] Parse tidak simpan ke DB — return data ke frontend untuk review
- [ ] Frontend merge rows: update grid yang sudah ada, tambah baris baru
- [ ] `useCallback` deps lengkap — **jangan lupakan state yang dibaca di dalam handler**
- [ ] Banner hasil upload: tampilkan jumlah baris + daftar peringatan (bukan modal)

---

## 7. Pitfalls & Catatan Penting

| Topik | Masalah Umum | Solusi |
|---|---|---|
| **Stale closure** | `useCallback` lupa tambahkan `rows` di deps → selalu kirim grid kosong ke backend | Pastikan **semua state** yang dibaca di dalam handler ada di array dependency |
| **Array query param** | Axios default serializer: `?id=[x,y]` → FastAPI tidak bisa parse `List[str]` | Gunakan `paramsSerializer` custom: `sp.append(k, val)` untuk setiap elemen array |
| **Urutan endpoint FastAPI** | `/template/download` setelah `/{id}` → FastAPI match "template" sebagai ID → 404 atau error | Daftarkan semua route statis **sebelum** route dengan path parameter `/{id}` |
| **Memory blob** | Lupa `revokeObjectURL` → leaked object URL di browser | Selalu panggil `URL.revokeObjectURL(url)` setelah `a.click()` |
| **Baris kosong Excel** | Excel sering menyertakan baris trailing kosong → error parse | `if not any(row): continue` di loop iter_rows |
| **Integer dari Excel** | Excel simpan angka sebagai float (`1.0`) | Parse dengan `int(float(s))` bukan `int(s)` |
| **Parse dulu, simpan nanti** | Import langsung ke DB tanpa preview → sulit rollback jika salah | Backend hanya parse + validasi, kembalikan data ke grid frontend untuk review |
| **File re-upload** | `onChange` tidak trigger jika file sama | `e.target.value = ''` setelah baca file |


Dokumen ini adalah **prompt reusable** untuk mengimplementasikan fitur import data massal via Excel beserta download template, menggunakan stack **FastAPI (backend)** dan **React + Tailwind CSS (frontend)**. Salin dan sesuaikan nama entitas sesuai kebutuhan aplikasi.

---

## Konteks Teknis

- **Backend**: FastAPI, SQLAlchemy, openpyxl, Pydantic
- **Frontend**: React (hooks), Tailwind CSS, axios (via `apiClient`)
- **Pattern**: Repository → Service → Router (Clean Architecture)
- **File format**: `.xlsx` (Office Open XML)

---

## Instruksi Prompt (untuk AI / Developer)

> Implementasikan fitur **download template Excel** dan **import massal** untuk entitas `[NAMA_ENTITAS]` dengan ketentuan berikut:

---

## 1. Backend — FastAPI

### 1.1 Dependency

Pastikan `openpyxl` tersedia di `requirements.txt`:

```
openpyxl==3.1.5
```

### 1.2 Endpoint: Download Template

Tambahkan endpoint berikut di router entitas (`router = APIRouter(prefix="/[nama-entitas]", ...)`).

> **Penting**: Register endpoint ini **sebelum** route dengan path parameter (`/{id}`) agar tidak tertubruk.

```python
from io import BytesIO
from fastapi.responses import StreamingResponse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

@router.get("/template/download")
async def download_template():
    """
    Download Excel template untuk bulk import [NAMA_ENTITAS].
    Mengembalikan file .xlsx dengan header berwarna + satu baris contoh.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "[NamaEntitas]"

    # Definisi kolom: (label_header, lebar_kolom)
    # Tambahkan tanda * pada kolom wajib
    columns = [
        ("id *",                         15),
        ("nama *",                        28),
        ("field_opsional",               20),
        ("tanggal (YYYY-MM-DD)",         22),
        ("status (AKTIF/TIDAK_AKTIF)",   25),
    ]

    # Style header
    header_font  = Font(bold=True, color="FFFFFF")
    header_fill  = PatternFill("solid", fgColor="2563EB")   # biru brand
    header_align = Alignment(horizontal="center", vertical="center")

    for col_idx, (header, width) in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font      = header_font
        cell.fill      = header_fill
        cell.alignment = header_align
        ws.column_dimensions[cell.column_letter].width = width

    ws.row_dimensions[1].height = 22

    # Satu baris contoh (kuning muda)
    example_values = ["ID001", "Nama Contoh", "nilai_opsional", "1990-01-01", "AKTIF"]
    example_fill   = PatternFill("solid", fgColor="EFF6FF")
    for col_idx, val in enumerate(example_values, 1):
        cell = ws.cell(row=2, column=col_idx, value=val)
        cell.fill = example_fill

    # Freeze baris header
    ws.freeze_panes = "A2"

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_import_[nama_entitas].xlsx"},
    )
```

### 1.3 Endpoint: Import Excel

```python
from datetime import date as date_type

@router.post("/import", response_model=dict)
async def import_from_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Bulk import [NAMA_ENTITAS] dari file Excel (.xlsx).
    Mengembalikan ringkasan: jumlah sukses + detail error per baris.
    """
    fname = (file.filename or "").lower()
    if not (fname.endswith(".xlsx") or fname.endswith(".xls")):
        raise HTTPException(status_code=400, detail="File harus berformat Excel (.xlsx atau .xls)")

    content = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="File Excel tidak dapat dibaca. Pastikan format valid.")

    ws   = wb.active
    rows = list(ws.iter_rows(values_only=True))

    if len(rows) < 2:
        raise HTTPException(
            status_code=400,
            detail="File tidak memiliki data (minimal 1 baris data setelah header)."
        )

    service = [NamaEntitas]Service(db)
    ok, errors = 0, []

    def cell_str(val):
        """Normalise cell value → clean string or None."""
        if val is None:
            return None
        s = str(val).strip()
        return s if s and s.lower() != "none" else None

    def to_int_or_none(val):
        s = cell_str(val)
        if not s:
            return None
        try:
            return int(float(s))
        except ValueError:
            return None

    for row_idx, row in enumerate(rows[1:], start=2):
        # Lewati baris kosong
        if not any(row):
            continue

        # Validasi field wajib
        id_field = cell_str(row[0] if len(row) > 0 else None)
        if not id_field:
            errors.append({"row": row_idx, "message": "id wajib diisi"})
            continue

        try:
            # Parsing tanggal (jika ada)
            tanggal = None
            raw_tgl = cell_str(row[3] if len(row) > 3 else None)
            if raw_tgl:
                try:
                    parts   = raw_tgl.split("-")
                    tanggal = date_type(int(parts[0]), int(parts[1]), int(parts[2]))
                except Exception:
                    errors.append({
                        "row": row_idx,
                        "id": id_field,
                        "message": f"Format tanggal tidak valid: '{raw_tgl}'. Gunakan YYYY-MM-DD"
                    })
                    continue

            # Validasi enum (jika ada)
            status = (cell_str(row[4] if len(row) > 4 else None) or "AKTIF").upper()
            if status not in ("AKTIF", "TIDAK_AKTIF"):
                errors.append({"row": row_idx, "id": id_field,
                               "message": f"status tidak valid: '{status}'"})
                continue

            # Buat objek data & panggil service
            data = [NamaEntitas]Create(
                id     = id_field,
                nama   = cell_str(row[1] if len(row) > 1 else None),
                field_opsional = cell_str(row[2] if len(row) > 2 else None),
                tanggal = tanggal,
                status  = status,
            )
            await service.create(data)
            ok += 1

        except HTTPException as exc:
            errors.append({"row": row_idx, "id": id_field, "message": exc.detail})
        except Exception as exc:
            errors.append({"row": row_idx, "id": id_field, "message": str(exc)})

    total = len(rows) - 1
    return success_response(
        message=f"Import selesai: {ok} berhasil, {len(errors)} gagal dari {total} baris data",
        data={"success": ok, "errors": errors, "total": total},
    )
```

### 1.4 Response Format Import

```json
{
  "success": true,
  "message": "Import selesai: 8 berhasil, 2 gagal dari 10 baris data",
  "data": {
    "success": 8,
    "total": 10,
    "errors": [
      { "row": 3, "id": "ID002", "message": "id 'ID002' sudah ada" },
      { "row": 7, "id": "ID006", "message": "Format tanggal tidak valid: '2025/01/01'" }
    ]
  }
}
```

---

## 2. Frontend — Repository Layer

Tambahkan dua method berikut ke repository entitas (`[Nama]Repository.js`):

```js
/** Download Excel template untuk bulk import. Mengembalikan Blob. */
const downloadTemplate = async () => {
  const response = await apiClient.get('/[nama-entitas]/template/download', {
    responseType: 'blob',
  });
  return response.data; // Blob
};

/** Bulk import dari file Excel. */
const importExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/[nama-entitas]/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

Export keduanya dari objek repository:

```js
const [Nama]Repository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  downloadTemplate,  // ← tambah
  importExcel,       // ← tambah
};
```

---

## 3. Frontend — State & Handlers (React)

### 3.1 State

```jsx
const [importOpen,    setImportOpen]    = useState(false);
const [importFile,    setImportFile]    = useState(null);
const [importLoading, setImportLoading] = useState(false);
const [importResult,  setImportResult]  = useState(null);
```

### 3.2 Handler: Download Template

```jsx
const handleDownloadTemplate = async () => {
  try {
    const blob = await [Nama]Repository.downloadTemplate();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'template_import_[nama_entitas].xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengunduh template', user)));
  }
};
```

### 3.3 Handler: Submit Import

```jsx
const handleImportSubmit = async () => {
  if (!importFile) return;
  setImportLoading(true);
  setImportResult(null);
  try {
    const res = await [Nama]Repository.importExcel(importFile);
    setImportResult(res?.data ?? null);
    fetchData(page, limit, search); // refresh tabel
  } catch (err) {
    alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengimpor data', user)));
  } finally {
    setImportLoading(false);
  }
};
```

---

## 4. Frontend — Tombol Pemicu (di Header Halaman)

```jsx
<button
  className="btn-secondary flex items-center gap-1.5"
  onClick={handleDownloadTemplate}
  title="Download template Excel untuk import massal"
>
  ⬇️ Template Excel
</button>
<button
  className="btn-secondary flex items-center gap-1.5"
  onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(true); }}
>
  📂 Import Excel
</button>
```

---

## 5. Frontend — Modal Import Excel (JSX)

Tempatkan di bagian bawah komponen, sejajar dengan modal CRUD lainnya:

```jsx
{importOpen && (
  <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
    <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
      {/* ── Header modal ───────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Import [Nama Entitas] dari Excel
        </h2>
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={() => setImportOpen(false)}
        >
          ✕
        </button>
      </div>

      {/* ── Panduan langkah (tampil sebelum hasil) ─── */}
      {!importResult && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">📋 Cara penggunaan:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Klik <strong>Download Template</strong> untuk mendapatkan file contoh</li>
            <li>Isi data di baris berikutnya (jangan ubah header)</li>
            <li>Kolom bertanda <strong>*</strong> wajib diisi</li>
            <li>Upload file yang sudah diisi, lalu klik <strong>Import</strong></li>
          </ol>
        </div>
      )}

      {/* ── Tampilan hasil ─────────────────────────── */}
      {importResult ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
              <p className="text-xs text-green-600">Berhasil</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-2xl font-bold text-red-700">{importResult.errors?.length ?? 0}</p>
              <p className="text-xs text-red-600">Gagal</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-2xl font-bold text-gray-700">{importResult.total}</p>
              <p className="text-xs text-gray-500">Total baris</p>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Detail error per baris:</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 divide-y divide-red-100">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-xs text-red-800">
                    <span className="font-medium">Baris {e.row}</span>
                    {e.id && <span className="text-gray-500"> ({e.id})</span>}
                    {': '}
                    {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => { setImportResult(null); setImportFile(null); }}
            >
              Import Lagi
            </button>
            <button className="btn-primary" onClick={() => setImportOpen(false)}>
              Tutup
            </button>
          </div>
        </div>

      ) : (
        /* ── Form upload file ───────────────────────── */
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              File Excel (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
            {importFile && (
              <p className="mt-1 text-xs text-gray-500">
                ✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-between items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-1"
              onClick={handleDownloadTemplate}
            >
              ⬇️ Download Template
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setImportOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!importFile || importLoading}
                onClick={handleImportSubmit}
              >
                {importLoading ? '⏳ Mengimpor...' : '📥 Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

---

## 6. Checklist Implementasi

- [ ] `openpyxl` ditambahkan ke `requirements.txt`
- [ ] Endpoint `GET /[nama-entitas]/template/download` ditambahkan **sebelum** `GET /{id}`
- [ ] Endpoint `POST /[nama-entitas]/import` ditambahkan
- [ ] Method `downloadTemplate` & `importExcel` ditambahkan ke Repository frontend
- [ ] State `importOpen`, `importFile`, `importLoading`, `importResult` ditambahkan
- [ ] Handler `handleDownloadTemplate` & `handleImportSubmit` diimplementasikan
- [ ] Tombol pemicu di header halaman
- [ ] Modal Import Excel di bagian bawah komponen JSX
- [ ] Kolom wajib diberi tanda `*` pada header template
- [ ] Response error per baris menyertakan `row` (nomor baris Excel) dan `id` (identifier entitas)

---

## 7. Catatan Penting

| Topik | Keputusan |
|---|---|
| Urutan endpoint | `/template/download` dan `/import` **harus** didaftarkan sebelum `/{id}` untuk menghindari konflik routing di FastAPI |
| Normalisasi nilai sel | Gunakan helper `cell_str()` untuk handle `None`, string kosong, dan nilai `"none"` dari Excel |
| Baris kosong | Skip row jika `not any(row)` — Excel kadang menyertakan baris trailing kosong |
| Tanggal | Terima format `YYYY-MM-DD`; validasi manual tanpa bergantung pada `datetime.fromisoformat` untuk kompatibilitas Python 3.8 |
| Angka integer dari Excel | Excel menyimpan integer sebagai float (misal `1.0`) — gunakan `int(float(s))` |
| Partial import | Baris yang gagal tidak membatalkan baris yang sukses (tidak ada global transaction rollback) |
| Feedback UI | Tampilkan ringkasan 3-kolom (Berhasil / Gagal / Total) + daftar error per baris yang bisa di-scroll |
| Memory Blob | Selalu panggil `URL.revokeObjectURL(url)` setelah trigger download untuk mencegah memory leak |
