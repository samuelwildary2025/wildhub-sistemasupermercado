import { useState, useEffect } from 'react'
import { getPedidos, updatePedido } from '../services/api'
import Header from '../components/Header'
import PedidoCard from '../components/PedidoCard'
import {
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  DollarSign,
  X,
  Phone,
  MapPin,
  CreditCard,
  MessageSquare,
  Calendar,
  Check,
  Printer
} from 'lucide-react'

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
    }, 4000)
    return () => clearInterval(interval)
  }, [])

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

  const orderTotal = pedido => {
    const itens = Array.isArray(pedido?.itens)
      ? pedido.itens
      : Array.isArray(pedido?.items)
      ? pedido.items
      : []
    return itens.reduce((sum, item) => {
      const rawPreco = item?.preco_unitario ?? item?.unit_price ?? 0
      const rawQtd = item?.quantidade ?? item?.quantity ?? 0
      const preco =
        typeof rawPreco === 'string'
          ? parseFloat(rawPreco.replace(',', '.'))
          : Number(rawPreco) || 0
      const qtd =
        typeof rawQtd === 'string'
          ? parseFloat(String(rawQtd).replace(',', '.'))
          : Number(rawQtd) || 0
      return sum + preco * qtd
    }, 0)
  }

  const calculateStats = () => {
    const total = pedidos.length
    const pendentes = pedidos.filter(p => p.status === 'pendente').length
    const faturados = pedidos.filter(p => p.status === 'faturado').length
    const valorTotal = pedidos
      .filter(p => p.status === 'faturado')
      .reduce((sum, p) => sum + orderTotal(p), 0)
    setStats({ total, pendentes, faturados, valorTotal })
  }

  const handleStatusChange = async (pedidoId, newStatus) => {
    const current = pedidos.find(p => p.id === pedidoId)
    const itensOrig = Array.isArray(current?.itens)
      ? current.itens
      : Array.isArray(current?.items)
      ? current.items
      : []
    const itensNorm = itensOrig.map(it => ({
      id: it?.id,
      product_name: it?.nome_produto ?? it?.product_name ?? 'Item',
      quantity: it?.quantidade ?? it?.quantity ?? 0,
      unit_price: it?.preco_unitario ?? it?.unit_price ?? 0
    }))
    const totalNorm = itensNorm.reduce(
      (sum, it) =>
        sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0),
      0
    )

    const payload = {
      client_name:
        current?.cliente_nome ??
        current?.nome_cliente ??
        current?.client_name ??
        'Cliente',
      total: totalNorm || current?.total || 0,
      status: newStatus ?? current?.status,
      created_at: current?.data_pedido ?? current?.created_at,
      items: itensNorm,
      telefone: current?.telefone ?? current?.phone ?? null,
      address: current?.endereco ?? current?.address ?? null,
      payment_method: current?.forma ?? current?.payment_method ?? null,
      observacoes: current?.observacao ?? current?.observacoes ?? null,
      supermarket_id: current?.supermarket_id ?? getSupermarketId() ?? 1
    }

    try {
      await updatePedido(pedidoId, payload)
      setPedidos(
        pedidos.map(p =>
          p.id === pedidoId ? { ...p, status: newStatus } : p
        )
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      setPedidos(
        pedidos.map(p =>
          p.id === pedidoId ? { ...p, status: newStatus } : p
        )
      )
    }
  }

  const openDetails = pedido => {
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

  const formatCurrency = value => {
    const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), text: chatInput.trim() }
    ])
    setChatInput('')
  }

  const handlePrint = pedido => {
    const clienteNome =
      pedido?.cliente_nome ||
      pedido?.nome_cliente ||
      pedido?.client_name ||
      'Cliente Desconhecido'
    const clienteTelefone = pedido?.telefone || pedido?.phone || 'Não informado'
    const clienteEndereco = pedido?.endereco || pedido?.address || 'Não informado'
    const clienteFormaPagamento =
      pedido?.forma || pedido?.payment_method || 'Não informada'

    const itens = (Array.isArray(pedido?.itens) ? pedido.itens : pedido?.items || [])
      .map(item => {
        const nome = item?.nome_produto || item?.product_name || 'Item'
        const qtd = Number(item?.quantidade ?? item?.quantity) || 0
        const unit = Number(item?.preco_unitario ?? item?.unit_price) || 0
        const subtotal = qtd * unit
        return `${nome} x${qtd} - R$ ${subtotal.toFixed(2)}`
      })
      .join('\n')

    const comprovante = `
SUPERMERCADO
-----------------------------
PEDIDO #${pedido.id}
DATA: ${
      pedido.data_pedido
        ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-'
    }
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
${
  pedido?.observacao || pedido?.observacoes
    ? 'OBS: ' +
      (pedido?.observacao || pedido?.observacoes) +
      '\n-----------------------------'
    : ''
}
Obrigado pela preferência!
`

    const printWindow = window.open('', '', 'width=400,height=600')
    if (printWindow) {
      printWindow.document.write(`<pre style='font-size:16px;'>${comprovante}</pre>`)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    } else {
      alert('A janela de impressão foi bloqueada pelo navegador. Verifique as configurações de pop-up.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="text-gray-900 dark:text-white">Carregando...</div>
      </div>
    )
  }

  const pendentesPedidos = pedidos.filter(p => p.status === 'pendente')
  const concluidosPedidos = pedidos.filter(p => p.status === 'faturado')

  const KpiCard = ({ title, value, icon: Icon, color }) => (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 dark:text-dark-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2 rounded-full ${color}/20 flex items-center justify-center`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <Header title="Painel de Pedidos" subtitle="Gerencie todos os pedidos do seu supermercado" />

      {/* conteúdo omitido aqui para brevidade */}
    </div>
  )
}

export default PainelPedidos
