from pydantic import BaseModel, computed_field, model_validator
from typing import List, Optional
from datetime import datetime
import re

class ItemPedidoCreate(BaseModel):
    nome_produto: str
    quantidade: int
    preco_unitario: float
    # Aceita subtotal no payload, mesmo sem persistir em coluna dedicada
    subtotal: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_item(cls, data):
        # Permite itens com campos alternativos: produto/nome -> nome_produto
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
    # Novos campos aceitos no payload
    telefone: Optional[str] = None
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    # created_at será mapeado para data_pedido
    created_at: Optional[datetime] = None
    # total do pedido para validação cruzada (opcional)
    total: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_payload(cls, data):
        # Aceita formato alternativo com cliente.nome
        if isinstance(data, dict):
            if "nome_cliente" not in data:
                cliente = data.get("cliente")
                if isinstance(cliente, dict):
                    nome = cliente.get("nome")
                    if nome:
                        data["nome_cliente"] = nome
            # Normaliza telefone a partir de diferentes chaves e níveis
            if "telefone" not in data or not data.get("telefone"):
                telefone = None
                # Aninhanhado em cliente
                cliente = data.get("cliente") if isinstance(data.get("cliente"), dict) else None
                if cliente:
                    telefone = cliente.get("telefone") or cliente.get("phone") or cliente.get("celular")
                # Raiz
                if not telefone:
                    telefone = data.get("phone") or data.get("celular")
                if telefone:
                    # mantém apenas dígitos (formatação tratada no frontend)
                    data["telefone"] = re.sub(r"[^0-9]", "", str(telefone))
            # Itens são normalizados pelo validador de ItemPedidoCreate
        return data

class PedidoUpdate(BaseModel):
    nome_cliente: Optional[str] = None
    status: Optional[str] = None
    telefone: Optional[str] = None

class PedidoResponse(BaseModel):
    id: int
    tenant_id: int
    nome_cliente: str
    telefone: Optional[str] = None
    valor_total: float
    status: str
    data_pedido: datetime
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    itens: List[ItemPedidoResponse]
    
    class Config:
        from_attributes = True