// frontend/src/components/AdminLayout.jsx

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="layout flex min-h-screen transition-colors duration-500">
      {/* Sidebar mantém o estilo escuro em ambos os modos */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Conteúdo principal: Definir classes de cor de fundo e texto para ambos os modos */}
      <div className="flex-1 bg-gray-50 text-gray-900 dark:bg-dark-900 dark:text-gray-100 transition-colors duration-500">
        <Outlet />
      </div>
    </div>
  )
}
