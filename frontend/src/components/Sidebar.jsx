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
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } min-h-screen flex flex-col transition-all duration-300
      bg-[#1e293b] dark:bg-dark-800
      border-r border-gray-200 dark:border-dark-700 shadow-sm`}
    >
      {/* Topo */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
        <div className="text-white font-semibold tracking-wide">
          {!isCollapsed && 'Wildhub'}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-300 hover:text-white transition-colors"
          aria-label="Alternar largura da sidebar"
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      {/* Usuário */}
      <div className="p-4 text-gray-300 border-b border-gray-200 dark:border-dark-700 bg-[#243045] dark:bg-dark-800/70">
        <div className="truncate">{user?.email || 'admin@admin.com'}</div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-dark-700 hover:text-white dark:hover:bg-dark-700'
              } transition-all duration-200`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 mt-auto border-t border-gray-200 dark:border-dark-700">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
        >
          <span>🚪</span>
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
