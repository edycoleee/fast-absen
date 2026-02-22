# Panduan KA-UNIT (Kepala Unit) - Sistem Absensi RSUD Sulfat

Panduan operasional role `ka-unit` untuk monitoring dan approval unit sendiri.

- Swagger: `http://192.168.171.15:8000/docs`
- Base API: `/api/v1`

---

## 1) Login Kepala Unit

Endpoint: `POST /api/v1/auth/login`

```json
{
  "username": "kaunit_username",
  "password": "password_anda"
}
```

Setelah login:
1. simpan `access_token`
2. baca `menu_guard` dari response
3. ikuti endpoint sesuai `menu_guard`

Field auth penting:
- `roles`
- `permissions`
- `menu_guard.is_kepala_unit`
- `menu_guard.kepala_unit_scope_id`
- `menu_guard.menus.kpi_unit_role.endpoint`

---

## 2) Endpoint Utama KA-UNIT

## A. Dashboard KPI Unit

Gunakan endpoint dari kontrak auth:
- `GET /stats/kpi/unit-role/my-unit`

Endpoint ini:
- otomatis terscope ke unit kepala unit
- tidak butuh query `id_unit`
- menyediakan `summary`, `detail_karyawan`, `watermark`, `audit`

Contoh:
`GET /api/v1/stats/kpi/unit-role/my-unit?start_date=2026-03-01&end_date=2026-03-31`

## B. Monitoring Absensi Unit

- `GET /absensi/statistics`
- `GET /absensi/` (sesuai permission)

## C. Approval Pengajuan Absensi

- `GET /approval-pengajuan-absensi/assigned`
- `GET /approval-pengajuan-absensi/{pengajuan_id}/logs`
- `POST /approval-pengajuan-absensi/{pengajuan_id}/decision`

Contoh keputusan approval:

```json
{
  "action": "APPROVED",
  "catatan_approval": "Disetujui kepala unit sesuai bukti"
}
```

---

## 3) Aturan Scope Akses (Penting)

- Kepala unit hanya boleh melihat data unit yang menjadi scope `kepala_id_unit` miliknya.
- Untuk UI/frontend, jangan hardcode endpoint KPI.
- Selalu gunakan endpoint dari `menu_guard.menus.kpi_unit_role.endpoint`.
- Jika mencoba akses unit lain di endpoint umum, backend akan `403 Forbidden`.

---

## 4) Interpretasi KPI untuk Kepala Unit

Gunakan kombinasi metrik berikut untuk keputusan operasional:
- `summary.terjadwal_total`
- `summary.tidak_terjadwal_total`
- `summary.late`, `early_leave`, `mangkir`, `missing_checkout`
- `summary.scheduled_unassessed_total`
- `watermark.as_of`, `watermark.last_evaluated_at`, `watermark.data_freshness_minutes`

Catatan:
- `scheduled_unassessed_total` bukan pelanggaran; artinya shift terjadwal tapi belum dievaluasi final.
- Detail koreksi/approval dapat dilihat pada blok `audit` dan `detail_karyawan`.

---

## 5) SOP Harian KA-UNIT

1. Login dan cek `menu_guard`.
2. Buka KPI unit via endpoint my-unit.
3. Review `watermark` untuk memastikan data masih fresh.
4. Tindak lanjuti anomali (`late`, `mangkir`, `missing_checkout`) dari `detail_karyawan`.
5. Proses antrean approval pada endpoint assigned.
6. Simpan keputusan dengan `catatan_approval` yang jelas untuk audit.

---

## 6) Error Umum

- `401 Unauthorized`: token invalid/expired
- `403 Forbidden`: akses di luar unit scope atau permission kurang
- `404 Not Found`: data/pengajuan tidak ditemukan
- `400 Bad Request`: payload keputusan approval tidak valid

---

## 7) Referensi

- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [USER_GUIDE.md](USER_GUIDE.md)
- [DOC_MAPPING_FRONTEND.md](DOC_MAPPING_FRONTEND.md)

Last updated: 22 Februari 2026
