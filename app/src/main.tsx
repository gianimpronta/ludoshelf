import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { RepositorioDexie } from './persistencia/RepositorioDexie.js'

const raiz = document.getElementById('raiz')
if (raiz === null) {
  throw new Error('elemento #raiz não encontrado em index.html')
}

// Dispara antes de renderizar; o store começa com RepositorioEmMemoria e troca
// assim que `inicializar` resolve (ou cai no fallback — spec §7).
void useEstadoDoApp.getState().inicializar(new RepositorioDexie())

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
