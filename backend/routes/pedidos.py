from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text  # Adicionado import para a função _ensure_numero_pedido_column
from typing import List, Optional
from datetime import datetime
import json
import httpx
import logging

from ..database import get_db, Base, engine
from ..models.pedido import Pedido, ItemPedido
from ..models.supermarket import Supermarket
from ..schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from ..auth.jwt_handler import validate_custom_token_or_jwt
from ..utils.crud_logger import log_crud_event

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/api/pedidos",
    tags=["Pedidos"],
)

def _ensure_numero_pedido_column(db: Session):
    """
    Verifica se a coluna numero_pedido existe na tabela pedidos. 
    Se não existir, ela é criada.
    Esta é uma medida de contingência para projetos antigos que não têm esta coluna.
    """
    from sqlalchemy import inspect, Column, Integer
    inspector = inspect(engine)
    if 'pedidos' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('pedidos')]
        if 'numero_pedido' not in columns:
            try:
                with engine.begin() as connection:
                    connection.execute(
                        text("ALTER TABLE pedidos ADD COLUMN numero_pedido INTEGER")
                    )
                    connection.execute(
                        text("UPDATE pedidos SET numero_pedido = id WHERE numero_pedido IS NULL")
                    )
                logger.info("Coluna 'numero_pedido' criada e populada com 'id' em 'pedidos'.")
            except Exception as e:
                logger.error(f"Erro ao adicionar ou popular 'numero_pedido': {e}")
    # Cria a tabela se não existir (para o caso de ser um banco novo)
    try:
        if not inspector.has_table(Pedido.__tablename__):
            Base.metadata.create_all(bind=engine)
            logger.info(f"Tabela {Pedido.__tablename__} criada, pois não existia.")
    except Exception as e:
        logger.error(f"Erro ao garantir a existência da tabela Pedido: {e}")


# Endpoint para criar um novo pedido (POST)
@router.post("/", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
def create_pedido(
    pedido: PedidoCreate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)

    # 🔐 Obter tenant_id com base no tipo de token
    if token_info['type'] == 'jwt':
        tenant_id = token_info['tenant_id']
    elif token_info['type'] == 'custom_token':
        tenant_id = token_info['supermarket'].id
    else:
        # Se for um token de cliente, o tenant_id não está no token, buscar por telefone ou user_id se necessário
        # Assumindo que o token_info seja sempre de um Supermercado ou Admin, para POST de pedido o tenant_id é essencial
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para criar pedido."
        )

    # 1. Obter o próximo numero_pedido
    last_pedido = db.query(Pedido).filter(Pedido.tenant_id == tenant_id).order_by(Pedido.numero_pedido.desc()).first()
    if last_pedido and last_pedido.numero_pedido is not None:
        next_numero_pedido = last_pedido.numero_pedido + 1
    else:
        # Se for o primeiro pedido ou a coluna for nova
        next_numero_pedido = 1
    
    # 2. Calcular o valor total e formatar data
    valor_total = sum(item.quantidade * item.preco_unitario for item in pedido.itens)
    data_pedido = pedido.created_at if pedido.created_at else datetime.now()

    # 3. Criar o objeto Pedido
    db_pedido = Pedido(
        tenant_id=tenant_id,
        numero_pedido=next_numero_pedido,
        nome_cliente=pedido.nome_cliente,
        valor_total=valor_total,
        status="pendente",  # Pedidos sempre iniciam como pendente
        data_pedido=data_pedido,
        forma=pedido.forma,
        endereco=pedido.endereco,
        observacao=pedido.observacao,
        telefone=pedido.telefone
    )

    # 4. Criar os Itens do Pedido
    for item_data in pedido.itens:
        db_item = ItemPedido(
            nome_produto=item_data.nome_produto,
            quantidade=item_data.quantidade,
            preco_unitario=item_data.preco_unitario,
        )
        db_pedido.itens.append(db_item)

    # 5. Salvar no banco
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)

    log_crud_event(
        db=db,
        table_name="pedidos",
        operation_type="create",
        record_id=db_pedido.id,
        tenant_id=tenant_id,
        before_data={},
        after_data=json.loads(db_pedido.to_dict_safe())
    )

    return db_pedido

