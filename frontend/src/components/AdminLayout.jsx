import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-dark-900">
      {/* Sidebar fixa */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Conteúdo principal com scroll independente */}
      <div className="flex-1 overflow-y-auto text-gray-900 dark:text-gray-100">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
