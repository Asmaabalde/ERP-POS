import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './style.css'
import { App } from './App.jsx';
import { ThemeInit } from "../.flowbite-react/init.jsx";
import { registerSW } from 'virtual:pwa-register'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeInit />
      <App />
    </BrowserRouter>
  </StrictMode>,
)

registerSW({
  immediate: true,
})
