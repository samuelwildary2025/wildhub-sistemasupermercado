# ==============================================
# ✏️ Atualizar pedido via número de telefone
# ==============================================
@router.put("/telefone/{telefone}", response_model=PedidoResponse)
def update_pedido_por_telefone(
    telefone: str,
    pedido_update: PedidoUpdate,
    db: Session = Depends(get_db),
    token_info: dict = Depends(validate_custom_token_or_jwt)
):
    """
    Atualiza um pedido existente com base no número de telefone do cliente.
    Funciona tanto com JWT quanto com token customizado.
    """
    try:
        _ensure_numero_pedido_column(db)

        # 🔐 Obter tenant_id com base no tipo de token (igual à rota create)
        if token_info["type"] == "jwt":
            current_user = token_info["user"]
            tenant_id = token_info["supermarket_id"]
            user_email = current_user.email
        else:
            current_user = None
            tenant_id = token_info["supermarket_id"]
            user_email = f"custom_token_{token_info['supermarket'].email}"

        # 🔎 Buscar o pedido pelo telefone e tenant
        query = db.query(Pedido).filter(Pedido.telefone == telefone)
        if tenant_id is not None:
            query = query.filter(Pedido.tenant_id == tenant_id)

        pedido = query.first()
        if not pedido:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nenhum pedido encontrado para o telefone {telefone}"
            )

        before_snapshot = {
            "nome_cliente": pedido.nome_cliente,
            "status": pedido.status,
            "valor_total": pedido.valor_total,
        }

        update_data = pedido_update.dict(exclude_unset=True)

        # 🔄 Atualiza apenas os campos enviados
        for field, value in update_data.items():
            setattr(pedido, field, value)

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

    except HTTPException:
        raise
    except Exception as e:
        log_event(
            "update",
            "pedido_por_telefone",
            None,
            "sistema",
            before=None,
            after={"telefone": telefone},
            success=False,
            message=str(e),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao atualizar pedido via telefone: {str(e)}"
        )
