from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, inspect, text
import traceback
import os
import re
import json
from typing import List, Optional
from database import get_db, engine # Importado 'engine'
from models.pedido import Pedido, ItemPedido
from models.cliente import Cliente
from models.user import User
from schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from auth.middleware import get_current_user, get_current_tenant, validate_custom_token_or_jwt
from utils.crud_logger import log_event
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

# A única função de migração necessária (simplificada)
def _ensure_numero_pedido_column(db: Session) -> None:
    # Esta função será mantida APENAS para o caso do main não ter rodado
    # Em produção, a coluna deve ser criada pela ORM no main.py ou por migração Alembic
    pass 
    
# Funções auxiliares (Placeholder)
def _placeholder_email(tenant_id: int, telefone: str) -> str:
    digits = "".join(re.findall(r"\d", telefone or "")) or "0000"
    return f"cliente-{tenant_id}-{digits}@contatos.supermercado"

def _upsert_cliente_from_order(db: Session, tenant_id: int, payload: PedidoCreate) -> Optional[Cliente]:
    # Lógica mantida: garante que o cliente existe
    telefone = getattr(payload, "telefone", None)
    nome = payload.nome_cliente

    if not telefone and not nome: return None
    query = db.query(Cliente).filter(Cliente.tenant_id == tenant_id)

    cliente = None
    if telefone: cliente = query.filter(Cliente.telefone == telefone).first()
    if not cliente: cliente = query.filter(Cliente.nome == nome).first()

    endereco = getattr(payload, "endereco", None)

    if cliente:
        updated = False
        if telefone and cliente.telefone != telefone: cliente.telefone = telefone; updated = True
        if nome and cliente.nome != nome: cliente.nome = nome; updated = True
        if endereco and (cliente.endereco or "").strip() != endereco.strip(): cliente.endereco = endereco; updated = True
        if updated: cliente.ativo = True
        return cliente
    else:
        if not telefone: return None
        cliente = Cliente(
            nome=nome or "Cliente", email=_placeholder_email(tenant_id, telefone), telefone=telefone,
            endereco=endereco, tenant_id=tenant_id, ativo=True,
        )
        db.add(cliente)
        db.flush()
        return cliente
# Fim das funções auxiliares


@router.post("/", response_model=PedidoResponse)
def create_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    # Lógica de criação de pedido mantida
    # ...
    # Exemplo: Lógica de criação com foi_alterado=False por padrão
    create_kwargs = {
        # ...
        "foi_alterado": False, 
        # ...
    }
    # ...

    # O resto do endpoint POST é mantido conforme a versão que estava funcionando.
    # [Conteúdo omitido para foco na correção, mas deve ser mantido no seu arquivo]
    # ...


# ROTAS GET / PUT / DELETE DE PEDIDO POR ID (LÓGICA DE VALIDAÇÃO DE STATUS MANTIDA)
@router.get("/", response_model=List[PedidoResponse])
def list_pedidos(
    status: Optional[str] = None, db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user), tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    query = db.query(Pedido)
    if tenant_id is not None: query = query.filter(Pedido.tenant_id == tenant_id)
    if status: query = query.filter(Pedido.status == status)
    return query.all()

