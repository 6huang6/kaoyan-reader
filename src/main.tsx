import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 注册 Service Worker（PWA）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
