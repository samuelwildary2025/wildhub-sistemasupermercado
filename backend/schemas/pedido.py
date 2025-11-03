from pydantic import BaseModel, computed_field, model_validator
from typing import List, Optional
from datetime import datetime

class ItemPedidoCreate(BaseModel):
    nome_produto: str
    quantidade: int
    preco_unitario: float
    subtotal: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_item(cls, data):
        if isinstance(data, dict):
            if "nome_produto" not in data:
                if "produto" in data and data["produto"]:
                    data["nome_produto"] = data["produto"]
                elif "nome" in data and data["nome"]:
                    data["nome_produto"] = data["nome"]
        return data

class ItemPedidoResponse(BaseModel):
    id: int
    nome_produto: str
    quantidade: int
    preco_unitario: float
    
    @computed_field
    @property
    def subtotal(self) -> float:
        try:
            return float(self.quantidade) * float(self.preco_unitario)
        except Exception:
            return 0.0
    
    class Config:
        from_attributes = True

class PedidoCreate(BaseModel):
    nome_cliente: str
    itens: List[ItemPedidoCreate]
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    telefone: Optional[str] = None 
    created_at: Optional[datetime] = None
    total: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data):
        if isinstance(data, dict):
            if "nome_cliente" not in data:
                cliente = data.get("cliente")
                if isinstance(cliente, dict):
                    nome = cliente.get("nome")
                    if nome:
                        data["nome_cliente"] = nome
        return data

class PedidoUpdate(BaseModel):
    nome_cliente: Optional[str] = None
    status: Optional[str] = None
    itens: Optional[List[ItemPedidoCreate]] = None 
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    telefone: Optional[str] = None
    created_at: Optional[datetime] = None
    total: Optional[float] = None
    foi_alterado: Optional[bool] = None

class PedidoResponse(BaseModel):
    id: int
    tenant_id: int
    numero_pedido: int
    nome_cliente: str
    valor_total: float
    status: str
    data_pedido: datetime
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    telefone: Optional[str] = None
    itens: List[ItemPedidoResponse]
    foi_alterado: bool = False
    
    class Config:
        from_attributes = True
