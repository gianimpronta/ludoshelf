import { serve } from '@hono/node-server'
import { criarApp } from './app.js'

const app = criarApp()

const PORT = parseInt(process.env.PORT || '3006', 10)
const HOST = '127.0.0.1' // Restrito a 127.0.0.1 conforme INFRA.md (nunca 0.0.0.0)

console.log(`Iniciando API LudoShelf em http://${HOST}:${PORT}...`)

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST,
})
