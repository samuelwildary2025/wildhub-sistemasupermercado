from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, inspect, text
import traceback
import os
import re
from typing import List, Optional
from database import get_db
from models.pedido import Pedido, ItemPedido
from models.cliente import Cliente
from models.user import User
from schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from auth.middleware import get_current_user, get_current_tenant, validate_custom_token_or_jwt
from utils.crud_logger import log_event
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

_numero_pedido_migration_done = False
_foi_alterado_migration_done = False # Novo estado de migração


# Função de migração para o novo campo 'foi_alterado'
def _ensure_foi_alterado_column(db: Session) -> None:
    global _foi_alterado_migration_done
    if _foi_alterado_migration_done:
        return

    engine = db.get_bind()
    inspector = inspect(engine)
    
    try:
        column_names = [col["name"] for col in inspector.get_columns("pedidos")]
        if "foi_alterado" not in column_names:
            print("Migrating: Adding 'foi_alterado' column to pedidos table.")
            with engine.connect() as connection:
                # Adiciona coluna com valor padrão FALSE (usando TEXT para compatibilidade SQLite/PostgreSQL)
                connection.execute(text("ALTER TABLE pedidos ADD COLUMN foi_alterado BOOLEAN DEFAULT FALSE"))
                connection.commit()
            print("Migration successful: 'foi_alterado' column added.")
        
    except Exception as e:
        # Pode falhar se a tabela não existir, ou se a coluna já existir em outro tipo de migração
        print(f"Migration error for foi_alterado (ignored): {e}")
        pass # Ignoramos o erro e continuamos, pois a coluna pode já existir

    _foi_alterado_migration_done = True
    
# Funções de migração existentes
def _ensure_numero_pedido_column(db: Session) -> None:
    global _numero_pedido_migration_done
    if _numero_pedido_migration_done:
        return

    engine = db.get_bind()
    inspector = inspect(engine)
    column_names = [col["name"] for col in inspector.get_columns("pedidos")]

    if "numero_pedido" not in column_names:
        with engine.connect() as connection:
            connection.execute(text("ALTER TABLE pedidos ADD COLUMN numero_pedido INTEGER DEFAULT 0"))
            connection.commit()

    # Normaliza sequencias existentes
    pedidos_sem_numero = (
        db.query(Pedido)
        .filter((Pedido.numero_pedido == None) | (Pedido.numero_pedido == 0))
        .count()
    )

    if pedidos_sem_numero:
        pedidos = (
            db.query(Pedido)
            .order_by(Pedido.tenant_id, Pedido.data_pedido, Pedido.id)
            .all()
        )
        last_seq = {}
        for pedido in pedidos:
            seq = last_seq.get(pedido.tenant_id, 0) + 1
            pedido.numero_pedido = seq
            last_seq[pedido.tenant_id] = seq
        db.commit()

    _numero_pedido_migration_done = True

def _placeholder_email(tenant_id: int, telefone: str) -> str:
    digits = "".join(re.findall(r"\d", telefone or "")) or "0000"
    return f"cliente-{tenant_id}-{digits}@contatos.supermercado"


def _upsert_cliente_from_order(db: Session, tenant_id: int, payload: PedidoCreate) -> Optional[Cliente]:
    """Garante que o cliente existe na base a partir dos dados do pedido e retorna-o."""
    telefone = getattr(payload, "telefone", None)
    nome = payload.nome_cliente

    if not telefone and not nome:
        return None

    query = db.query(Cliente).filter(Cliente.tenant_id == tenant_id)

    cliente = None
    if telefone:
        cliente = query.filter(Cliente.telefone == telefone).first()
    if not cliente:
        cliente = query.filter(Cliente.nome == nome).first()

    endereco = getattr(payload, "endereco", None)

    if cliente:
        updated = False
        if telefone and cliente.telefone != telefone:
            cliente.telefone = telefone
            updated = True
        if nome and cliente.nome != nome:
            cliente.nome = nome
            updated = True
        if endereco and (cliente.endereco or "").strip() != endereco.strip():
            cliente.endereco = endereco
            updated = True
        if updated:
            cliente.ativo = True
        return cliente
    else:
        if not telefone:
            # Não cria registros sem telefone para evitar duplicidades
            return None
        cliente = Cliente(
            nome=nome or "Cliente",
            email=_placeholder_email(tenant_id, telefone),
            telefone=telefone,
            endereco=endereco,
            tenant_id=tenant_id,
            ativo=True,
        )
        db.add(cliente)
        db.flush()
        return cliente


