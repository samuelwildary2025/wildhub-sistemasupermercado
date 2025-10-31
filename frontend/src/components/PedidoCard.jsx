<div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 
                hover:bg-gray-50 dark:hover:bg-dark-700 
                transition-colors rounded-lg p-3 shadow-sm">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-gray-900 dark:text-white font-medium">#{pedido.id}</span>
      <span className="text-gray-500 dark:text-dark-300 text-sm">{pedido.nome_cliente}</span>
    </div>
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(pedido.status)}`}>
      {pedido.status === 'pendente' ? 'Pendente' : 'Faturado'}
    </span>
  </div>

  <div className="flex items-center justify-between mt-2">
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
      <Calendar size={14} />
      <span>{formatDate(pedido.data_pedido)}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-green-600 dark:text-green-400 font-semibold">
        {formatCurrency(pedido.valor_total)}
      </span>
      <button
        onClick={() => onOpen(pedido)}
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
      >
        Ver detalhes
      </button>
    </div>
  </div>
</div>
