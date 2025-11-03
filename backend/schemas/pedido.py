from pydantic import BaseModel, computed_field, model_validator
from typing import List, Optional
from datetime import datetime

# Importar ItemPedidoCreate é essencial
from .pedido import ItemPedidoCreate # <- Garanta que este import esteja correto se estiver em arquivos separados, mas aqui já está no topo.

# ... (Outras classes: ItemPedidoCreate, ItemPedidoResponse, PedidoCreate)

class PedidoUpdate(BaseModel):
    # Campos básicos que podem ser atualizados
    nome_cliente: Optional[str] = None
    status: Optional[str] = None
    
    # NOVOS CAMPOS PARA PERMITIR A ATUALIZAÇÃO (incluindo a lista de itens)
    # Adicionar 'itens' (o principal problema)
    itens: Optional[List[ItemPedidoCreate]] = None 
    
    # Adicionar campos opcionais que foram incluídos no modelo/create
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    telefone: Optional[str] = None
    
    # Campos de tempo e validação (opcional)
    created_at: Optional[datetime] = None
    total: Optional[float] = None # Para validação cruzada

# ... (Resto do arquivo)

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
    forma: Optional[str] = None
    endereco: Optional[str] = None
    observacao: Optional[str] = None
    telefone: Optional[str] = None # <-- NOVO: Adicionado para receber o telefone
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
            # Itens são normalizados pelo validador de ItemPedidoCreate
        return data

class PedidoUpdate(BaseModel):
    nome_cliente: Optional[str] = None
    status: Optional[str] = None

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
    telefone: Optional[str] = None # <-- NOVO: Adicionado para incluir o telefone na resposta da API
    itens: List[ItemPedidoResponse]
    
    class Config:
        from_attributes = True
