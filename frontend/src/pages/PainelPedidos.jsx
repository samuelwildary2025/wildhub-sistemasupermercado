// ... (Código anterior inalterado)

  const handlePrint = (pedido) => {
    // Garantindo que o nome do cliente seja lido corretamente
    const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente Desconhecido';
    
    // Novas informações de cliente
    const clienteTelefone = pedido?.telefone || pedido?.phone || 'Não informado';
    const clienteEndereco = pedido?.endereco || pedido?.address || 'Não informado';
    const clienteFormaPagamento = pedido?.forma || pedido?.payment_method || 'Não informada';
    
    // Prepara a lista de itens
    const itens = (Array.isArray(pedido?.itens) ? pedido.itens : pedido?.items || [])
        .map(item => {
            const nome = item?.nome_produto || item?.product_name || 'Item';
            const qtd = Number(item?.quantidade ?? item?.quantity) || 0;
            const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0;
            const subtotal = qtd * unit;
            return `${nome} x${qtd} - R$ ${subtotal.toFixed(2)}`;
        }).join('\n');
        
    // Estrutura completa do comprovante
    const comprovante = `
SUPERMERCADO
-----------------------------
PEDIDO #${pedido.id}
DATA: ${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
-----------------------------
CLIENTE: ${clienteNome}
TELEFONE: ${clienteTelefone}
ENDEREÇO: ${clienteEndereco}
PAGAMENTO: ${clienteFormaPagamento}
-----------------------------
ITENS:
${itens}
-----------------------------
TOTAL: R$ ${orderTotal(pedido).toFixed(2)}
-----------------------------
Obrigado pela preferência!
`

    // Abre janela de impressão
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`<pre style='font-size:16px;'>${comprovante}</pre>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

// ... (Restante do código)
