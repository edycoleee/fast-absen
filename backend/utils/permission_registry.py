"""
Permission Registry
Central list of permissions used by the API
"""

PERMISSIONS = {
    # Authentication
    "user.login": "Login ke aplikasi",
    
    # User Management
    "users.read": "Melihat data user",
    "users.create": "Membuat user baru",
    "users.update": "Mengubah data user",
    "users.delete": "Menghapus user",
    
    # Role Management
    "roles.read": "Melihat data role",
    "roles.create": "Membuat role baru",
    "roles.update": "Mengubah role",
    "roles.delete": "Menghapus role",
    
    # Permission Management
    "permissions.read": "Melihat data permission",
    "permissions.create": "Membuat permission baru",
    "permissions.update": "Mengubah permission",
    "permissions.delete": "Menghapus permission",
    
    # Pegawai Management
    "pegawai.read": "Melihat data pegawai",
    "pegawai.create": "Membuat data pegawai baru",
    "pegawai.update": "Mengubah data pegawai",
    "pegawai.delete": "Menghapus data pegawai",

    # Unit Management
    "unit.read": "Melihat data unit",
    "unit.create": "Membuat data unit baru",
    "unit.update": "Mengubah data unit",
    "unit.delete": "Menghapus data unit",

    # Shift Kelompok Management
    "shift_kelompok.read": "Melihat data shift kelompok",
    "shift_kelompok.create": "Membuat data shift kelompok baru",
    "shift_kelompok.update": "Mengubah data shift kelompok",
    "shift_kelompok.delete": "Menghapus data shift kelompok",

    # Shift Kelompok Aturan Management
    "shift_kelompok_aturan.read": "Melihat data aturan shift kelompok",
    "shift_kelompok_aturan.create": "Membuat data aturan shift kelompok baru",
    "shift_kelompok_aturan.update": "Mengubah data aturan shift kelompok",
    "shift_kelompok_aturan.delete": "Menghapus data aturan shift kelompok",

    # Pegawai Shift Kelompok Management
    "pegawai_shift_kelompok.read": "Melihat data assignment pegawai ke kelompok shift",
    "pegawai_shift_kelompok.create": "Membuat assignment pegawai ke kelompok shift",
    "pegawai_shift_kelompok.update": "Mengubah assignment pegawai ke kelompok shift",
    "pegawai_shift_kelompok.delete": "Menghapus assignment pegawai ke kelompok shift",

    # Roster Upload Batch Management
    "roster_upload_batch.read": "Melihat data batch upload roster",
    "roster_upload_batch.create": "Membuat data batch upload roster",
    "roster_upload_batch.update": "Mengubah data batch upload roster",
    "roster_upload_batch.delete": "Menghapus data batch upload roster",

    # Roster Shift Management
    "roster_shift.read": "Melihat data roster shift",
    "roster_shift.create": "Membuat data roster shift",
    "roster_shift.update": "Mengubah data roster shift",
    "roster_shift.delete": "Menghapus data roster shift",

    # Penilaian Shift Absensi Management
    "penilaian_shift_absensi.read": "Melihat data penilaian shift absensi",
    "penilaian_shift_absensi.create": "Membuat data penilaian shift absensi",
    "penilaian_shift_absensi.update": "Mengubah data penilaian shift absensi",
    "penilaian_shift_absensi.delete": "Menghapus data penilaian shift absensi",

    # Approval Pengajuan Absensi
    "approval_pengajuan_absensi.read": "Melihat data pengajuan approval absensi",
    "approval_pengajuan_absensi.create": "Membuat pengajuan approval absensi",
    "approval_pengajuan_absensi.update": "Memutuskan/mengubah status pengajuan approval absensi",
    "approval_pengajuan_absensi.delete": "Membatalkan/menghapus pengajuan approval absensi",

    # Approval Pengajuan Absensi Log
    "approval_pengajuan_absensi_log.read": "Melihat audit log pengajuan approval absensi",
    
    # Absensi Management (User + Admin)
    "absensi.read": "Melihat data absensi (history, summary, today)",
    "absensi.create": "Membuat absensi (check-in)",
    "absensi.update": "Mengubah absensi (check-out, admin edit)",
    "absensi.delete": "Menghapus absensi (admin only)",
    
    # User Sessions Management
    "user_sessions.read": "Melihat data sesi pengguna",
    "user_sessions.create": "Membuat sesi pengguna baru",
    "user_sessions.update": "Mengubah status session",
    "user_sessions.delete": "Menghapus session",

    # Face Recognition Management
    "face.read": "Melihat status registrasi dan data face embeddings",
    "face.register": "Mendaftarkan/register wajah pegawai (upload embeddings)",
    "face.delete": "Menghapus face embeddings pegawai",
    "face.verify": "Verifikasi/validasi wajah untuk login dan absensi",

    # App Settings Management
    "app_settings.read": "Melihat konfigurasi sistem",
    "app_settings.update": "Mengubah konfigurasi sistem",

    # Kamus Kode Shift Management
    "kamus_kode_shift.read": "Melihat data kamus kode shift",
    "kamus_kode_shift.create": "Membuat kode shift baru",
    "kamus_kode_shift.update": "Mengubah data kode shift",
    "kamus_kode_shift.delete": "Menghapus kode shift",

    # Kamus Pola Shift Management
    "kamus_pola_shift.read": "Melihat data kamus pola shift",
    "kamus_pola_shift.create": "Membuat pola shift baru",
    "kamus_pola_shift.update": "Mengubah data pola shift",
    "kamus_pola_shift.delete": "Menghapus pola shift",
}