# Endpoint para listar todos os pedidos (GET)
@router.get("/", response_model=List[PedidoResponse])
def read_pedidos(
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    
    # 🔐 Obter tenant_id para filtragem
    if token_info['type'] == 'admin':
        # Admin vê todos os pedidos (sem filtro de tenant_id)
        pedidos = db.query(Pedido).order_by(Pedido.data_pedido.desc()).all()
    elif token_info['type'] == 'jwt':
        tenant_id = token_info['tenant_id']
        pedidos = db.query(Pedido).filter(Pedido.tenant_id == tenant_id).order_by(Pedido.data_pedido.desc()).all()
    elif token_info['type'] == 'custom_token':
        tenant_id = token_info['supermarket'].id
        pedidos = db.query(Pedido).filter(Pedido.tenant_id == tenant_id).order_by(Pedido.data_pedido.desc()).all()
    else:
        # Outros tipos de token ou token sem tenant_id
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para listar pedidos."
        )

    return pedidos

# Endpoint para buscar pedidos por status (GET)
@router.get("/status/{status_filter}", response_model=List[PedidoResponse])
def read_pedidos_by_status(
    status_filter: str,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    
    # 🔐 Obter tenant_id para filtragem
    if token_info['type'] == 'admin':
        # Admin vê todos os pedidos por status
        query = db.query(Pedido).filter(Pedido.status == status_filter)
    elif token_info['type'] in ('jwt', 'custom_token'):
        tenant_id = token_info.get('tenant_id') or token_info.get('supermarket', {}).get('id')
        if tenant_id is None:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant ID não encontrado no token.")
        
        query = db.query(Pedido).filter(Pedido.tenant_id == tenant_id, Pedido.status == status_filter)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token inválido ou sem permissão para listar pedidos.")

    pedidos = query.order_by(Pedido.data_pedido.desc()).all()
    return pedidos

# Endpoint para buscar um único pedido por ID (GET)
@router.get("/{pedido_id}", response_model=PedidoResponse)
def read_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)

    # 🔐 Obter tenant_id para filtragem de posse
    if token_info['type'] == 'admin':
        # Admin pode buscar qualquer pedido
        pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    elif token_info['type'] in ('jwt', 'custom_token'):
        tenant_id = token_info.get('tenant_id') or token_info.get('supermarket', {}).get('id')
        if tenant_id is None:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant ID não encontrado no token.")
        
        # Supermercado só pode buscar seus próprios pedidos
        pedido = db.query(Pedido).filter(
            Pedido.id == pedido_id,
            Pedido.tenant_id == tenant_id
        ).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para visualizar este pedido."
        )

    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    return pedido

