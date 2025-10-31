import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden bg-dark-900 text-gray-100">
      {/* Sidebar fixa */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto bg-dark-900 text-gray-100">
        <main className="min-h-screen p-6 bg-dark-900">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
