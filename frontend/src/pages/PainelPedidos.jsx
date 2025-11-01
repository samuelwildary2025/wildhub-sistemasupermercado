// Código completo para frontend/src/pages/PainelPedidos.jsx
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
      // Garante que o campo 'telefone' seja enviado (mesmo que nulo)
      telefone: current?.telefone ?? current?.phone ?? null, 
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.forma ?? current?.payment_method ?? null, // Usando 'forma' e 'payment_method'
      observacoes: current?.observacao ?? current?.observacoes ?? null, // Usando 'observacao' e 'observacoes'
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

  // FUNÇÃO CORRIGIDA PARA IMPRESSÃO (ROBUSTEZ DA DATA)
  const handlePrint = (pedido) => {
    // 1. Extrair e garantir dados do cliente/pedido
    const clienteNome = pedido?.cliente_nome || pedido?.nome_cliente || pedido?.client_name || 'Cliente Desconhecido';
    
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
    const comprovante = `
SUPERMERCADO
-----------------------------
PEDIDO #${pedido.id}
DATA: ${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
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
    if (printWindow) { // Garante que a janela foi aberta (pode ser bloqueada pelo navegador)
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

// ... (Resto do código JSX, inalterado)

  // Listas separadas
  const pendentesPedidos = pedidos.filter(p => p.status === 'pendente')
  const concluidosPedidos = pedidos.filter(p => p.status === 'faturado')
  
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
        <div className="flex justify-end mb-6">
          <button className="button flex items-center space-x-2">
            <Plus size={20} />
            <span>Novo Pedido</span>
          </button>
        </div>

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
                       <p className="text-gray-500 dark:text-dark-400 text-sm">{data ? new Date(data).toLocaleString('pt-BR') : '-'}</p>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Pedidos Concluídos</h3>
    295.           <span className="text-sm text-green-600 dark:text-green-400">{concluidosPedidos.length}</span>
    296.          </div>
    297.          {concluidosPedidos.length === 0 ? (
    298.           <p className="text-gray-500 dark:text-dark-400">Nenhum pedido concluído.</p>
    299.          ) : (
    300.            <div className="space-y-3">
    301.             {concluidosPedidos.map((pedido) => (
    302.               <PedidoCard 
    303.                 key={pedido.id}
    304.                 pedido={pedido}
    305.                 onStatusChange={handleStatusChange} 
    306.                 onOpen={() => openDetails(pedido)}
    307.               />
    308.             ))}
    309.            </div>
    310.          )}
    311.          </div>
    312.         </div>

    314.         {/* Detalhes do Pedido (Modal) */}
    315.         {showDetails && selectedPedido && (
    316.           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2">
    317.             <div className="bg-white dark:bg-dark-800 w-full max-w-4xl rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
    318.               {/* Cabeçalho do modal */}
    319.               <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
    320.                 <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
    321.                   {`Pedido de ${selectedPedido?.cliente_nome || selectedPedido?.nome_cliente || selectedPedido?.client_name || 'Cliente'}`}
    322.                 </h3>
    323.                 <button className="text-gray-500 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white" onClick={closeDetails}>
    324.                   <X size={20} />
    325.                 </button>
    326.               </div>

    327.               <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
    328.                 {/* Coluna Esquerda */}
    329.                 <div className="space-y-4 lg:col-span-2">
    330.                   {/* Informações do Cliente */}
    331.                   <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700"> 
    332.                     <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
    333.                       <Calendar size={18} className="text-gray-500 dark:text-dark-400" />
    334.                       Informações do Cliente
    335.                     </h4>
    336.                     <div className="space-y-2 text-sm">
    337.                       <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
    338.                         <Phone size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
    339.                         {/* CORRIGIDO: Agora prioriza selectedPedido?.telefone (vindo do backend) */}
    340.                         <span>{selectedPedido?.telefone || selectedPedido?.phone || '—'}</span>
    341.                       </div>
    342.                       <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
    343.                         <MapPin size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
    344.                         <span>{selectedPedido?.endereco || selectedPedido?.address || '—'}</span>
    345.                       </div>
    346.                       <div className="flex items-start gap-2 text-gray-700 dark:text-dark-200">
    347.                         <CreditCard size={16} className="mt-0.5 text-gray-500 dark:text-dark-400" />
    348.                         <span>{selectedPedido?.forma || selectedPedido?.payment_method || '—'}</span>
    349.                       </div>
    350.                     </div>
    351.                   </div>

    353.                   {/* Itens do Pedido */}
    354.                   <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700">
    355.                     <h4 className="text-gray-900 dark:text-white font-medium mb-3">Itens do Pedido</h4>
    356.                     <div className="space-y-2">
    357.                       {(Array.isArray(selectedPedido?.itens) ? selectedPedido?.itens : selectedPedido?.items || []).map((item, idx) => {
    358.                         const nome = item?.nome_produto || item?.product_name || 'Item'
    359.                         const qtd = Number(item?.quantidade ?? item?.quantity) || 0
    360.                         const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0
    361.                         const subtotal = qtd * unit
    362.                         return (
    363.                           <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 rounded border border-gray-200 dark:border-dark-700">
    364.                             <div>
    365.                               <p className="text-gray-900 dark:text-white">{nome}</p>
    366.                               <p className="text-gray-500 dark:text-dark-400 text-xs">{`${qtd}x ${formatCurrency(unit)}`}</p>
    367.                             </div>
    368.                             <div className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</div>
    369.                           </div>
    370.                         )
    371.                       })}
    372.                     </div>
    373.                     <div className="flex items-center justify-between mt-3">
    374.                       <span className="text-gray-700 dark:text-white/80 font-medium">Total</span>
    375.                       <span className="text-green-600 dark:text-green-400 font-extrabold text-lg">{formatCurrency(orderTotal(selectedPedido))}</span>
    376.                     </div>
    377.                   </div>

    379.                   {/* Observações */}
    380.                   {(selectedPedido?.observacao || selectedPedido?.observacoes) && (
    381.                     <div className="rounded-lg p-4 border bg-amber-100 dark:bg-amber-800/30 border-amber-400 dark:border-amber-700/40">
    382.                       <h4 className="text-amber-800 dark:text-white font-medium mb-2">Observações</h4>
    383.                       <p className="text-amber-800 dark:text-amber-100 text-sm">{selectedPedido?.observacao || selectedPedido?.observacoes}</p>
    384.                     </div>
    385.                   )}

    387.                   {/* Ação */}
    388.                   {selectedPedido?.status !== 'faturado' && (
    389.                     <button
    390.                       onClick={() => handleStatusChange(selectedPedido.id, 'faturado')}
    391.                       className="w-full button flex items-center justify-center gap-2 py-3"
    392.                     >
    393.                       <CheckCircle size={18} />
    394.                       Enviar para Faturamento
    395.                     </button>
    396.                   )}
    397.                  </div>

    399.                  {/* Coluna Direita - Chat */}
    400.                  <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-200 dark:border-dark-700 flex flex-col">
    401.                     <h4 className="text-gray-900 dark:text-white font-medium mb-3 flex items-center gap-2">
    402.                       <MessageSquare size={18} className="text-gray-500 dark:text-dark-400" />
    403.                       Chat com Cliente
    404.                     </h4>
    405.                     <div className="flex-1 rounded bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 p-3 overflow-y-auto">
    406.                       {chatMessages.length === 0 ? (
    407.                         <div className="flex items-center gap-2 text-gray-500 dark:text-dark-300 text-sm">
    408.                           <Check size={16} className="text-green-600 dark:text-green-400" />
    409.                           Nenhuma mensagem ainda
    410.                         </div>
    411.                       ) : (
    412.                         <div className="space-y-2">
    413.                           {chatMessages.map((m) => (
    414.                             <div key={m.id} className="bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-dark-100 text-sm p-2 rounded">{m.text}</div>
    415.                           ))}
    416.                         </div>
    417.                       )}
    418.                     </div>

    420.                     <div className="mt-3 flex items-center gap-2">
    421.                       <input
    422.                         value={chatInput}
    423.                         onChange={(e) => setChatInput(e.target.value)}
    424.                         onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat() }}
    425.                         className="input flex-1"
    426.                         placeholder="Digite sua mensagem..."
    427.                       />
    428.                       <button
    429.                         onClick={handleSendChat}
    430.                         className="button px-4 py-2"
    431.                         title="Enviar mensagem"
    432.                       >
    433.                         ➤
    434.                       </button>
    435.                     </div>
    436.                    </div>
    437.                   </div>
    438.                   </div>
    439.                 )}

    441.               </div>
    442.             </div>
    443.           </div>
    444.         )}

    446.       </div>
    447.     </div>
    448.   )
    449. }

    451. export default PainelPedidos