@router.get("/{pedido_id}", response_model=PedidoResponse)
def get_pedido(
    pedido_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None: query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    return pedido

@router.put("/{pedido_id}", response_model=PedidoResponse)
def update_pedido(
    pedido_id: int, pedido_update: PedidoUpdate, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    # [Conteúdo omitido] Lógica de PUT por ID mantida, incluindo a validação de status faturado.
    # ...

    # O restante do endpoint PUT por ID é mantido
    # ...

    # [Lógica da função PUT por ID aqui]
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None: query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    
    if pedido.status == "faturado":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível alterar um pedido que já foi faturado.")
        
    before_snapshot = {"nome_cliente": pedido.nome_cliente, "status": pedido.status, "valor_total": pedido.valor_total}
    update_data = pedido_update.dict(exclude_unset=True)

    try:
        # Lógica de atualização de itens e campos...
        
        # Marcar como alterado
        if len(update_data) > 0 and 'foi_alterado' not in update_data:
            setattr(pedido, "foi_alterado", True) 
        
        # ...
        db.commit()
        db.refresh(pedido)
        return pedido # Simplificado
    except:
        db.rollback()
        raise

@router.delete("/{pedido_id}")
def delete_pedido(
    pedido_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), 
    tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    # [Conteúdo omitido] Lógica de DELETE mantida, incluindo a validação de status faturado.
    # ...
    # [Lógica da função DELETE aqui]
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None: query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    if pedido.status == "faturado": raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não é possível excluir um pedido que já foi faturado.")
    db.delete(pedido)
    db.commit()
    return {"message": "Pedido excluído com sucesso"}
    # ...

# ==============================================
# ✏️ Endpoint PUT /telefone/{telefone} (LÓGICA CHAVE!)
# ==============================================
@router.put("/telefone/{telefone}", response_model=PedidoResponse)
def update_pedido_por_telefone(
    telefone: str,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)

    # 🔐 Obter tenant_id com base no tipo de token
    if token_info["type"] == "jwt":
        tenant_id = token_info["supermarket_id"]
        user_email = token_info["user"].email
    else:
        tenant_id = token_info["supermarket_id"]
        user_email = f"custom_token_{token_info['supermarket'].email}"

    # 🔍 Busca o pedido PENDENTE mais recente pelo telefone (CORREÇÃO IMPLEMENTADA)
    query = db.query(Pedido).filter(
        Pedido.telefone == telefone,
        Pedido.status == "pendente" # <--- CHAVE PARA IGNORAR FATURADOS
    )
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)

    # Pega o pedido pendente mais recente
    pedido = query.order_by(Pedido.data_pedido.desc()).first()
    
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum pedido PENDENTE encontrado para este telefone no seu supermercado."
        )

    before_snapshot = {
        "nome_cliente": pedido.nome_cliente,
        "status": pedido.status,
        "valor_total": pedido.valor_total,
    }

    update_data = pedido_update.dict(exclude_unset=True)

    try:
        # Verifica se há dados para atualizar (excluindo 'itens')
        has_updates = any(k != 'itens' for k in update_data.keys()) or ('itens' in update_data and update_data['itens'] is not None)

        # Atualiza os itens, se enviados
        if "itens" in update_data and pedido_update.itens:
            # Apaga os itens antigos
            db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido.id).delete()

            novo_total = 0.0
            for item in pedido_update.itens:
                subtotal = item.quantidade * item.preco_unitario
                novo_total += subtotal
                db_item = ItemPedido(
                    pedido_id=pedido.id,
                    nome_produto=item.nome_produto,
                    quantidade=item.quantidade,
                    preco_unitario=item.preco_unitario
                )
                db.add(db_item)

            pedido.valor_total = round(novo_total, 2)
            update_data["valor_total"] = pedido.valor_total
        
        # O campo 'itens' não existe no modelo, então o removemos do dicionário de atualização
        if "itens" in update_data:
            del update_data["itens"]

        # 🔑 MARCAÇÃO CHAVE: Define o flag 'foi_alterado' como True
        if has_updates:
            setattr(pedido, "foi_alterado", True)
        
        # Permite que o flag seja resetado manualmente (se enviado no payload)
        if 'foi_alterado' in update_data:
            setattr(pedido, "foi_alterado", update_data['foi_alterado'])
        
        # Aplicar outros campos do Pedido
        for key, value in update_data.items():
            if key not in ["valor_total", "itens", "foi_alterado"] and hasattr(pedido, key):
                 setattr(pedido, key, value)


        db.commit()
        db.refresh(pedido)

        log_event(
            "update", "pedido_por_telefone", pedido.id, user_email, before=before_snapshot, after=update_data, success=True,
        )

        return pedido

    except Exception as e:
        db.rollback()
        log_event(
            "update", "pedido_por_telefone", pedido.id, user_email, before=before_snapshot, after=update_data, success=False, message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pedido via telefone: {str(e)}")
