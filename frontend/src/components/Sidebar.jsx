import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const adminMenuItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin/supermarkets', label: 'Supermercados', icon: '🏪' },
    { to: '/admin/finance', label: 'Financeiro', icon: '💵' }
  ]

  const clientMenuItems = [
    { to: '/pedidos', label: 'Pedidos', icon: '🛒' },
    { to: '/analytics', label: 'Analytics', icon: '📈' }
  ]

  const items = user?.role === 'admin' ? adminMenuItems : clientMenuItems

  return (
    <aside className={`bg-dark-800 border-r border-dark-700 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div className="text-white font-semibold">Wildhub</div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-300 hover:text-white"
          aria-label="Alternar largura da sidebar"
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      <div className="p-4 text-gray-300 border-b border-dark-700">
        <div>{user?.email || 'admin@admin.com'}</div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md ${isActive ? 'bg-dark-700 text-white' : 'text-gray-300 hover:bg-dark-700 hover:text-white'}`
            }
          >
            <span>{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 mt-auto border-t border-dark-700">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-dark-700 hover:text-white"
        >
          <span>🚪</span>
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}