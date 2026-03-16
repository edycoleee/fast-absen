# Prompt: Fitur Import & Download Template Excel (Best Practice)

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
