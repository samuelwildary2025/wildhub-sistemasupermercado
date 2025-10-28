import { Bell, Search } from 'lucide-react'

const Header = ({ title, subtitle }) => {
  return (
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-dark-400 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="input pl-10 w-64"
            />
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 text-dark-400 hover:text-white transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header