# Endpoint para buscar pedidos por número de telefone (GET)
@router.get("/telefone/{telefone}", response_model=List[PedidoResponse])
def read_pedidos_by_telefone(
    telefone: str,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    
    # 🔐 Obter tenant_id para filtragem
    if token_info['type'] == 'admin':
        query = db.query(Pedido).filter(Pedido.telefone == telefone)
    elif token_info['type'] in ('jwt', 'custom_token'):
        tenant_id = token_info.get('tenant_id') or token_info.get('supermarket', {}).get('id')
        if tenant_id is None:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant ID não encontrado no token.")
        
        query = db.query(Pedido).filter(Pedido.tenant_id == tenant_id, Pedido.telefone == telefone)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token inválido ou sem permissão para listar pedidos.")

    pedidos = query.order_by(Pedido.data_pedido.desc()).all()
    if not pedidos:
        raise HTTPException(status_code=404, detail="Nenhum pedido encontrado para este telefone")
        
    return pedidos


# Endpoint para atualizar um pedido por ID (PUT)
@router.put("/{pedido_id}", response_model=PedidoResponse)
def update_pedido(
    pedido_id: int,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)

    # 🔐 Obter tenant_id para filtragem de posse
    if token_info['type'] == 'admin':
        # Admin pode buscar qualquer pedido
        query = db.query(Pedido).filter(Pedido.id == pedido_id)
        tenant_id = None # Admin não precisa de tenant_id para log
    elif token_info['type'] in ('jwt', 'custom_token'):
        tenant_id = token_info.get('tenant_id') or token_info.get('supermarket', {}).get('id')
        if tenant_id is None:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant ID não encontrado no token.")
        
        # Supermercado só pode atualizar seus próprios pedidos
        query = db.query(Pedido).filter(
            Pedido.id == pedido_id,
            Pedido.tenant_id == tenant_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para atualizar este pedido."
        )

    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    before_snapshot = {
        "nome_cliente": pedido.nome_cliente,
        "status": pedido.status,
        "valor_total": pedido.valor_total,
    }
    
    # VALIDAÇÃO DE STATUS: Impede alteração se o pedido já foi faturado
    if pedido.status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar um pedido que já foi faturado."
        )

    update_data = pedido_update.dict(exclude_unset=True)

    # Lógica de atualização de itens (substituição completa)
    if "itens" in update_data and pedido_update.itens:
        # 1. Excluir itens existentes
        db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido.id).delete()
        
        # 2. Recriar itens e recalcular total
        new_total = 0.0
        for item_data in pedido_update.itens:
            db_item = ItemPedido(
                pedido_id=pedido.id,
                nome_produto=item_data.nome_produto,
                quantidade=item_data.quantidade,
                preco_unitario=item_data.preco_unitario,
            )
            db.add(db_item)
            new_total += item_data.quantidade * item_data.preco_unitario
        
        # Atualizar valor_total do pedido
        pedido.valor_total = new_total
        update_data["valor_total"] = new_total # Garantir que o log use o novo total
        
        # Remover 'itens' do update_data para não tentar fazer pedido.itens = [List]
        del update_data["itens"]

    # Aplicar outros campos do Pedido
    for key, value in update_data.items():
        if key != "valor_total" and hasattr(pedido, key):
             setattr(pedido, key, value)


    # Lógica de atualização de status (se for o caso)
    if 'status' in update_data and update_data['status'] == 'faturado':
        # Lógica de notificação ou finalização
        pass # Por enquanto, apenas atualiza

    db.commit()
    db.refresh(pedido)
    
    # Determinar tenant_id para log (se não for admin)
    if tenant_id is None and pedido.tenant_id:
        tenant_id = pedido.tenant_id

    log_crud_event(
        db=db,
        table_name="pedidos",
        operation_type="update",
        record_id=pedido.id,
        tenant_id=tenant_id,
        before_data=before_snapshot,
        after_data=json.loads(pedido.to_dict_safe())
    )

    return pedido


