import { Calendar, DollarSign, User, Package, Phone, Printer } from 'lucide-react'

const PedidoCard = ({ pedido, onStatusChange, onMarkPending, onOpen, orderTotal, formatCurrency: formatCurrencyProp, compact = false }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-600'
      case 'faturado':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  const formatTelefone = (value) => {
    if (!value) return ''
    const digits = String(value).replace(/\D/g, '')
    if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
    if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
    return value
  }

  const handlePrimaryAction = () => {
    if (onStatusChange) {
      const newStatus = pedido.status === 'pendente' ? 'faturado' : 'pendente'
      return onStatusChange(pedido.id, newStatus)
    }
    if (onMarkPending) {
      return onMarkPending()
    }
  }

  const handlePrint = async () => {
    try {
      // Dados do supermercado a partir do usuário logado
      let storeName = 'Supermercado'
      try {
        const rawUser = localStorage.getItem('user')
        const user = rawUser ? JSON.parse(rawUser) : null
        if (user?.nome && typeof user.nome === 'string') {
          storeName = user.nome
        }
      } catch {}

      // Dados do pedido
      const nome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente'
      const telefone = formatTelefone(pedido?.telefone || pedido?.phone || '')
      const data = formatDate(pedido?.data_pedido || new Date())
      const itens = (Array.isArray(pedido?.itens) ? pedido.itens : (pedido?.items || []))
      const totalFormatado = (formatCurrencyProp || formatCurrency)(totalValue)
      const forma = pedido?.forma || pedido?.payment_method || '—'
      const endereco = pedido?.endereco || pedido?.address || ''
      const observacoes = pedido?.observacao || pedido?.observacoes || ''

      // Template de recibo térmico (80mm)
      const html = `<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Pedido #${pedido?.id}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { width: 80mm; margin: 0; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #000; }
            .receipt { padding: 8px 10px; }
            .center { text-align: center; }
            .title { font-size: 14px; font-weight: 700; }
            .sub { font-size: 11px; }
            .hr { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; font-size: 12px; }
            .section { margin: 6px 0; }
            .item { margin: 6px 0; font-size: 12px; }
            .item-name { word-break: break-word; }
            .item-calc { display: flex; justify-content: space-between; }
            .total { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; }
            .small { font-size: 11px; }
            .muted { color: #111; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="title">${storeName}</div>
              <div class="sub">Pedido #${pedido?.id}</div>
              <div class="sub muted">${data}</div>
            </div>
            <div class="hr"></div>

            <div class="section">
              <div class="small"><strong>Cliente:</strong> ${nome}</div>
              ${telefone ? `<div class="small"><strong>Tel:</strong> ${telefone}</div>` : ''}
              ${endereco ? `<div class="small"><strong>Endereço:</strong> ${endereco}</div>` : ''}
            </div>

            <div class="hr"></div>
            <div class="section">
              ${itens.map((item) => {
                const nomeItem = item?.nome_produto || item?.product_name || 'Item'
                const qtd = Number(item?.quantidade ?? item?.quantity) || 0
                const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0
                const subtotal = unit * qtd
                const unitFmt = (formatCurrencyProp || formatCurrency)(unit)
                const subtotalFmt = (formatCurrencyProp || formatCurrency)(subtotal)
                return `
                  <div class="item">
                    <div class="item-name">${nomeItem}</div>
                    <div class="item-calc"><span>${qtd} x ${unitFmt}</span><span>${subtotalFmt}</span></div>
                  </div>
                `
              }).join('')}
            </div>

            <div class="total"><span>Total</span><span>${totalFormatado}</span></div>

            <div class="section">
              <div class="small"><strong>Pagamento:</strong> ${forma}</div>
              ${observacoes ? `<div class="small"><strong>Obs:</strong> ${observacoes}</div>` : ''}
            </div>

            <div class="center small no-print" style="margin-top:6px;">Use Ctrl+P ou Cmd+P para imprimir</div>
          </div>
          <script>window.print()</script>
        </body>
      </html>`

      const w = window.open('', '_blank', 'width=800,height=600')
      if (!w) return
      w.document.open()
      w.document.write(html)
      w.document.close()
    } catch (err) {
      // Silenciosamente ignora erros de impressão
    }
  }

  const totalValue = (() => {
    if (typeof pedido?.valor_total === 'number') return pedido.valor_total
    if (typeof orderTotal === 'function') return orderTotal(pedido)
    return 0
  })()

  return (
    <div
      className={`card hover:bg-dark-700 transition-colors ${compact ? 'p-3' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
    >
      {/* Header */}
      <div className={`flex justify-between items-start ${compact ? 'mb-2' : 'mb-4'}` }>
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-white`}>
            Pedido #{pedido.id}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <User size={16} className="text-dark-400" />
            <span className={`${compact ? 'text-xs' : ''} text-dark-300`}>
              {pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || ''}
            </span>
          </div>
          {(pedido?.telefone || pedido?.phone) && (
            <div className="flex items-center space-x-2 mt-1">
              <Phone size={16} className="text-dark-400" />
              <span className={`text-dark-300 ${compact ? 'text-xs' : 'text-sm'}`}>{formatTelefone(pedido.telefone || pedido.phone)}</span>
            </div>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${getStatusColor(pedido.status)}`}>
          {pedido.status === 'pendente' ? 'Pendente' : 'Faturado'}
        </span>
      </div>

      {/* Valor */}
      <div className={`flex items-center space-x-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <DollarSign size={16} className="text-green-400" />
        <span className={`${compact ? 'text-base' : 'text-xl'} font-bold text-green-400`}>
          {(formatCurrencyProp || formatCurrency)(totalValue)}
        </span>
      </div>

      {/* Data */}
      <div className={`flex items-center space-x-2 ${compact ? 'mb-2' : 'mb-4'}`}>
        <Calendar size={16} className="text-dark-400" />
        <span className={`text-dark-300 ${compact ? 'text-xs' : 'text-sm'}`}>
          {formatDate(pedido.data_pedido)}
        </span>
      </div>

      {/* Itens - no modo compacto, apenas contagem; caso contrário, mostra resumo */}
      {pedido.itens && pedido.itens.length > 0 && (
        <div className={`${compact ? 'mb-2' : 'mb-4'}`}>
          <div className="flex items-center space-x-2">
            <Package size={16} className="text-dark-400" />
            <span className={`text-dark-300 ${compact ? 'text-xs' : 'text-sm'} font-medium`}>
              {pedido.itens.length} item(s)
            </span>
          </div>
          {!compact && (
            <div className="space-y-1 mt-2">
              {pedido.itens.slice(0, 3).map((item, index) => (
                <div key={index} className="text-xs text-dark-400 flex justify-between">
                  <span>{item.nome_produto} x{item.quantidade}</span>
                  <span>{formatCurrency(item.preco_unitario * item.quantidade)}</span>
                </div>
              ))}
              {pedido.itens.length > 3 && (
                <div className="text-xs text-dark-500">
                  +{pedido.itens.length - 3} item(s) a mais
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className={`flex ${compact ? 'flex-col space-y-2' : 'flex-col space-y-2'}`}>
        <button
          onClick={handlePrimaryAction}
          className={`flex-1 ${compact ? 'py-1 px-2 text-xs' : 'py-2 px-4 text-sm'} rounded-lg font-medium transition-colors ${
            pedido.status === 'pendente'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {pedido.status === 'pendente' ? 'Marcar como Faturado' : 'Marcar como Pendente'}
        </button>
        {pedido.status === 'pendente' && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrint() }}
            className={`flex-1 ${compact ? 'py-1 px-2 text-xs' : 'py-2 px-4 text-sm'} rounded-lg font-medium transition-colors bg-dark-700 hover:bg-dark-600 text-white flex items-center justify-center gap-2`}
          >
            <Printer size={16} />
            Imprimir Pedido
          </button>
        )}
      </div>
    </div>
  )
}

export default PedidoCard