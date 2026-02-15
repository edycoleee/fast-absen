"""
Permission Registry
Central list of permissions used by the API
"""

PERMISSIONS = {
    "user.login": "Login aplikasi",
    "users.read": "Melihat data user",
    "users.create": "Membuat user",
    "users.update": "Mengubah user",
    "users.delete": "Menghapus user",
    "roles.read": "Melihat data role",
    "roles.create": "Membuat role",
    "roles.update": "Mengubah role",
    "roles.delete": "Menghapus role",
    "permissions.read": "Melihat data permission",
    "permissions.create": "Membuat permission",
    "permissions.update": "Mengubah permission",
    "permissions.delete": "Menghapus permission",
    "pegawai.read": "Melihat data pegawai",
    "pegawai.create": "Membuat pegawai",
    "pegawai.update": "Mengubah pegawai",
    "pegawai.delete": "Menghapus pegawai",
    "absensi.read": "Melihat data absensi",
    "absensi.create": "Membuat absensi",
    "absensi.update": "Mengubah absensi",
    "absensi.delete": "Menghapus absensi",
    "login_absensi.read": "Melihat data login absensi",
    "login_absensi.create": "Membuat login absensi"
}


class PermissionKeys:
    USER_LOGIN = "user.login"
    USERS_READ = "users.read"
    USERS_CREATE = "users.create"
    USERS_UPDATE = "users.update"
    USERS_DELETE = "users.delete"
    ROLES_READ = "roles.read"
    ROLES_CREATE = "roles.create"
    ROLES_UPDATE = "roles.update"
    ROLES_DELETE = "roles.delete"
    PERMISSIONS_READ = "permissions.read"
    PERMISSIONS_CREATE = "permissions.create"
    PERMISSIONS_UPDATE = "permissions.update"
    PERMISSIONS_DELETE = "permissions.delete"
    PEGAWAI_READ = "pegawai.read"
    PEGAWAI_CREATE = "pegawai.create"
    PEGAWAI_UPDATE = "pegawai.update"
    PEGAWAI_DELETE = "pegawai.delete"
    ABSENSI_READ = "absensi.read"
    ABSENSI_CREATE = "absensi.create"
    ABSENSI_UPDATE = "absensi.update"
    ABSENSI_DELETE = "absensi.delete"
    LOGIN_ABSENSI_READ = "login_absensi.read"
    LOGIN_ABSENSI_CREATE = "login_absensi.create"


def list_permissions() -> list[str]:
    return list(PERMISSIONS.keys())
