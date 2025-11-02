import { useState, useEffect, useMemo, useRef } from 'react'
import { getPedidos, updatePedido } from '../services/api'
import Header from '../components/Header'
import PedidoCard from '../components/PedidoCard'
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign, X, Phone, MapPin, CreditCard, MessageSquare, Calendar, Check, Printer, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [concluidosPage, setConcluidosPage] = useState(0)
  const CONCLUIDOS_PAGE_SIZE = 15
  const todayKey = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()), [])
  const [concluidosDateFilter, setConcluidosDateFilter] = useState(todayKey)
  const datePickerRef = useRef(null)

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

  const formatDateKey = (date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)

  const getPedidoDate = (pedido) => {
    const raw = pedido?.data_pedido || pedido?.created_at || pedido?.updated_at
    if (!raw) return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.valueOf()) ? null : parsed
  }

  const getPedidoDateKey = (pedido) => {
    const date = getPedidoDate(pedido)
    return date ? formatDateKey(date) : null
  }

  const formatDisplayDate = (key) => {
    if (!key) return ''
    const date = new Date(`${key}T00:00:00`)
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date)
  }

  const openDatePicker = () => {
    const input = datePickerRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
      input.click()
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
    const pedidosHoje = pedidos.filter((p) => getPedidoDateKey(p) === todayKey)
    const pendentesHoje = pedidosHoje.filter((p) => p.status === 'pendente')
    const faturadosHoje = pedidosHoje.filter((p) => p.status === 'faturado')
    const valorTotal = faturadosHoje.reduce((sum, p) => sum + orderTotal(p), 0)

    setStats({
      total: pedidosHoje.length,
      pendentes: pendentesHoje.length,
      faturados: faturadosHoje.length,
      valorTotal,
    })
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
      // Garante que o campo 'telefone' seja enviado (mesmo que nulo)
      telefone: current?.telefone ?? current?.phone ?? null, 
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.forma ?? current?.payment_method ?? null, // Usando 'forma' e 'payment_method'
      observacoes: current?.observacao ?? current?.observacoes ?? null, // Usando 'observacao' e 'observacoes'
      // garante que o update preserve o vínculo ao supermercado
      supermarket_id: current?.supermarket_id ?? getSupermarketId() ?? 1
    }

    if (newStatus === 'faturado') {
      setConcluidosPage(0)
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

  const parsePedidoDate = (pedido) => getPedidoDate(pedido) || new Date(0)


  const pendentesPedidos = pedidos.filter((p) => p.status === 'pendente')

  const concluidosPedidos = useMemo(() => {
    return pedidos
      .filter((p) => p.status === 'faturado')
      .sort((a, b) => parsePedidoDate(b) - parsePedidoDate(a))
  }, [pedidos])

  const filteredConcluidos = useMemo(() => {
    if (!concluidosDateFilter) return concluidosPedidos
    return concluidosPedidos.filter((pedido) => getPedidoDateKey(pedido) === concluidosDateFilter)
  }, [concluidosPedidos, concluidosDateFilter])

  const totalConcluidosPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredConcluidos.length / CONCLUIDOS_PAGE_SIZE))
  }, [filteredConcluidos.length])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredConcluidos.length / CONCLUIDOS_PAGE_SIZE) - 1)
    if (concluidosPage > maxPage) {
      setConcluidosPage(maxPage)
    }
  }, [filteredConcluidos.length, concluidosPage])

  useEffect(() => {
    setConcluidosPage(0)
  }, [concluidosDateFilter])

  const paginatedConcluidos = useMemo(() => {
    const start = concluidosPage * CONCLUIDOS_PAGE_SIZE
    return filteredConcluidos.slice(start, start + CONCLUIDOS_PAGE_SIZE)
  }, [filteredConcluidos, concluidosPage])

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

  // FUNÇÃO CORRIGIDA PARA IMPRESSÃO (ROBUSTEZ DA DATA E DETALHES COMPLETOS)
  const handlePrint = (pedido) => {
    // 1. Extrair e garantir dados do cliente/pedido
    const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente Desconhecido';
    const numeroPedido = pedido?.numero_pedido ?? pedido?.id;
    
    // Usar as novas propriedades que o backend agora retorna
    const clienteTelefone = pedido?.telefone || pedido?.phone || 'Não informado';
    const clienteEndereco = pedido?.endereco || pedido?.address || 'Não informado';
    const clienteFormaPagamento = pedido?.forma || pedido?.payment_method || 'Não informada';

    // 2. Preparar a lista de itens (incluindo cálculo subtotal)
    const itens = (Array.isArray(pedido?.itens) ? pedido.itens : pedido?.items || [])
        .map(item => {
            const nome = item?.nome_produto || item?.product_name || 'Item';
            const qtd = Number(item?.quantidade ?? item?.quantity) || 0;
            const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0;
            const subtotal = qtd * unit;
            return `${nome} x${qtd} - R$ ${subtotal.toFixed(2)}`;
        }).join('\n');
        
    // 3. Estrutura completa do comprovante
    // CORRIGIDO: Adicionado timeZone: 'America/Fortaleza'
    const comprovante = `
SUPERMERCADO
-----------------------------
PEDIDO #${numeroPedido}
DATA: ${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '-'}
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
${(pedido?.observacao || pedido?.observacoes) ? 'OBS: ' + (pedido?.observacao || pedido?.observacoes) + '\n-----------------------------' : ''}
Obrigado pela preferência!
`

    // Abre janela de impressão
    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) { 
      printWindow.document.write(`<pre style='font-size:16px;'>${comprovante}</pre>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      alert("A janela de impressão foi bloqueada pelo navegador. Verifique as configurações de pop-up.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="text-gray-900 dark:text-white">Carregando...</div>
      </div>
    )
  }

  // Listas separadas
  // Componente de Card KPI reutilizável (Ajustado para o Painel de Pedidos)
  const KpiCard = ({ title, value, icon: Icon, color }) => (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 dark:text-dark-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-full ${color}/20 flex items-center justify-center`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  )


  return (
    // Removendo bg-dark-900 para permitir que AdminLayout controle o fundo
    <div className="min-h-screen"> 
      <Header 
        title="Painel de Pedidos" 
        subtitle="Gerencie todos os pedidos do seu supermercado"
      />

      <div className="p-6">
        {/* Stats Cards - Usando o novo KpiCard para melhorar a estética */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          
          <KpiCard 
            title="Total de Pedidos" 
            value={stats.total} 
            icon={TrendingUp} 
            color="text-blue-600 dark:text-blue-400"
          />

          <KpiCard 
            title="Pendentes" 
            value={stats.pendentes} 
            icon={Clock} 
            color="text-yellow-600 dark:text-yellow-400"
          />

          <KpiCard 
            title="Faturados" 
            value={stats.faturados} 
            icon={CheckCircle} 
            color="text-green-600 dark:text-green-400"
          />

          <KpiCard 
            title="Valor Faturado" 
            value={formatCurrency(stats.valorTotal)} 
            icon={DollarSign} 
            color="text-green-600 dark:text-green-400"
          />

        </div>

        {/* Ações */}
    

        {/* Duas Colunas: Em andamento x Concluídos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Em Andamento */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Pedidos em Andamento</h3>
              <span className="text-sm text-yellow-600 dark:text-yellow-400">{pendentesPedidos.length}</span>
            </div>
            {pendentesPedidos.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-400">Nenhum pedido pendente.</p>
            ) : (
            <div className="space-y-3">
              {pendentesPedidos.map((pedido) => {
                const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente'
                const data = pedido?.data_pedido || pedido?.created_at
                return (
                  <div
                    key={pedido.id}
                    // CORRIGIDO: Aplicando cores de fundo e texto Light/Dark mais coerentes
                    className={`w-full flex items-center justify-between py-3 px-3 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 border shadow-sm cursor-pointer ${selectedPedido?.id === pedido.id ? 'ring-2 ring-yellow-400 border-yellow-600' : 'ring-1 ring-transparent border-gray-300 dark:border-dark-700'}`}
                  >
                    <div onClick={() => openDetails(pedido)} className="flex-1 cursor-pointer">
                      <p className="text-gray-900 dark:text-white font-medium">{clienteNome}</p>
                      {/* CORRIGIDO: Adicionado timeZone: 'America/Fortaleza' */}
                      <p className="text-gray-500 dark:text-dark-400 text-sm">{data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{formatCurrency(orderTotal(pedido))}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(pedido.id, 'faturado') }}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        Faturar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrint(pedido) }}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
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
          <div className="card p-4">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-gray-900 dark:text-white font-semibold">Pedidos Concluídos</h3>
                  <span className="text-sm text-green-600 dark:text-green-400">{filteredConcluidos.length}</span>
                </div>
                {filteredConcluidos.length > CONCLUIDOS_PAGE_SIZE && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConcluidosPage((page) => Math.max(0, page - 1))}
                      disabled={concluidosPage === 0}
                      className={`p-1 rounded border border-gray-200 dark:border-dark-600 transition-colors ${
                        concluidosPage === 0
                          ? 'text-gray-300 dark:text-dark-500 cursor-not-allowed'
                          : 'text-gray-600 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                      }`}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      {concluidosPage + 1} / {totalConcluidosPages}
                    </span>
                    <button
                      onClick={() => setConcluidosPage((page) => Math.min(totalConcluidosPages - 1, page + 1))}
                      disabled={concluidosPage >= totalConcluidosPages - 1}
                      className={`p-1 rounded border border-gray-200 dark:border-dark-600 transition-colors ${
                        concluidosPage >= totalConcluidosPages - 1
                          ? 'text-gray-300 dark:text-dark-500 cursor-not-allowed'
                          : 'text-gray-600 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-700'
                      }`}
                      aria-label="Próxima página"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-gray-500 dark:text-dark-300 tracking-wide uppercase">
                  Filtrar por data
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className="button-outline px-3 py-1 flex items-center justify-center text-sm"
                    aria-label="Selecionar data"
                  >
                    <Calendar size={16} />
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={concluidosDateFilter || ''}
                    onChange={(e) => setConcluidosDateFilter(e.target.value)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <button
                  onClick={() => setConcluidosDateFilter(todayKey)}
                  className="button-outline text-xs px-3 py-1"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setConcluidosDateFilter('')}
                  className="button-outline text-xs px-3 py-1"
                >
                  Todos
                </button>
                {concluidosDateFilter && (
                  <span className="text-xs text-gray-500 dark:text-dark-400">
                    Exibindo pedidos de {formatDisplayDate(concluidosDateFilter)}
                  </span>
                )}
              </div>
            </div>
            {filteredConcluidos.length === 0 ? (
              <p className="text-gray-500 dark:text-dark-400">Nenhum pedido concluído para a seleção atual.</p>
            ) : (
              <div className="space-y-3">
                {paginatedConcluidos.map((pedido) => (
                  <PedidoCard 
                    key={pedido.id}
                    pedido={pedido}
                    onStatusChange={handleStatusChange} 
                    onOpen={() => openDetails(pedido)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalhes do Pedido (Modal) */}
        {showDetails && selectedPedido && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
            <div className="bg-white dark:bg-dark-800 w-full max-w-4xl rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
              {/* Cabeçalho do modal */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                  {`Pedido de ${selectedPedido?.cliente_nome || selectedPedido?.nome_cliente || selectedPedido?.client_name || 'Cliente'}`}
                </h3>
                <button className="text-gray-500 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white" onClick={closeDetails}>
                  <X size={20} />
                </button>
              </div>

              {/* CORRIGIDO: Adicionado max-h-[80vh] e overflow-y-auto no corpo principal do modal */}
              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-y-auto">
                {/* Coluna Esquerda */}
                <div className="space-y-4 lg:col-span-2">
                  {/* Informações do Cliente */}
                  <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700"> 
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-gray-500 dark:text-dark-400" />
                      Informações do Cliente
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <Phone size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        {/* CORRIGIDO: Agora prioriza selectedPedido?.telefone (vindo do backend) */}
                        <span>{selectedPedido?.telefone || selectedPedido?.phone || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <MapPin size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        <span>{selectedPedido?.endereco || selectedPedido?.address || '—'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
                        <CreditCard size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
                        <span>{selectedPedido?.forma || selectedPedido?.payment_method || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3">Itens do Pedido</h4>
                    {/* ADICIONADO: Rolagem interna para lista de itens */}
                    <div className="space-y-2 max-h-48 overflow-y-auto"> 
                      {(Array.isArray(selectedPedido?.itens) ? selectedPedido?.itens : selectedPedido?.items || []).map((item, idx) => {
                        const nome = item?.nome_produto || item?.product_name || 'Item'
                        const qtd = Number(item?.quantidade ?? item?.quantity) || 0
                        const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0
                        const subtotal = qtd * unit
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 rounded border border-gray-200 dark:border-dark-700">
                            <div>
                              <p className="text-gray-900 dark:text-white">{nome}</p>
                              <p className="text-gray-500 dark:text-dark-400 text-xs">{`${qtd}x ${formatCurrency(unit)}`}</p>
                            </div>
                            <div className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-gray-700 dark:text-white/80 font-medium">Total</span>
                      <span className="text-green-600 dark:text-green-400 font-extrabold text-lg">{formatCurrency(orderTotal(selectedPedido))}</span>
                    </div>
                  </div>

                  {/* Observações */}
                  {(selectedPedido?.observacao || selectedPedido?.observacoes) && (
                    <div className="rounded-lg p-4 border bg-amber-100 dark:bg-amber-800/30 border-amber-400 dark:border-amber-700/40">
                      <h4 className="text-amber-800 dark:text-white font-medium mb-2">Observações</h4>
                      <p className="text-amber-800 dark:text-amber-100 text-sm">{selectedPedido?.observacao || selectedPedido?.observacoes}</p>
                    </div>
                  )}

                  {/* Ação */}
                  {selectedPedido?.status !== 'faturado' && (
                    <button
                      onClick={() => handleStatusChange(selectedPedido.id, 'faturado')}
                      className="w-full button flex items-center justify-center gap-2 py-3"
                    >
                      <CheckCircle size={18} />
                      Enviar para Faturamento
                    </button>
                  )}
                  </div>

                {/* Coluna Direita - Chat */}
                <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700 flex flex-col">
                  <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
                    <MessageSquare size={18} className="text-gray-500 dark:text-dark-400" />
                    Chat com Cliente
                  </h4>
                  <div className="flex-1 rounded bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 p-3 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-dark-300 text-sm">
                        <Check size={16} className="text-green-600 dark:text-green-400" />
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((m) => (
                          <div key={m.id} className="bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-dark-100 text-sm p-2 rounded">{m.text}</div>
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
                      className="button px-4 py-2"
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
