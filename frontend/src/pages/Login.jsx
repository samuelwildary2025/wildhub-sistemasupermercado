import { useState } from 'react'
import { login } from '../services/api'
import { ShoppingCart, Mail, Lock, AlertCircle } from 'lucide-react'

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Sending login data:', formData) // Debug log
      const response = await login(formData)
      console.log('Login response:', response.data) // Debug log
      onLogin(response.data, rememberMe)
    } catch (err) {
      console.error('Login error:', err) // Debug log
      const detail = err?.response?.data?.detail
      let message = 'Erro ao fazer login'
      if (typeof detail === 'string') {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail.map(d => d?.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('; ')
      } else if (detail && typeof detail === 'object') {
        message = detail.msg || JSON.stringify(detail)
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShoppingCart size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Wildhub</h1>
          <p className="text-dark-400 mt-2">Sistema de Gestão de Pedidos</p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <AlertCircle size={20} className="text-red-400" />
                <span className="text-red-400 text-sm">{String(error)}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10 w-full"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10 w-full"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="rememberMe" className="flex items-center cursor-pointer select-none">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-dark-800 border-dark-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-dark-300">Manter conectado</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-dark-700 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">Credenciais de Teste:</h3>
            <div className="text-xs text-dark-300 space-y-1">
              <p><strong>Admin:</strong> admin@admin.com / admin123</p>
              <p><strong>Cliente:</strong> Crie um supermercado primeiro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login