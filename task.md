# Rencana Refactor Frontend Pages

## Latar Belakang
Semua halaman awalnya dibuat monolitik (satu file handle semua: constants, helpers,
state, logic, sub-komponen, render). File terbesar mencapai 1.479 baris.
Tujuan refactor: pisahkan tanggung jawab, bukan ubah fitur.

---

## Tier 1 — File Paling Prioritas (1000+ baris)

### [ ] PILOT: RosterAdapterPage.jsx (1.479 baris)
Pecah menjadi folder `pages/admin/roster-adapter/`:

| File baru | Isi |
|---|---|
| `RosterAdapterPage.jsx` | Orchestrator, hanya rangkai komponen, ~200 baris |
| `useRosterAdapterState.js` | Semua useState + handler (saveKamus, handleUpload, handleSave, dll) |
| `KamusKodeEditorModal.jsx` | Modal 📖 Editor Kamus Kode Shift |
| `KamusPolaEditorModal.jsx` | Modal 🔁 Kamus Pola |
| `RosterGrid.jsx` | Tabel pegawai × hari (scroll horizontal) |
| `CellPickerPopup.jsx` | Popup pilih kode saat klik cell |
| `PreviewSavePanel.jsx` | Panel preview & konfirmasi simpan roster |
| `FillPatternDialog.jsx` | Dialog isi pola otomatis per baris |

**Urutan eksekusi:**
1. Extract `KamusKodeEditorModal.jsx` — modal paling mandiri, tidak ada prop kompleks
2. Extract `KamusPolaEditorModal.jsx` — serupa
3. Extract `CellPickerPopup.jsx` — komponen kecil, input: kamus, onSelect, onClose
4. Extract `FillPatternDialog.jsx` — komponen kecil
5. Extract `PreviewSavePanel.jsx` — input: previewItems, onSave, onCancel
6. Extract `RosterGrid.jsx` — tabel besar, input: rows, days, kamus, handlers
7. Extract `useRosterAdapterState.js` — pindahkan semua state & logic ke custom hook
8. Simplify `RosterAdapterPage.jsx` jadi orchestrator tipis

**Kriteria selesai:** semua fitur berjalan sama, baris orchestrator < 250 baris.

---

### [ ] AttendanceDashboardPage.jsx (1.319 baris)
Halaman absensi pegawai. Belum dianalisis detail.
Lakukan analisis dulu sebelum eksekusi:
- Identifikasi modal/panel yang bisa diekstrak
- Identifikasi state yang bisa dipindah ke custom hook

---

### [ ] RosterShiftPage.jsx (1.164 baris)
Halaman monitoring roster shift. Belum dianalisis detail.
Sama seperti di atas, analisis dulu.

---

## Tier 2 — Extract Sub-komponen (700–900 baris)

Tidak perlu custom hook. Cukup pindahkan modal/tabel ke file terpisah.

| File | Baris | Aksi |
|---|---|---|
| [ ] AttendanceMonitorPage.jsx | 863 | Extract modal + tabel ke komponen |
| [ ] FaceRegistrationPage.jsx | 840 | Extract steps/panel face register |
| [ ] PenilaianShiftAbsensiPage.jsx | 831 | Extract filter panel + result table |
| [ ] EmployeesPage.jsx | 771 | Extract form modal pegawai |
| [ ] UsersPage.jsx | 721 | Extract form modal user |
| [ ] SessionMonitorPage.jsx | 715 | Extract tabel + filter |

---

## Tier 3 — Biarkan (< 600 baris, sudah cukup rapi)

- ApprovalPage.jsx (609)
- PegawaiShiftKelompokPage.jsx (556)
- ShiftKelompokAturanPage.jsx (530)
- AdminDashboardPage.jsx (455)
- RosterUploadBatchPage.jsx (424)
- ShiftKelompokPage.jsx (392)
- IpWhitelistPage.jsx (383)
- RolesPage.jsx (374)
- PermissionsPage.jsx (358)

---

## Aturan Refactor

1. **Tidak boleh mengubah fitur** — hanya memindahkan kode
2. **Satu file selesai dulu**, baru pindah ke file berikutnya
3. **Test manual full flow** setiap file setelah refactor sebelum commit
4. **Tidak refactor saat fitur sedang aktif dikerjakan** di file yang sama
5. Setiap extract sub-komponen: prop harus eksplisit, tidak boleh drilling lebih dari 2 level
6. Custom hook hanya untuk state + handler, bukan untuk JSX

---

## Status

- [ ] Pilot: RosterAdapterPage.jsx
- [ ] AttendanceDashboardPage.jsx
- [ ] RosterShiftPage.jsx
- [ ] Tier 2 (satu per satu)
