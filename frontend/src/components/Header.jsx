import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const Header = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4 transition-colors duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-gray-500 dark:text-dark-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Campo de busca */}
          <div className="relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-400"
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="input pl-10 w-64 bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-dark-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
            />
          </div>

          {/* Botão de alternância de tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-200 hover:opacity-80 transition"
            title={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notificações */}
          <button className="relative p-2 text-gray-500 dark:text-dark-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
