import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-dark-900 flex">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}