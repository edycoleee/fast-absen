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
    
    # Absensi Management (User + Admin)
    "absensi.read": "Melihat data absensi (history, summary, today)",
    "absensi.create": "Membuat absensi (check-in)",
    "absensi.update": "Mengubah absensi (check-out, admin edit)",
    "absensi.delete": "Menghapus absensi (admin only)",
    
    # User Sessions Management
    "user_sessions.read": "Melihat data session login",
    "user_sessions.create": "Membuat session login baru",
    "user_sessions.update": "Mengubah status session",
    "user_sessions.delete": "Menghapus session",
    
    # Deprecated - kept for backward compatibility
    "login_absensi.read": "[DEPRECATED] Melihat data login absensi",
    "login_absensi.create": "[DEPRECATED] Membuat login absensi"
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
    
    # Deprecated - kept for backward compatibility
    LOGIN_ABSENSI_READ = "login_absensi.read"
    LOGIN_ABSENSI_CREATE = "login_absensi.create"


def list_permissions() -> list[str]:
    return list(PERMISSIONS.keys())
