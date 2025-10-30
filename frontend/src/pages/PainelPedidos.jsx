import { useState, useEffect } from 'react'
import { getPedidos, updatePedido } from '../services/api'
import Header from '../components/Header'
import PedidoCard from '../components/PedidoCard'
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign, X, Phone, MapPin, CreditCard, MessageSquare, Calendar, Check, Printer } from 'lucide-react'

const PainelPedidos = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    faturados: 0,
    valorTotal: 0
  })
  const [selectedPedido, setSelectedPedido] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])

  // obtém supermarketId do usuário logado (se houver)
  const getSupermarketId = () => {
    try {
      const raw = localStorage.getItem('user')
      const user = raw ? JSON.parse(raw) : null
      return user?.supermarket_id || null
    } catch (e) {
      return null
    }
  }

  useEffect(() => {
    loadPedidos()
  }, [])

  // Atualização automática (polling) para refletir novos pedidos sem recarregar
  const refreshPedidos = async () => {
    try {
      const supermarketId = getSupermarketId()
      const response = await getPedidos(null, supermarketId)
      setPedidos(response.data)
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPedidos()
    }, 4000) // atualiza a cada 4s
    return () => clearInterval(interval)
  }, [])

  // Sincroniza o pedido selecionado quando a lista é atualizada
  useEffect(() => {
    if (selectedPedido) {
      const atual = pedidos.find(p => p.id === selectedPedido.id)
      if (atual) setSelectedPedido(atual)
    }
  }, [pedidos])

  useEffect(() => {
    calculateStats()
  }, [pedidos])

  const loadPedidos = async () => {
    try {
      const supermarketId = getSupermarketId()
      const response = await getPedidos(null, supermarketId)
      setPedidos(response.data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper para calcular total do pedido de forma robusta
  const orderTotal = (pedido) => {
    const itens = Array.isArray(pedido?.itens) ? pedido.itens : (Array.isArray(pedido?.items) ? pedido.items : [])
    return itens.reduce((sum, item) => {
      const rawPreco = (item?.preco_unitario ?? item?.unit_price ?? 0)
      const rawQtd = (item?.quantidade ?? item?.quantity ?? 0)
      const preco = typeof rawPreco === 'string' ? parseFloat(rawPreco.replace(',', '.')) : Number(rawPreco) || 0
      const qtd = typeof rawQtd === 'string' ? parseFloat(String(rawQtd).replace(',', '.')) : Number(rawQtd) || 0
      return sum + preco * qtd
    }, 0)
  }

  const calculateStats = () => {
    const total = pedidos.length
    const pendentes = pedidos.filter(p => p.status === 'pendente').length
    const faturados = pedidos.filter(p => p.status === 'faturado').length
    const valorTotal = pedidos.filter(p => p.status === 'faturado').reduce((sum, p) => sum + orderTotal(p), 0)

    setStats({ total, pendentes, faturados, valorTotal })
  }

  const handleStatusChange = async (pedidoId, newStatus) => {
    const current = pedidos.find(p => p.id === pedidoId)

    // Monta payload completo para o backend simples (evita perda de campos)
    const itensOrig = Array.isArray(current?.itens) ? current.itens : (Array.isArray(current?.items) ? current.items : [])
    const itensNorm = itensOrig.map((it) => ({
      id: it?.id,
      product_name: it?.nome_produto ?? it?.product_name ?? 'Item',
      quantity: it?.quantidade ?? it?.quantity ?? 0,
      unit_price: it?.preco_unitario ?? it?.unit_price ?? 0
    }))
    const totalNorm = itensNorm.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0)

    const payload = {
      client_name: current?.cliente_nome ?? current?.nome_cliente ?? current?.client_name ?? 'Cliente',
      total: totalNorm || current?.total || 0,
      status: newStatus ?? current?.status,
      created_at: current?.data_pedido ?? current?.created_at,
      items: itensNorm,
      phone: current?.telefone ?? current?.phone ?? null,
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.metodo_pagamento ?? current?.payment_method ?? null,
      observacoes: current?.observacoes ?? current?.observations ?? null,
      // garante que o update preserve o vínculo ao supermercado
      supermarket_id: current?.supermarket_id ?? getSupermarketId() ?? 1
    }

    try {
      await updatePedido(pedidoId, payload)
      setPedidos(pedidos.map(p => 
        p.id === pedidoId ? { ...p, status: newStatus } : p
      ))
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      // Mesmo em erro, atualiza localmente para feedback imediato
      setPedidos(pedidos.map(p => 
        p.id === pedidoId ? { ...p, status: newStatus } : p
      ))
    }
  }

  const openDetails = (pedido) => {
    setSelectedPedido(pedido)
    setShowDetails(true)
    setChatMessages([])
    setChatInput('')
  }
  const closeDetails = () => {
    setShowDetails(false)
    setSelectedPedido(null)
    setChatMessages([])
    setChatInput('')
  }

  const filteredPedidos = pedidos.filter(pedido => {
    if (filter === 'todos') return true
    return pedido.status === filter
  })

  const formatCurrency = (value) => {
    const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    setChatMessages((prev) => [...prev, { id: Date.now(), text: chatInput.trim() }])
    setChatInput('')
  }

  const handlePrint = (pedido) => {
    // Gera comprovante em formato texto para impressora térmica
    const itens = (pedido.itens || []).map(item => `${item.nome_produto} x${item.quantidade} - R$ ${(item.preco_unitario * item.quantidade).toFixed(2)}`).join('\n');
    const comprovante = `
SUPERMERCADO
Pedido #${pedido.id}
Cliente: ${pedido.cliente_nome}
Data: ${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString('pt-BR') : '-'}
-----------------------------
${itens}
-----------------------------
TOTAL: R$ ${orderTotal(pedido).toFixed(2)}
-----------------------------
Obrigado pela preferência!`

    // Abre janela de impressão
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`<pre style='font-size:16px;'>${comprovante}</pre>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  // Listas separadas
  const pendentesPedidos = pedidos.filter(p => p.status === 'pendente')
  const concluidosPedidos = pedidos.filter(p => p.status === 'faturado')

  return (
    <div className="min-h-screen bg-dark-900">
      <Header 
        title="Painel de Pedidos" 
        subtitle="Gerencie todos os pedidos do seu supermercado"
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Total de Pedidos</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <TrendingUp className="text-blue-400" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendentes}</p>
              </div>
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Faturados</p>
                <p className="text-2xl font-bold text-green-400">{stats.faturados}</p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">Valor Faturado</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end mb-6">
          <button className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Novo Pedido</span>
          </button>
        </div>

        {/* Duas Colunas: Em andamento x Concluídos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Em Andamento */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Pedidos em Andamento</h3>
              <span className="text-sm text-yellow-400">{pendentesPedidos.length}</span>
            </div>
            {pendentesPedidos.length === 0 ? (
              <p className="text-dark-400">Nenhum pedido pendente.</p>
            ) : (
            <div className="space-y-3">
               {pendentesPedidos.map((pedido) => {
                 const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente'
                 const data = pedido?.data_pedido || pedido?.created_at
                 return (
                   <div
                     key={pedido.id}
                     className={`w-full flex items-center justify-between py-3 px-3 rounded-lg bg-dark-800 hover:bg-dark-700 border shadow-sm cursor-pointer ${selectedPedido?.id === pedido.id ? 'ring-2 ring-yellow-400 border-yellow-600' : 'ring-1 ring-yellow-700/30 border-yellow-700'}`}
                   >
                     <div onClick={() => openDetails(pedido)} className="flex-1 cursor-pointer">
                       <p className="text-white font-medium">{clienteNome}</p>
                       <p className="text-dark-400 text-sm">{data ? new Date(data).toLocaleString('pt-BR') : '-'}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="text-yellow-400 font-semibold">{formatCurrency(orderTotal(pedido))}</span>
                       <button
                         onClick={(e) => { e.stopPropagation(); handleStatusChange(pedido.id, 'faturado') }}
                         className="btn-secondary px-3 py-1 text-sm"
                       >
                         Enviar para Faturamento
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); handlePrint(pedido) }}
                         className="btn-secondary px-3 py-1 text-sm flex items-center gap-1"
                       >
                         <Printer size={16} /> Imprimir
                       </button>
                     </div>
                   </div>
                 )
               })}
            </div>
            )}
          </div>

          {/* Concluídos */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Pedidos Concluídos</h3>
              <span className="text-sm text-green-400">{concluidosPedidos.length}</span>
            </div>
            {concluidosPedidos.length === 0 ? (
              <p className="text-dark-400">Nenhum pedido concluído.</p>
            ) : (
              <div className="space-y-3">
                {concluidosPedidos.map((pedido) => (
                  <PedidoCard 
                    key={pedido.id}
                    pedido={pedido}
                    onMarkPending={() => handleStatusChange(pedido.id, 'pendente')}
                    onOpen={() => openDetails(pedido)}
                    orderTotal={orderTotal}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Pedido */}
        {showDetails && selectedPedido && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
            <div className="bg-dark-800 w-full max-w-4xl rounded-lg shadow-lg border border-dark-700 overflow-hidden">
              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <h3 className="text-white font-semibold text-lg">
                  {`Pedido de ${selectedPedido?.cliente_nome || selectedPedido?.nome_cliente || selectedPedido?.client_name || 'Cliente'}`}
                </h3>
                <button className="text-dark-400 hover:text-white" onClick={closeDetails}>
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Coluna Esquerda */}
                <div className="space-y-4 lg:col-span-2">
                  {/* Informações do Cliente */}
                  <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-dark-400" />
                      Informações do Cliente
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 text-dark-200">
                        <Phone size={16} className="mt-0.5 text-dark-400" />
                        <span>{selectedPedido?.telefone || selectedPedido?.phone || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-dark-200">
                        <MapPin size={16} className="mt-0.5 text-dark-400" />
                        <span>{selectedPedido?.endereco || selectedPedido?.address || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-dark-200">
                        <CreditCard size={16} className="mt-0.5 text-dark-400" />
                        <span>{selectedPedido?.forma || selectedPedido?.payment_method || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                    <h4 className="text-white font-medium mb-3">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {(Array.isArray(selectedPedido?.itens) ? selectedPedido?.itens : selectedPedido?.items || []).map((item, idx) => {
                        const nome = item?.nome_produto || item?.product_name || 'Item'
                        const qtd = Number(item?.quantidade ?? item?.quantity) || 0
                        const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0
                        const subtotal = qtd * unit
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-dark-800 rounded border border-dark-700">
                            <div>
                              <p className="text-white">{nome}</p>
                              <p className="text-dark-400 text-xs">{`${qtd}x ${formatCurrency(unit)}`}</p>
                            </div>
                            <div className="text-white">{formatCurrency(subtotal)}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-white/80 font-medium">Total</span>
                      <span className="text-green-400 font-extrabold text-lg">{formatCurrency(orderTotal(selectedPedido))}</span>
                    </div>
                  </div>

                  {/* Observações */}
                  {(selectedPedido?.observacao || selectedPedido?.observacoes) && (
                    <div className="rounded-lg p-4 border bg-amber-800/30 border-amber-700/40">
                      <h4 className="text-white font-medium mb-2">Observações</h4>
                      <p className="text-amber-100 text-sm">{selectedPedido?.observacao || selectedPedido?.observacoes}</p>
                    </div>
                  )}

                  {/* Ação */}
                  {selectedPedido?.status !== 'faturado' && (
                    <button
                      onClick={() => handleStatusChange(selectedPedido.id, 'faturado')}
                      className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                    >
                      <CheckCircle size={18} />
                      Enviar para Faturamento
                    </button>
                  )}
                </div>

                {/* Coluna Direita - Chat */}
                <div className="bg-dark-900 rounded-lg p-4 border border-dark-700 flex flex-col">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <MessageSquare size={18} className="text-dark-400" />
                    Chat com Cliente
                  </h4>
                  <div className="flex-1 rounded bg-dark-800 border border-dark-700 p-3 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center gap-2 text-dark-300 text-sm">
                        <Check size={16} className="text-green-400" />
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((m) => (
                          <div key={m.id} className="bg-dark-700 text-dark-100 text-sm p-2 rounded">{m.text}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat() }}
                      className="input flex-1"
                      placeholder="Digite sua mensagem..."
                    />
                    <button
                      onClick={handleSendChat}
                      className="btn-primary px-4 py-2"
                      title="Enviar mensagem"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default PainelPedidos