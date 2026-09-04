import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { CatalogoHttp } from './catalogo/CatalogoHttp.js'
import { CatalogoSemeado } from './catalogo/CatalogoSemeado.js'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { RepositorioDexie } from './persistencia/RepositorioDexie.js'

const raiz = document.getElementById('raiz')
if (raiz === null) {
  throw new Error('elemento #raiz não encontrado em index.html')
}

// Aguarda inicialização do repositório antes de renderizar, garantindo que o
// store usa o repositório final (Dexie ou fallback) quando as telas interativas
// montarem (spec §7).
await useEstadoDoApp
  .getState()
  .inicializar(new RepositorioDexie(), new CatalogoHttp('/api', new CatalogoSemeado()))

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
