"""
AppSetting Repository
CRUD operasi untuk tabel app_settings
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from models.app_setting import AppSetting


class AppSettingRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Read ──────────────────────────────────────────────────────────────

    def get_all(self) -> List[AppSetting]:
        return self.db.query(AppSetting).order_by(AppSetting.key).all()

    def get(self, key: str) -> Optional[AppSetting]:
        return self.db.query(AppSetting).filter(AppSetting.key == key).first()

    def get_value(self, key: str, default: str = "") -> str:
        """Ambil value saja, kembalikan default jika tidak ada."""
        setting = self.get(key)
        return setting.value if setting else default

    def get_float(self, key: str, default: float = 0.0) -> float:
        try:
            return float(self.get_value(key, str(default)))
        except (ValueError, TypeError):
            return default

    def get_bool(self, key: str, default: bool = False) -> bool:
        val = self.get_value(key, str(default)).strip().lower()
        return val in ("true", "1", "yes")

    def is_locked(self, key: str) -> bool:
        setting = self.get(key)
        return setting.locked if setting else False

    # ── Write ─────────────────────────────────────────────────────────────

    def upsert(
        self,
        key: str,
        value: str,
        description: Optional[str] = None,
        locked: Optional[bool] = None,
        updated_by: Optional[int] = None,
    ) -> AppSetting:
        setting = self.get(key)
        if setting:
            setting.value = value
            if description is not None:
                setting.description = description
            if locked is not None:
                setting.locked = locked
            setting.updated_by = updated_by
        else:
            setting = AppSetting(
                key=key,
                value=value,
                description=description,
                locked=locked if locked is not None else False,
                updated_by=updated_by,
            )
            self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def delete(self, key: str) -> bool:
        setting = self.get(key)
        if not setting:
            return False
        self.db.delete(setting)
        self.db.commit()
        return True
