import { useState, useEffect } from 'react'
import { getPedidos } from '../services/api'
import Header from '../components/Header'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, DollarSign, ShoppingBag, Calendar } from 'lucide-react'

const Analytics = () => {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // dias

  useEffect(() => {
    loadPedidos()
  }, [])

  const loadPedidos = async () => {
    try {
      const response = await getPedidos()
      setPedidos(response.data)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num)
  }

  // Calcula total do pedido de forma robusta a dados incompletos
  const orderTotal = (pedido) => {
    // Se já vier calculado e válido, usa
    const vt = parseFloat(pedido?.valor_total)
    if (!Number.isNaN(vt) && vt > 0) return vt
    // Caso contrário soma itens
    const itens = Array.isArray(pedido?.itens) ? pedido.itens : []
    return itens.reduce((sum, item) => {
      const preco = parseFloat(item?.preco_unitario) || 0
      const qtd = parseFloat(item?.quantidade) || 0
      return sum + preco * qtd
    }, 0)
  }

  // Filtrar pedidos por período
  const getFilteredPedidos = () => {
    const days = parseInt(timeRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return pedidos.filter(pedido => 
      new Date(pedido.data_pedido) >= cutoffDate
    )
  }

  const filteredPedidos = getFilteredPedidos()

  // Dados para gráficos
  const getMonthlyData = () => {
    const monthlyData = {}
    
    filteredPedidos.forEach(pedido => {
      const date = new Date(pedido.data_pedido)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          vendas: 0,
          pedidos: 0
        }
      }
      
      monthlyData[monthKey].vendas += orderTotal(pedido)
      monthlyData[monthKey].pedidos += 1
    })
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  }

  const getStatusData = () => {
    const statusCount = filteredPedidos.reduce((acc, pedido) => {
      acc[pedido.status] = (acc[pedido.status] || 0) + 1
      return acc
    }, {})

    return [
      { name: 'Pendentes', value: statusCount.pendente || 0, color: '#EAB308' },
      { name: 'Faturados', value: statusCount.faturado || 0, color: '#22C55E' }
    ]
  }

  const getDailyData = () => {
    const dailyData = {}
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    last7Days.forEach(date => {
      dailyData[date] = {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        vendas: 0,
        pedidos: 0
      }
    })

    filteredPedidos.forEach(pedido => {
      const date = pedido.data_pedido.split('T')[0]
      if (dailyData[date]) {
        dailyData[date].vendas += orderTotal(pedido)
        dailyData[date].pedidos += 1
      }
    })

    return Object.values(dailyData)
  }

  // Estatísticas
  const currentTotalVendas = filteredPedidos.reduce((sum, p) => sum + orderTotal(p), 0)
  const currentTotalPedidos = filteredPedidos.length
  const ticketMedio = currentTotalPedidos > 0 ? currentTotalVendas / currentTotalPedidos : 0

  // Crescimento: compara com período anterior equivalente
  const getGrowthPercent = () => {
    const days = parseInt(timeRange)
    const endCurrent = new Date()
    const startCurrent = new Date()
    startCurrent.setDate(endCurrent.getDate() - days)

    const endPrev = new Date(startCurrent)
    endPrev.setDate(startCurrent.getDate() - 1)
    const startPrev = new Date(startCurrent)
    startPrev.setDate(startCurrent.getDate() - days)

    const inPrevRange = (dateStr) => {
      const d = new Date(dateStr)
      return d >= startPrev && d <= endPrev
    }

    const prevPedidos = pedidos.filter(p => inPrevRange(p.data_pedido))
    const prevTotalVendas = prevPedidos.reduce((sum, p) => sum + orderTotal(p), 0)

    if (prevTotalVendas === 0) return currentTotalVendas > 0 ? 100 : 0
    return ((currentTotalVendas - prevTotalVendas) / prevTotalVendas) * 100
  }

  const stats = {
    totalVendas: currentTotalVendas,
    totalPedidos: currentTotalPedidos,
    ticketMedio,
    crescimento: Number(getGrowthPercent().toFixed(1))
  }

  if (loading) {
    return (
      // Corrigindo para usar a paleta correta para o fundo do loading
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="text-gray-900 dark:text-white">Carregando...</div>
      </div>
    )
  }

  // Define a cor do eixo baseada no modo de tema
  const isDarkMode = window.document.documentElement.classList.contains('dark');
  const axisStroke = isDarkMode ? '#9CA3AF' : '#1F2937'; // Cinza no Dark, Preto/Escuro no Light
  const gridStroke = isDarkMode ? '#374151' : '#E5E7EB'; // Escuro no Dark, Cinza claro no Light
  const textColor = isDarkMode ? 'white' : '#1F2937';
  const tooltipBg = isDarkMode ? '#1F2937' : 'white';
  const tooltipBorder = isDarkMode ? '#374151' : '#D1D5DB';

  return (
    // Removendo bg-dark-900 para permitir que AdminLayout controle o fundo
    <div className="min-h-screen">
      <Header 
        title="Analytics" 
        subtitle="Análise detalhada das vendas e performance"
      />

      <div className="p-6">
        {/* Time Range Selector */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Calendar size={20} className="text-dark-400 dark:text-dark-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>

        {/* Stats Cards - Aplicando p-4 e alinhamento centralizado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <DollarSign className="text-green-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Total de Vendas</p>
              <p className="text-2xl font-bold text-green-400 dark:text-green-400">{formatCurrency(stats.totalVendas)}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <ShoppingBag className="text-blue-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Total de Pedidos</p>
              <p className="text-2xl font-bold text-blue-400 dark:text-blue-400">{stats.totalPedidos}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <TrendingUp className="text-purple-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Ticket Médio</p>
              <p className="text-2xl font-bold text-purple-400 dark:text-purple-400">{formatCurrency(stats.ticketMedio)}</p>
            </div>
          </div>

          <div className="card p-4 flex flex-col items-center text-center">
            <div className="flex flex-col items-center justify-center w-full">
              <TrendingUp className="text-green-400 mb-2" size={24} />
              <p className="text-dark-400 text-sm">Crescimento</p>
              <p className="text-2xl font-bold text-green-400 dark:text-green-400">{stats.crescimento >= 0 ? '+' : ''}{stats.crescimento}%</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vendas por Mês */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vendas por Período</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getMonthlyData()}>
                {/* Ajustado para usar as cores dinâmicas */}
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} tick={{ fill: textColor }} />
                <YAxis stroke={axisStroke} tick={{ fill: textColor }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [
                    name === 'vendas' ? formatCurrency(value) : value,
                    name === 'vendas' ? 'Vendas' : 'Pedidos'
                  ]}
                />
                <Bar dataKey="vendas" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status dos Pedidos */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status dos Pedidos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getStatusData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => <text fill={textColor}>{`${name} ${(percent * 100).toFixed(0)}%`}</text>}
                >
                  {getStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendas Diárias */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vendas dos Últimos 7 Dias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getDailyData()}>
              {/* Ajustado para usar as cores dinâmicas */}
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" stroke={axisStroke} tick={{ fill: textColor }} />
              <YAxis stroke={axisStroke} tick={{ fill: textColor }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: tooltipBg, 
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [
                  name === 'vendas' ? formatCurrency(value) : value,
                  name === 'vendas' ? 'Vendas' : 'Pedidos'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="vendas" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Analytics