@router.post("/", response_model=PedidoResponse)
def create_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração
    # Obter tenant_id baseado no tipo de token
    if token_info["type"] == "jwt":
        current_user = token_info["user"]
        tenant_id = token_info["supermarket_id"]
        user_email = current_user.email
    else:  # custom token
        current_user = None
        tenant_id = token_info["supermarket_id"]
        user_email = f"custom_token_{token_info['supermarket'].email}"
    
    # Validar tenant
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant inválido para criação de pedido")

    valor_total = sum(item.quantidade * item.preco_unitario for item in pedido.itens)
    try:
        # Validação cruzada com 'total' quando fornecido
        if getattr(pedido, "total", None) is not None:
            provided = float(pedido.total)
            if abs(provided - float(valor_total)) > 0.01:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Valor total informado ({provided}) difere do calculado pelos itens ({valor_total})."
                )
        cliente_entity = None
        try:
            cliente_entity = _upsert_cliente_from_order(db, tenant_id, pedido)
        except Exception:
            cliente_entity = None

        # Calcula próximo número sequencial para o tenant
        max_numero = (
            db.query(func.max(Pedido.numero_pedido))
            .filter(Pedido.tenant_id == tenant_id)
            .scalar()
        )
        next_numero = int(max_numero or 0) + 1

        # Criar pedido
        create_kwargs = {
            "tenant_id": tenant_id,
            "nome_cliente": pedido.nome_cliente,
            "valor_total": valor_total,
            "numero_pedido": next_numero,
            "foi_alterado": False, # Garantir que nasce como FALSE
        }
        if cliente_entity:
            create_kwargs["cliente_id"] = cliente_entity.id
        # Campos opcionais quando presentes
        if getattr(pedido, "forma", None) is not None:
            create_kwargs["forma"] = pedido.forma
        if getattr(pedido, "endereco", None) is not None:
            create_kwargs["endereco"] = pedido.endereco
        if getattr(pedido, "observacao", None) is not None:
            create_kwargs["observacao"] = pedido.observacao
        if getattr(pedido, "telefone", None) is not None:
            create_kwargs["telefone"] = pedido.telefone
        if getattr(pedido, "created_at", None) is not None:
            # Mapeia created_at -> data_pedido respeitando GMT-3
            if pedido.created_at.tzinfo is None:
                create_kwargs["data_pedido"] = pedido.created_at
            else:
                create_kwargs["data_pedido"] = pedido.created_at.astimezone(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)

        db_pedido = Pedido(**create_kwargs)
        db.add(db_pedido)
        db.flush()  # garante ID do pedido

        # Criar itens do pedido associando via relacionamento
        for item in pedido.itens:
            db_item = ItemPedido(
                pedido=db_pedido,
                nome_produto=item.nome_produto,
                quantidade=item.quantidade,
                preco_unitario=item.preco_unitario,
            )
            db.add(db_item)

        # Atualiza total (robustez se itens vierem com valores inconsistentes)
        db_pedido.valor_total = valor_total

        # Efetiva
        db.commit()
        db.refresh(db_pedido)

        # Carrega itens na resposta
        created = (
            db.query(Pedido)
            .options(selectinload(Pedido.itens))
            .filter(Pedido.id == db_pedido.id)
            .first()
        )
        if not created:
            log_event(
                "create",
                "pedido",
                None,
                user_email,
                before=None,
                after={"tenant_id": tenant_id, "nome_cliente": pedido.nome_cliente, "valor_total": valor_total},
                success=False,
                message="Pedido não encontrado após commit",
            )
            raise HTTPException(status_code=500, detail="Falha ao criar pedido")
        log_event(
            "create",
            "pedido",
            created.id,
            user_email,
            before=None,
            after={
                "tenant_id": tenant_id,
                "nome_cliente": created.nome_cliente,
                "valor_total": created.valor_total,
                "forma": getattr(created, "forma", None),
                "endereco": getattr(created, "endereco", None),
                "observacao": getattr(created, "observacao", None),
                "data_pedido": getattr(created, "data_pedido", None).isoformat() if getattr(created, "data_pedido", None) else None,
            },
            success=True,
        )
        return created
    except HTTPException:
        raise
    except Exception as e:
        log_event(
            "create",
            "pedido",
            None,
            user_email,
            before=None,
            after={"tenant_id": tenant_id, "nome_cliente": pedido.nome_cliente, "valor_total": valor_total},
            success=False,
            message=str(e),
        )
        try:
            # Log extra para diagnóstico
            debug_dir = os.path.join(os.path.dirname(__file__), "..", "logs")
            os.makedirs(debug_dir, exist_ok=True)
            with open(os.path.abspath(os.path.join(debug_dir, "pedidos_debug.log")), "a", encoding="utf-8") as f:
                f.write("\n== EXCEPTION create_pedido ==\n")
                f.write(f"tenant_id={tenant_id} user={user_email} payload_nome={pedido.nome_cliente}\n")
                f.write("".join(traceback.format_exc()))
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Erro ao criar pedido")

