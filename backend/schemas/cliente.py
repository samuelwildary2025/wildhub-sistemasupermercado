from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ClienteMetrics(BaseModel):
    id: int
    nome: str
    telefone: str
    email: str
    order_count: int
    last_order_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClienteBase(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    cpf: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    ativo: bool = True

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    ativo: Optional[bool] = None

class Cliente(ClienteBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True