class PermissionKeys:
    # Authentication
    USER_LOGIN = "user.login"
    
    # User Management
    USERS_READ = "users.read"
    USERS_CREATE = "users.create"
    USERS_UPDATE = "users.update"
    USERS_DELETE = "users.delete"
    
    # Role Management
    ROLES_READ = "roles.read"
    ROLES_CREATE = "roles.create"
    ROLES_UPDATE = "roles.update"
    ROLES_DELETE = "roles.delete"
    
    # Permission Management
    PERMISSIONS_READ = "permissions.read"
    PERMISSIONS_CREATE = "permissions.create"
    PERMISSIONS_UPDATE = "permissions.update"
    PERMISSIONS_DELETE = "permissions.delete"
    
    # Pegawai Management
    PEGAWAI_READ = "pegawai.read"
    PEGAWAI_CREATE = "pegawai.create"
    PEGAWAI_UPDATE = "pegawai.update"
    PEGAWAI_DELETE = "pegawai.delete"

    # Unit Management
    UNIT_READ = "unit.read"
    UNIT_CREATE = "unit.create"
    UNIT_UPDATE = "unit.update"
    UNIT_DELETE = "unit.delete"

    # Shift Kelompok Management
    SHIFT_KELOMPOK_READ = "shift_kelompok.read"
    SHIFT_KELOMPOK_CREATE = "shift_kelompok.create"
    SHIFT_KELOMPOK_UPDATE = "shift_kelompok.update"
    SHIFT_KELOMPOK_DELETE = "shift_kelompok.delete"

    # Shift Kelompok Aturan Management
    SHIFT_KELOMPOK_ATURAN_READ = "shift_kelompok_aturan.read"
    SHIFT_KELOMPOK_ATURAN_CREATE = "shift_kelompok_aturan.create"
    SHIFT_KELOMPOK_ATURAN_UPDATE = "shift_kelompok_aturan.update"
    SHIFT_KELOMPOK_ATURAN_DELETE = "shift_kelompok_aturan.delete"

    # Pegawai Shift Kelompok Management
    PEGAWAI_SHIFT_KELOMPOK_READ = "pegawai_shift_kelompok.read"
    PEGAWAI_SHIFT_KELOMPOK_CREATE = "pegawai_shift_kelompok.create"
    PEGAWAI_SHIFT_KELOMPOK_UPDATE = "pegawai_shift_kelompok.update"
    PEGAWAI_SHIFT_KELOMPOK_DELETE = "pegawai_shift_kelompok.delete"

    # Roster Upload Batch Management
    ROSTER_UPLOAD_BATCH_READ = "roster_upload_batch.read"
    ROSTER_UPLOAD_BATCH_CREATE = "roster_upload_batch.create"
    ROSTER_UPLOAD_BATCH_UPDATE = "roster_upload_batch.update"
    ROSTER_UPLOAD_BATCH_DELETE = "roster_upload_batch.delete"

    # Roster Shift Management
    ROSTER_SHIFT_READ = "roster_shift.read"
    ROSTER_SHIFT_CREATE = "roster_shift.create"
    ROSTER_SHIFT_UPDATE = "roster_shift.update"
    ROSTER_SHIFT_DELETE = "roster_shift.delete"

    # Penilaian Shift Absensi Management
    PENILAIAN_SHIFT_ABSENSI_READ = "penilaian_shift_absensi.read"
    PENILAIAN_SHIFT_ABSENSI_CREATE = "penilaian_shift_absensi.create"
    PENILAIAN_SHIFT_ABSENSI_UPDATE = "penilaian_shift_absensi.update"
    PENILAIAN_SHIFT_ABSENSI_DELETE = "penilaian_shift_absensi.delete"

    # Approval Pengajuan Absensi
    APPROVAL_PENGAJUAN_ABSENSI_READ = "approval_pengajuan_absensi.read"
    APPROVAL_PENGAJUAN_ABSENSI_CREATE = "approval_pengajuan_absensi.create"
    APPROVAL_PENGAJUAN_ABSENSI_UPDATE = "approval_pengajuan_absensi.update"
    APPROVAL_PENGAJUAN_ABSENSI_DELETE = "approval_pengajuan_absensi.delete"

    # Approval Pengajuan Absensi Log
    APPROVAL_PENGAJUAN_ABSENSI_LOG_READ = "approval_pengajuan_absensi_log.read"
    
    # Absensi Management
    ABSENSI_READ = "absensi.read"
    ABSENSI_CREATE = "absensi.create"
    ABSENSI_UPDATE = "absensi.update"
    ABSENSI_DELETE = "absensi.delete"
    
    # User Sessions Management
    USER_SESSIONS_READ = "user_sessions.read"
    USER_SESSIONS_CREATE = "user_sessions.create"
    USER_SESSIONS_UPDATE = "user_sessions.update"
    USER_SESSIONS_DELETE = "user_sessions.delete"

    # Kamus Kode Shift Management
    KAMUS_KODE_SHIFT_READ   = "kamus_kode_shift.read"
    KAMUS_KODE_SHIFT_CREATE = "kamus_kode_shift.create"
    KAMUS_KODE_SHIFT_UPDATE = "kamus_kode_shift.update"
    KAMUS_KODE_SHIFT_DELETE = "kamus_kode_shift.delete"

    # Kamus Pola Shift Management
    KAMUS_POLA_SHIFT_READ   = "kamus_pola_shift.read"
    KAMUS_POLA_SHIFT_CREATE = "kamus_pola_shift.create"
    KAMUS_POLA_SHIFT_UPDATE = "kamus_pola_shift.update"
    KAMUS_POLA_SHIFT_DELETE = "kamus_pola_shift.delete"

    # Face Recognition Management
    FACE_READ = "face.read"
    FACE_REGISTER = "face.register"
    FACE_DELETE = "face.delete"
    FACE_VERIFY = "face.verify"

    # App Settings Management
    APP_SETTINGS_READ   = "app_settings.read"
    APP_SETTINGS_UPDATE = "app_settings.update"


def list_permissions() -> list[str]:
    return list(PERMISSIONS.keys())
