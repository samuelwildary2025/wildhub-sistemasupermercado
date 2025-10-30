import axios from 'axios'

// URL base (ajuste conforme ambiente)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// === Interceptores ===

// Adiciona token JWT automaticamente
api.interceptors.request.use(
  (config) => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) ||
                  (typeof localStorage !== 'undefined' && localStorage.getItem('token'))
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Trata erros de autenticação (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try { sessionStorage.removeItem('token'); sessionStorage.removeItem('user') } catch {}
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// === Auth ===
export const login = (credentials) => {
  const payload = {
    email: credentials.email,
    senha: credentials.senha ?? credentials.password,
  }
  return api.post('/api/auth/login', payload)
}
export const register = (userData) => api.post('/api/auth/register', userData)

// === Supermercados (Admin / Multitenant) ===
export const getSupermarkets = (tenantId = null) => {
  // permite filtrar por tenant_id se passado
  const params = {}
  if (tenantId) params.tenant_id = tenantId
  return api.get('/api/supermarkets', { params })
}
export const getSupermarket = (id) => api.get(`/api/supermarkets/${id}`)
export const getSupermarketIntegrationToken = (id) => api.get(`/api/supermarkets/${id}/integration-token`)
export const resetSupermarketPassword = (id) => api.post(`/api/supermarkets/${id}/reset-password`)
export const saveCustomToken = (id, customToken) => api.put(`/api/supermarkets/${id}/custom-token`, { custom_token: customToken })
export const createSupermarket = (supermarket) => api.post('/api/supermarkets', supermarket)
export const updateSupermarket = (id, supermarket) => api.put(`/api/supermarkets/${id}`, supermarket)
export const deleteSupermarket = (id, options = {}) => {
  const { force = false, adminPassword } = options
  // Envia payload no corpo do DELETE para suportar exclusão forçada
  const data = force ? { force: true, admin_password: adminPassword } : undefined
  return api.delete(`/api/supermarkets/${id}`, data ? { data } : undefined)
}

// Testa integração do agente IA (server-to-server) para um supermercado específico
export const agentTest = (id, { url, payload, headers } = {}) => {
  return api.post(`/api/supermarkets/${id}/agent-test`, { url, payload, headers })
}

// === Clientes ===
export const getClients = (tenantId = null) => {
  const params = {}
  if (tenantId) params.tenant_id = tenantId
  return api.get('/api/clientes', { params })
}
export const createClient = (client) => api.post('/api/clientes', client)
export const updateClient = (id, client) => api.put(`/api/clientes/${id}`, client)
export const deleteClient = (id) => api.delete(`/api/clientes/${id}`)

// === Pedidos ===
export const getPedidos = (status = null, tenantId = null) => {
  const params = {}
  if (status) params.status = status
  if (tenantId) params.tenant_id = tenantId
  return api.get('/api/pedidos', { params })
}
export const createPedido = (pedido) => api.post('/api/pedidos', pedido)
export const createPedidoWithCustomToken = (pedido, customToken) => {
  // Cria uma nova instância do axios sem interceptors para evitar que o token automático seja adicionado
  const customAxios = axios.create({
    baseURL: API_BASE_URL,
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customToken}`
    },
  })
  
  // Não adiciona interceptors para esta instância
  return customAxios.post('/api/pedidos', pedido)
}
export const updatePedido = (id, pedido) => api.put(`/api/pedidos/${id}`, pedido)
export const deletePedido = (id) => api.delete(`/api/pedidos/${id}`)

// === Financeiro (Admin / Multitenant) ===
export const getFinanceiro = (tenantId) => api.get(`/api/admin/financeiro/${tenantId}`)
export const gerarFatura = (tenantId) => api.post(`/api/admin/financeiro/${tenantId}/fatura`)

export default api
