from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from database import get_db
from models.cliente import Cliente
from models.pedido import Pedido
from models.user import User
from schemas.cliente import Cliente as ClienteSchema, ClienteCreate, ClienteUpdate, ClienteMetrics
from auth import get_current_user

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

@router.post("/", response_model=ClienteSchema)
def create_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Criar um novo cliente para o supermercado"""
    # Verificar se o usuário tem permissão (deve ser do supermercado)
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem criar clientes"
        )
    
    # Verificar se email já existe para este tenant
    existing_cliente = db.query(Cliente).filter(
        Cliente.email == cliente.email,
        Cliente.tenant_id == current_user.tenant_id
    ).first()
    
    if existing_cliente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cliente com este email já existe"
        )
    
    # Criar novo cliente
    db_cliente = Cliente(
        **cliente.dict(),
        tenant_id=current_user.tenant_id
    )
    
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    
    return db_cliente

@router.get("/", response_model=List[ClienteSchema])
def list_clientes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar clientes do supermercado"""
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem listar clientes"
        )
    
    clientes = db.query(Cliente).filter(
        Cliente.tenant_id == current_user.tenant_id
    ).offset(skip).limit(limit).all()
    
    return clientes

# IMPORTANTE: Colocar rotas estáticas antes das rotas dinâmicas para evitar 422
@router.get("/metrics", response_model=List[ClienteMetrics])
def list_clientes_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar clientes com métricas básicas: quantidade de pedidos e último pedido."""
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem listar clientes"
        )

    rows = (
        db.query(
            Cliente.id.label("id"),
            Cliente.nome.label("nome"),
            Cliente.telefone.label("telefone"),
            Cliente.email.label("email"),
            func.count(Pedido.id).label("order_count"),
            func.max(Pedido.data_pedido).label("last_order_at"),
        )
        .outerjoin(Pedido, (Pedido.cliente_id == Cliente.id) & (Pedido.tenant_id == current_user.tenant_id))
        .filter(Cliente.tenant_id == current_user.tenant_id)
        .group_by(Cliente.id, Cliente.nome, Cliente.telefone, Cliente.email)
        .order_by(desc("order_count"), desc("last_order_at"))
        .all()
    )

    return [
        {
            "id": r.id,
            "nome": r.nome,
            "telefone": r.telefone,
            "email": r.email,
            "order_count": int(r.order_count or 0),
            "last_order_at": r.last_order_at,
        }
        for r in rows
    ]

@router.get("/{cliente_id}", response_model=ClienteSchema)
def get_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obter cliente específico"""
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem visualizar clientes"
        )
    
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.tenant_id == current_user.tenant_id
    ).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    return cliente

@router.put("/{cliente_id}", response_model=ClienteSchema)
def update_cliente(
    cliente_id: int,
    cliente_update: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Atualizar cliente"""
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem atualizar clientes"
        )
    
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.tenant_id == current_user.tenant_id
    ).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    # Atualizar campos fornecidos
    update_data = cliente_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cliente, field, value)
    
    db.commit()
    db.refresh(cliente)
    
    return cliente

@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletar cliente"""
    if current_user.role != "supermarket":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas supermercados podem deletar clientes"
        )
    
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.tenant_id == current_user.tenant_id
    ).first()
    
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado"
        )
    
    db.delete(cliente)
    db.commit()
    
    return {"message": "Cliente deletado com sucesso"}