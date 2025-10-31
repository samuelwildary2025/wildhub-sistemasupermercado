import { Calendar, DollarSign, User, Package, Printer } from 'lucide-react'

const PedidoCard = ({ pedido, onStatusChange, onOpen }) => {
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

  const handleStatusToggle = () => {
    const newStatus = pedido.status === 'pendente' ? 'faturado' : 'pendente'
    onStatusChange(pedido.id, newStatus)
  }

  // Layout compacto para pedidos concluídos
  return (
    <div className="bg-dark-800 hover:bg-dark-700 transition-colors rounded-lg p-2 border border-dark-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">#{pedido.id}</span>
          <span className="text-dark-300 text-sm">{pedido.nome_cliente}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(pedido.status)}`}>
          {pedido.status === 'pendente' ? 'Pendente' : 'Faturado'}
        </span>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-dark-400" />
          <span className="text-dark-300">{formatDate(pedido.data_pedido)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-semibold">{formatCurrency(pedido.valor_total)}</span>
          <button
            onClick={() => onOpen(pedido)}
            className="text-dark-300 hover:text-white px-2 py-1 rounded text-sm"
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </div>
  )
}

export default PedidoCard
