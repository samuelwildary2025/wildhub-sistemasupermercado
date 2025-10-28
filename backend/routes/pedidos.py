from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
import traceback
import os
from typing import List, Optional
from database import get_db
from models.pedido import Pedido, ItemPedido
from models.cliente import Cliente
from models.user import User
from schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from auth.middleware import get_current_user, get_current_tenant
from utils.crud_logger import log_event
from datetime import datetime

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])

@router.post("/", response_model=PedidoResponse)
def create_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant)
):
    # Validar tenant e calcular valor total
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
        # Upsert de Cliente por telefone (quando informado)
        cliente_obj = None
        telefone_payload = getattr(pedido, "telefone", None)
        if telefone_payload:
            try:
                # Normaliza telefone para gerar email placeholder estável
                digits = "".join(ch for ch in str(telefone_payload) if ch.isdigit()) or "semnumero"
                placeholder_email = f"{digits}.{tenant_id}@noemail.local"

                # Busca cliente existente por telefone dentro do tenant
                cliente_obj = (
                    db.query(Cliente)
                    .filter(Cliente.telefone == telefone_payload, Cliente.tenant_id == tenant_id)
                    .first()
                )
                if not cliente_obj:
                    cliente_obj = Cliente(
                        nome=pedido.nome_cliente,
                        email=placeholder_email,
                        telefone=telefone_payload,
                        tenant_id=tenant_id,
                        ativo=True,
                    )
                    db.add(cliente_obj)
                    db.flush()  # garantir ID para vincular ao pedido
                else:
                    # Atualiza nome quando vier diferente (mantém dados mais recentes)
                    try:
                        if pedido.nome_cliente and cliente_obj.nome != pedido.nome_cliente:
                            cliente_obj.nome = pedido.nome_cliente
                            db.add(cliente_obj)
                    except Exception:
                        pass
            except Exception:
                # Não falha criação do pedido por erro ao criar/atualizar cliente
                cliente_obj = None

        # Criar pedido
        create_kwargs = {
            "tenant_id": tenant_id,
            "nome_cliente": pedido.nome_cliente,
            "valor_total": valor_total,
        }
        if cliente_obj is not None:
            create_kwargs["cliente_id"] = cliente_obj.id
        # Campos opcionais quando presentes
        if getattr(pedido, "telefone", None) is not None:
            create_kwargs["telefone"] = pedido.telefone
        if getattr(pedido, "forma", None) is not None:
            create_kwargs["forma"] = pedido.forma
        if getattr(pedido, "endereco", None) is not None:
            create_kwargs["endereco"] = pedido.endereco
        if getattr(pedido, "observacao", None) is not None:
            create_kwargs["observacao"] = pedido.observacao
        if getattr(pedido, "created_at", None) is not None:
            # Mapeia created_at -> data_pedido
            create_kwargs["data_pedido"] = pedido.created_at

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
                getattr(current_user, "email", None),
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
            getattr(current_user, "email", None),
            before=None,
            after={
                "tenant_id": tenant_id,
                "nome_cliente": created.nome_cliente,
                "telefone": getattr(created, "telefone", None),
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
            getattr(current_user, "email", None),
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
                f.write(f"tenant_id={tenant_id} user={getattr(current_user, 'email', None)} payload_nome={pedido.nome_cliente}\n")
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
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    before_snapshot = {"nome_cliente": pedido.nome_cliente, "status": pedido.status, "valor_total": pedido.valor_total}
    update_data = pedido_update.dict(exclude_unset=True)
    try:
        # Aplicar alterações e efetivar
        for field, value in update_data.items():
            setattr(pedido, field, value)
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
    query = db.query(Pedido).filter(Pedido.id == pedido_id)
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)
    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
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