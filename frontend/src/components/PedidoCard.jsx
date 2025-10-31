import { Calendar, DollarSign, User, Package, Printer } from 'lucide-react'

const PedidoCard = ({ pedido, onStatusChange, onOpen }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30'
      case 'faturado':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30'
    }
  }

  const handleStatusToggle = () => {
    const newStatus = pedido.status === 'pendente' ? 'faturado' : 'pendente'
    onStatusChange(pedido.id, newStatus)
  }

  return (
    <div
      className="group bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 
                 hover:border-blue-500/40 hover:shadow-lg transition-all duration-300 rounded-xl p-4 cursor-pointer"
      onClick={() => onOpen(pedido)}
    >
      {/* Cabeçalho do Pedido */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            #{pedido.id}
          </span>
          <span className="text-gray-500 dark:text-dark-400 text-sm truncate">
            {pedido.nome_cliente || 'Cliente não informado'}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(
            pedido.status
          )}`}
        >
          {pedido.status === 'pendente' ? 'Pendente' : 'Faturado'}
        </span>
      </div>

      {/* Informações */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-300">
          <Calendar size={14} className="text-gray-400 dark:text-dark-400" />
          <span>{formatDate(pedido.data_pedido)}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-green-600 dark:text-green-400 font-semibold">
            {formatCurrency(pedido.valor_total)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleStatusToggle()
            }}
            className="px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/40 
                       text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 
                       transition-colors"
          >
            Alternar
          </button>
        </div>
      </div>
    </div>
  )
}

export default PedidoCard
