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
      } flex flex-col min-h-screen transition-all duration-300 ease-in-out
      bg-[#1e293b] dark:bg-dark-800
      border-r border-gray-200 dark:border-dark-700 shadow-sm`}
    >
      {/* Topo */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
        <div
          className={`text-white font-semibold tracking-wide transition-all duration-300 ${
            isCollapsed ? 'opacity-0 translate-x-[-10px]' : 'opacity-100'
          }`}
        >
          Wildhub
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Alternar largura da sidebar"
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      {/* Usuário */}
      <div className="p-4 text-gray-300 border-b border-gray-200 dark:border-dark-700 bg-[#243045] dark:bg-dark-800/70">
        <div className="truncate text-sm font-medium">
          {user?.email || 'admin@admin.com'}
