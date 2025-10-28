from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Pedido(Base):
    __tablename__ = "pedidos"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("supermarkets.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)  # Novo campo para cliente
    nome_cliente = Column(String, nullable=False)  # Mantido para compatibilidade
    # Telefone do cliente (agora persistido)
    telefone = Column(String, nullable=True)
    valor_total = Column(Float, nullable=False, default=0.0)
    status = Column(String, default="pendente")  # pendente, faturado
    data_pedido = Column(DateTime, default=datetime.utcnow)
    # Novos campos opcionais
    forma = Column(String, nullable=True)
    endereco = Column(String, nullable=True)
    observacao = Column(String, nullable=True)
    
    # Relacionamentos
    supermarket = relationship("Supermarket", back_populates="pedidos")
    cliente = relationship("Cliente", back_populates="pedidos")
    itens = relationship("ItemPedido", back_populates="pedido", cascade="all, delete-orphan")

class ItemPedido(Base):
    __tablename__ = "itens_pedido"
    
    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    nome_produto = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    
    # Relacionamento
    pedido = relationship("Pedido", back_populates="itens")