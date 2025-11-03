import { Calendar, DollarSign, User, Package, Printer } from 'lucide-react'

const PedidoCard = ({ pedido, onStatusChange, onOpen }) => {
  // CORRIGIDO: Adicionado timeZone: 'America/Fortaleza'
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza' // Força o fuso horário local
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

  const handleStatusToggle = () => {
    const newStatus = pedido.status === 'pendente' ? 'faturado' : 'pendente'
    // Garantindo que onStatusChange seja chamado com os parâmetros corretos
    if (onStatusChange) {
      onStatusChange(pedido.id, newStatus)
    }
  }

  // Realça pedidos alterados via PUT
  const hasUpdates = Boolean(pedido.foi_alterado) // <--- LENDO O CAMPO 'foi_alterado'

  // Adicionado 'relative' para posicionar o indicador ABSOLUTE
  const cardBaseClasses = 'transition-colors rounded-lg p-3 border cursor-pointer relative' 
  // Classes visuais de alerta
  const normalClasses = 'bg-white dark:bg-dark-800 hover:bg-gray-100 dark:hover:bg-dark-700 border-gray-200 dark:border-dark-700'
  const alteredClasses = 'bg-red-50 border-red-400 hover:bg-red-100 dark:bg-red-900/40 dark:border-red-500 dark:hover:bg-red-900/60 shake-alert'

  const cardClasses = `${cardBaseClasses} ${hasUpdates ? alteredClasses : normalClasses}`

  const numeroVisivel = pedido?.numero_pedido ?? pedido.id

  return (
    <div 
      className={cardClasses}
      onClick={() => onOpen(pedido)} 
    >
      {/* NOVO INDICADOR VISUAL */}
      {hasUpdates && (
        // Adiciona um chip de alerta piscante no canto superior direito
        <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white dark:bg-red-700 dark:text-red-100 animate-pulse">
            ALTERADO!
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Texto preto no modo claro / branco no dark */}
          <span className="text-gray-900 dark:text-white font-medium">#{numeroVisivel}</span>
          <span className="text-gray-600 dark:text-dark-300 text-sm">{pedido.nome_cliente}</span>
        </div>
        {/* Status Tag */}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(pedido.status)}`}>
          {pedido.status === 'pendente' ? 'Pendente' : 'Faturado'}
        </span>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-gray-500 dark:text-dark-400" />
          {/* Cor do texto da data também muda para ALERT se o pedido foi alterado */}
          <span className={`text-gray-600 dark:text-dark-300 ${hasUpdates ? 'font-medium text-red-700 dark:text-red-200' : ''}`}>
            {formatDate(pedido.data_pedido)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Valor com cor verde no modo claro/escuro */}
          <span className={`${hasUpdates ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-400'} font-semibold`}>
            {formatCurrency(pedido.valor_total)}
          </span>
          {/* Botão de detalhes (se não houver um botão de ação de status aqui) */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(pedido) }}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded text-sm"
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </div>
  )
}

export default PedidoCard
