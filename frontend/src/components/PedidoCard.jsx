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

  // CORRIGIDO: Cores dinâmicas para funcionar no modo claro
  return (
    <div 
      className="bg-white dark:bg-dark-800 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors rounded-lg p-3 border border-gray-200 dark:border-dark-700 cursor-pointer"
      onClick={() => onOpen(pedido)} // Adicionado o onOpen ao card inteiro
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Texto preto no modo claro / branco no dark */}
          <span className="text-gray-900 dark:text-white font-medium">#{pedido.id}</span>
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
          <span className="text-gray-600 dark:text-dark-300">{formatDate(pedido.data_pedido)}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Valor com cor verde no modo claro/escuro */}
          <span className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(pedido.valor_total)}</span>
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
