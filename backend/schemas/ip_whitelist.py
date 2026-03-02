"""
IP Whitelist Schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, field_validator, ConfigDict
import ipaddress


def _validate_ip_or_cidr(v: str) -> str:
    """Validasi bahwa nilai adalah IP tunggal atau CIDR yang valid."""
    v = v.strip()
    try:
        ipaddress.ip_address(v)
        return v
    except ValueError:
        pass
    try:
        ipaddress.ip_network(v, strict=False)
        return v
    except ValueError:
        raise ValueError(f"'{v}' bukan IP address atau CIDR yang valid (contoh: 192.168.1.1 atau 192.168.1.0/24)")


class IpWhitelistCreate(BaseModel):
    ip_address: str
    label: str
    is_active: bool = True

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        return _validate_ip_or_cidr(v)

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Label tidak boleh kosong")
        return v


class IpWhitelistUpdate(BaseModel):
    ip_address: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validate_ip_or_cidr(v)
        return v

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Label tidak boleh kosong")
        return v


class IpWhitelistResponse(BaseModel):
    id: int
    ip_address: str
    label: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
