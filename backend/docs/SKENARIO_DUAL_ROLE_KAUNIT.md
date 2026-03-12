# Skenario: Pegawai dengan Dual Fungsi (Ka-Unit + Anggota Unit Lain)

Contoh kasus: **Edy** menjabat sebagai Kepala Unit Bangsal Kenanga,
sekaligus tercatat sebagai anggota unit struktural lain (misal: Unit Rawat Inap).

---

## Struktur Data di Database

Cukup **satu baris** di tabel `pegawai` dan **satu akun** user:

```
Tabel pegawai:
┌─────────────┬──────┬────────────────────────┬─────────────────────────────────┐
│ id_pegawai  │ nama │ id_unit                │ kepala_id_unit                  │
├─────────────┼──────┼────────────────────────┼─────────────────────────────────┤
│ EDY001      │ Edy  │ 5  (Unit Rawat Inap)   │ 7  (Unit Bangsal Kenanga)       │
└─────────────┴──────┴────────────────────────┴─────────────────────────────────┘

Tabel user:
┌──────────┬─────────────┬──────────────────────────┐
│ username │ id_pegawai  │ roles                    │
├──────────┼─────────────┼──────────────────────────┤
│ edy      │ EDY001      │ ka-unit (atau pegawai)   │
└──────────┴─────────────┴──────────────────────────┘
```

| Field | Nilai | Fungsi |
|---|---|---|
| `id_unit = 5` | Unit Rawat Inap | Edy **absen** sebagai anggota unit ini → shift & check-in/out mengikuti unit 5 |
| `kepala_id_unit = 7` | Unit Bangsal Kenanga | Edy **memimpin** unit ini → bisa monitor KPI, absensi, dan approve pengajuan unit Kenanga |

---

## Apa yang Diperoleh Edy Saat Login

Token auth Edy akan membawa konteks berikut secara otomatis:

```json
{
  "menu_guard": {
    "is_kepala_unit": true,
    "kepala_unit_scope_id": 7,
    "menus": {
      "monitoring_absensi": { "visible": true },
      "approval": {
        "visible": true,
        "can_decide": true
      },
      "kpi_unit_role": {
        "visible": true,
        "endpoint": "/api/v1/stats/kpi/unit-role/my-unit",
        "force_my_unit_scope": true
      }
    }
  }
}
```

---

## Fungsi 1 — Absen sebagai Anggota Unit Rawat Inap

Edy melakukan absen **sebagai pegawai biasa**, sesuai shift yang terdaftar di `id_unit = 5`:

```
POST /api/v1/absensi/check-in
POST /api/v1/absensi/check-out
GET  /api/v1/absensi/today
GET  /api/v1/absensi/history
```

- Sistem mencatat `id_pegawai = EDY001`
- Shift yang berlaku adalah shift dari Unit Rawat Inap (id_unit 5)
- Tidak ada perlakuan khusus, sama seperti pegawai lain

---

## Fungsi 2 — Monitor & KPI Unit Bangsal Kenanga

Karena `kepala_id_unit = 7`, Edy mendapat akses monitoring **unit Bangsal Kenanga**:

```
GET /api/v1/stats/kpi/unit-role/my-unit
```

- Scope otomatis ke `id_unit = 7` (Bangsal Kenanga)
- Tidak bisa mengakses unit lain (403 Forbidden jika mencoba)
- Data yang tampil: KPI, rekap kehadiran, status shift seluruh anggota Bangsal Kenanga

### Approval Pengajuan Unit Bangsal Kenanga

```
GET  /api/v1/approval-pengajuan-absensi/assigned
POST /api/v1/approval-pengajuan-absensi/{id}/decision
```

- Edy sebagai atasan langsung dari anggota unit 7
- Sistem memetakan approver berdasarkan `pegawai.kepala_id_unit` pemohon

---

## Cara Setting di Admin Panel

1. Buka data pegawai **Edy**
2. Set **Unit Struktural (id_unit)** → Unit Rawat Inap (id 5)
3. Set **Kepala Unit (kepala_id_unit)** → Unit Bangsal Kenanga (id 7)
4. Pastikan role Edy memiliki permission:
   - `penilaian_shift_absensi.read`
   - `approval_pengajuan_absensi.read`
   - `approval_pengajuan_absensi.update`
5. Tidak perlu membuat akun user kedua

---

## Catatan Penting

- **Satu akun, satu login** — tidak perlu 2 user untuk mengakomodasi dual fungsi ini
- **Absensi** selalu mengikuti `id_unit` (unit struktural tempat Edy terdaftar)
- **Monitoring & approval** selalu mengikuti `kepala_id_unit` (unit yang Edy pimpin)
- Kedua field dapat diisi dengan unit yang **sama** (Edy absen sekaligus memimpin unit yang sama), atau **berbeda** seperti kasus di atas
- `is_kepala_unit` di token ditentukan semata dari ada/tidaknya nilai `kepala_id_unit`, bukan dari nama role

---

## Referensi

- [KAUNIT_GUIDE.md](KAUNIT_GUIDE.md)
- [USER_GUIDE.md](USER_GUIDE.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)

Last updated: 12 Maret 2026
