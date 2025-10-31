// 🔇 Desativa logs em produção
if (import.meta.env.MODE === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
