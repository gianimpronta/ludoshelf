import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ClienteBgg } from './bgg/clienteBgg.js'
import { prisma } from './db.js'
import { ServicoCatalogo } from './servicos/servicoCatalogo.js'

export function criarApp(servicoCatalogo?: ServicoCatalogo) {
  const app = new Hono()
  const catalogo = servicoCatalogo || new ServicoCatalogo(prisma, new ClienteBgg())

  // Habilita CORS para o frontend em desenvolvimento
  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  app.get('/health', async (c) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return c.json({ status: 'ok', postgres: true, timestamp: new Date().toISOString() })
    } catch (erro) {
      return c.json({ status: 'erro', postgres: false, mensagem: (erro as Error).message }, 500)
    }
  })

  app.get('/api/jogos/buscar', async (c) => {
    const q = c.req.query('q')
    const idBggStr = c.req.query('idBgg')
    const idLudopediaStr = c.req.query('idLudopedia')

    const idBgg = idBggStr ? parseInt(idBggStr, 10) : undefined
    const idLudopedia = idLudopediaStr ? parseInt(idLudopediaStr, 10) : undefined

    if (idBgg) {
      const jogo = await catalogo.buscarPorIdBgg(idBgg)
      return c.json({ jogos: jogo ? [jogo] : [] })
    }

    if (idLudopedia) {
      const jogo = await catalogo.buscarPorIdLudopedia(idLudopedia)
      return c.json({ jogos: jogo ? [jogo] : [] })
    }

    if (q) {
      const jogos = await catalogo.buscarPorNome(q)
      return c.json({ jogos })
    }

    return c.json({ jogos: [] })
  })

  app.get('/api/jogos/:id/versoes', async (c) => {
    const id = c.req.param('id')
    const jogo = await prisma.jogoCatalogo.findUnique({
      where: { id },
      include: { versoes: true },
    })

    if (!jogo) {
      return c.json({ erro: 'Jogo não encontrado' }, 404)
    }

    return c.json({
      jogo: {
        id: jogo.id,
        nome: jogo.nome,
        idBgg: jogo.idBgg,
        idLudopedia: jogo.idLudopedia,
      },
      versoes: jogo.versoes,
    })
  })

  app.post('/api/jogos/resolver-lote', async (c) => {
    try {
      const corpo = await c.req.json()
      const itens = Array.isArray(corpo?.itens) ? corpo.itens : []
      const resultados = await catalogo.resolverLote(itens)
      return c.json({ resultados })
    } catch (erro) {
      return c.json({ erro: 'Corpo da requisição inválido' }, 400)
    }
  })

  return app
}