# Endpoint para atualizar um pedido por telefone (PUT)
@router.put("/telefone/{telefone}", response_model=PedidoResponse)
def update_pedido_por_telefone(
    telefone: str,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)

    # 🔐 Obter tenant_id com base no tipo de token
    if token_info['type'] == 'jwt':
        tenant_id = token_info['tenant_id']
    elif token_info['type'] == 'custom_token':
        tenant_id = token_info['supermarket'].id
    elif token_info['type'] == 'admin':
        tenant_id = None # Admin pode alterar pedidos de qualquer tenant
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para atualizar pedido."
        )

    # 🔍 Buscar o pedido pelo telefone
    query = db.query(Pedido).filter(Pedido.telefone == telefone)
    if tenant_id is not None:
        query = query.filter(Pedido.tenant_id == tenant_id)

    pedido = query.first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado para esse telefone")

    # >>> ADICIONANDO A VALIDAÇÃO DO STATUS AQUI <<<
    if pedido.status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar um pedido que já foi faturado."
        )
    # >>> FIM DA VALIDAÇÃO <<<

    before_snapshot = {
        "nome_cliente": pedido.nome_cliente,
        "status": pedido.status,
        "valor_total": pedido.valor_total,
        "forma": pedido.forma,
        "endereco": pedido.endereco,
        "observacao": pedido.observacao,
        "telefone": pedido.telefone
    }

    update_data = pedido_update.dict(exclude_unset=True)

    # Lógica de atualização de itens (substituição completa)
    if "itens" in update_data and pedido_update.itens:
        # 1. Excluir itens existentes
        db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido.id).delete()
        
        # 2. Recriar itens e recalcular total
        new_total = 0.0
        for item_data in pedido_update.itens:
            db_item = ItemPedido(
                pedido_id=pedido.id,
                nome_produto=item_data.nome_produto,
                quantidade=item_data.quantidade,
                preco_unitario=item_data.preco_unitario,
            )
            db.add(db_item)
            new_total += item_data.quantidade * item_data.preco_unitario
        
        # Atualizar valor_total do pedido
        pedido.valor_total = new_total
        update_data["valor_total"] = new_total # Garantir que o log use o novo total
        
        # Remover 'itens' do update_data para não tentar fazer pedido.itens = [List]
        del update_data["itens"]

    # Aplicar outros campos do Pedido
    for key, value in update_data.items():
        if key != "valor_total" and hasattr(pedido, key):
             setattr(pedido, key, value)
    
    db.commit()
    db.refresh(pedido)
    
    # Determinar tenant_id para log (se não for admin)
    if tenant_id is None and pedido.tenant_id:
        tenant_id = pedido.tenant_id

    log_crud_event(
        db=db,
        table_name="pedidos",
        operation_type="update",
        record_id=pedido.id,
        tenant_id=tenant_id,
        before_data=before_snapshot,
        after_data=json.loads(pedido.to_dict_safe())
    )

    return pedido


# Endpoint para deletar um pedido por ID (DELETE)
@router.delete("/{pedido_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    _ensure_numero_pedido_column(db)
    
    # 🔐 Obter tenant_id para filtragem de posse
    if token_info['type'] == 'admin':
        # Admin pode deletar qualquer pedido
        query = db.query(Pedido).filter(Pedido.id == pedido_id)
        tenant_id = None # Admin não precisa de tenant_id para log
    elif token_info['type'] in ('jwt', 'custom_token'):
        tenant_id = token_info.get('tenant_id') or token_info.get('supermarket', {}).get('id')
        if tenant_id is None:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant ID não encontrado no token.")
        
        # Supermercado só pode deletar seus próprios pedidos
        query = db.query(Pedido).filter(
            Pedido.id == pedido_id,
            Pedido.tenant_id == tenant_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token inválido ou sem permissão para deletar este pedido."
        )

    pedido_to_delete = query.first()

    if not pedido_to_delete:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
    # VALIDAÇÃO DE STATUS: Impede exclusão se o pedido já foi faturado
    if pedido_to_delete.status == "faturado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir um pedido que já foi faturado."
        )

    # Snapshot antes da exclusão
    before_snapshot = json.loads(pedido_to_delete.to_dict_safe())

    # Excluir itens relacionados e o pedido
    db.query(ItemPedido).filter(ItemPedido.pedido_id == pedido_to_delete.id).delete(synchronize_session=False)
    query.delete(synchronize_session=False)

    db.commit()
    
    # Determinar tenant_id para log (se não for admin)
    if tenant_id is None and pedido_to_delete.tenant_id:
        tenant_id = pedido_to_delete.tenant_id

    log_crud_event(
        db=db,
        table_name="pedidos",
        operation_type="delete",
        record_id=pedido_to_delete.id,
        tenant_id=tenant_id,
        before_data=before_snapshot,
        after_data={}
    )
    
    return
