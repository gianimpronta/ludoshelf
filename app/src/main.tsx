import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'

const raiz = document.getElementById('raiz')
if (raiz === null) {
  throw new Error('elemento #raiz não encontrado em index.html')
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
