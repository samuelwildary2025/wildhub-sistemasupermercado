import { useEffect, useMemo, useState } from 'react'
import { getClientesMetrics } from '../services/api'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getClientesMetrics()
      .then((res) => {
        if (!mounted) return
        setClientes(Array.isArray(res.data) ? res.data : [])
      })
      .catch((err) => {
        if (!mounted) return
        setError(err?.response?.data?.detail || 'Falha ao carregar clientes')
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    if (!query) return clientes
    const q = query.toLowerCase()
    return clientes.filter((c) =>
      (c.nome || '').toLowerCase().includes(q) || (c.telefone || '').toLowerCase().includes(q)
    )
  }, [clientes, query])

  const formatDateTime = (iso) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`
    } catch {
      return '-'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-dark-400">Acompanhe seus clientes e seus pedidos.</p>
        </div>
        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-dark-800 border border-dark-700 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-dark-300">Carregando...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-dark-400">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-dark-400">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Pedidos</th>
                  <th className="px-4 py-3">Último Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="text-sm text-gray-200 hover:bg-dark-800/60">
                    <td className="px-4 py-3">{c.nome}</td>
                    <td className="px-4 py-3">{c.telefone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center rounded-md bg-dark-700 px-2 py-0.5 text-xs text-white">
                        {c.order_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(c.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}