@router.get("/", response_model=List[PedidoResponse])
def list_pedidos(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração
    query = db.query(Pedido)
    
    # Filtrar por tenant se não for admin
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    
    # Filtrar por status se fornecido
    if status:
        query = query.filter(Pedido.status == status)
    
    pedidos = query.all()
    return pedidos

@router.get("/{pedido_id}", response_model=PedidoResponse)
def get_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    
    # Filtrar por tenant se não for admin
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    
    pedido = query.first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado"
        )
    
    return pedido

@router.put("/{pedido_id}", response_model=PedidoResponse)
def update_pedido(
    pedido_id: int,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    
    # VALIDAÇÃO DE STATUS: Impede alteração se o pedido já foi faturado
    if pedido.status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar um pedido que já foi faturado."
        )

    before_snapshot = {"nome_cliente": pedido.nome_cliente, "status": pedido.status, "valor_total": pedido.valor_total}
    update_data = pedido_update.dict(exclude_unset=True)
    try:
        # Aplicar alterações e efetivar
        for field, value in update_data.items():
            setattr(pedido, field, value)
        
        # Marcar como alterado, exceto se o único campo alterado for 'status'
        if len(update_data) > 1 or ('status' in update_data and len(update_data) == 1 and update_data['status'] == pedido.status):
            setattr(pedido, "foi_alterado", True) # <--- MARCA COMO ALTERADO
            
        db.commit()
        db.refresh(pedido)

        refreshed = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        if not refreshed:
            log_event("update", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after=update_data, success=False, message="Pedido desapareceu após update")
            raise HTTPException(status_code=500, detail="Falha ao atualizar pedido")
        log_event("update", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after={"nome_cliente": refreshed.nome_cliente, "status": refreshed.status, "valor_total": refreshed.valor_total}, success=True)
        return refreshed
    except HTTPException:
        raise
    except Exception as e:
        log_event("update", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after=update_data, success=False, message=str(e))
        raise HTTPException(status_code=500, detail="Erro ao atualizar pedido")

@router.delete("/{pedido_id}")
def delete_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_current_tenant)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    
    # VALIDAÇÃO DE STATUS: Impede exclusão se o pedido já foi faturado
    if pedido.status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir um pedido que já foi faturado."
        )

    before_snapshot = {"nome_cliente": pedido.nome_cliente, "status": pedido.status, "valor_total": pedido.valor_total}
    try:
        db.delete(pedido)
        db.commit()

        still = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        if still:
            log_event("delete", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after=None, success=False, message="Pedido ainda existe após delete")
            raise HTTPException(status_code=500, detail="Falha ao excluir pedido")
        log_event("delete", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after=None, success=True)
        return {"message": "Pedido excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        log_event("delete", "pedido", pedido_id, getattr(current_user, "email", None), before=before_snapshot, after=None, success=False, message=str(e))
        raise HTTPException(status_code=500, detail="Erro ao excluir pedido")

# ==============================================
# ✏️ Atualizar pedido via número de telefone (com atualização de itens e total)
# ==============================================
@router.put("/telefone/{telefone}", response_model=PedidoResponse)
def update_pedido_por_telefone(
    telefone: str,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    _ensure_foi_alterado_column(db) # Chamada de migração

    # 🔐 Obter tenant_id com base no tipo de token
    if token_info["type"] == "jwt":
        tenant_id = token_info["supermarket_id"]
        user_email = token_info["user"].email
    else:
        tenant_id = token_info["supermarket_id"]
        user_email = f"custom_token_{token_info['supermarket'].email}"

    # 🔍 Buscar o pedido PENDENTE mais recente pelo telefone
    query = db.query(Pedido).filter(
        Pedido.telefone == telefone,
        Pedido.status == "pendente"
    )
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)

    # Ordenar por data_pedido descendente para pegar o mais recente
    pedido = query.order_by(Pedido.data_pedido.desc()).first()
    
    if not pedido:
        # Retorna erro 404 se não for encontrado NENHUM pedido PENDENTE (ignora faturado)
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

        # Atualiza campos principais do pedido
        for field, value in update_data.items():
            if field != "itens":
                setattr(pedido, field, value)
        
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
        # Se houve alteração (mesmo que só de itens/total), marca como alterado
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
            "update",
            "pedido_por_telefone",
            pedido.id,
            user_email,
            before=before_snapshot,
            after=update_data,
            success=True,
        )

        return pedido

    except Exception as e:
        db.rollback()
        log_event(
            "update",
            "pedido_por_telefone",
            pedido.id,
            user_email,
            before=before_snapshot,
            after=update_data,
            success=False,
            message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pedido via telefone: {str(e)}")
