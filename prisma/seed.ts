import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL não configurada no ambiente.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface JogoConhecidoJson {
  chave: string
  nomesConhecidos: string[]
  maiorMm: number
  menorMm: number
  espessuraMm: number
  fonte: string
}

const METADADOS_CONHECIDOS: Record<
  string,
  { idBgg: number; idLudopedia: number; nome: string; editora: string; ano: number }
> = {
  catan: {
    idBgg: 13,
    idLudopedia: 1,
    nome: 'Catan',
    editora: 'Galápagos Jogos',
    ano: 1995,
  },
  azul: {
    idBgg: 230802,
    idLudopedia: 34509,
    nome: 'Azul',
    editora: 'Galápagos Jogos',
    ano: 2017,
  },
  carcassonne: {
    idBgg: 822,
    idLudopedia: 5,
    nome: 'Carcassonne',
    editora: 'Devir',
    ano: 2000,
  },
  'terraforming-mars': {
    idBgg: 167791,
    idLudopedia: 26715,
    nome: 'Terraforming Mars',
    editora: 'MeepleBR',
    ano: 2016,
  },
  wingspan: {
    idBgg: 266192,
    idLudopedia: 43372,
    nome: 'Wingspan',
    editora: 'Grok Games',
    ano: 2019,
  },
  dixit: {
    idBgg: 39856,
    idLudopedia: 136,
    nome: 'Dixit',
    editora: 'Galápagos Jogos',
    ano: 2008,
  },
  'ticket-to-ride': {
    idBgg: 9209,
    idLudopedia: 188,
    nome: 'Ticket to Ride',
    editora: 'Galápagos Jogos',
    ano: 2004,
  },
}

async function main() {
  const caminhoJson = join(process.cwd(), 'app/src/catalogo/dados/tabela-semeada.json')
  const conteudo = JSON.parse(readFileSync(caminhoJson, 'utf-8')) as {
    jogosConhecidos: JogoConhecidoJson[]
  }

  for (const item of conteudo.jogosConhecidos) {
    const meta = METADADOS_CONHECIDOS[item.chave]
    const nomeJogo = meta ? meta.nome : (item.nomesConhecidos[0] ?? item.chave)
    const idBgg = meta?.idBgg ?? null
    const idLudopedia = meta?.idLudopedia ?? null
    const editora = meta?.editora ?? 'Nacional'
    const ano = meta?.ano ?? null

    const jogo = await prisma.jogoCatalogo.upsert({
      where: { slug: item.chave },
      update: {
        nome: nomeJogo,
        idBgg,
        idLudopedia,
        anoLancamento: ano,
      },
      create: {
        slug: item.chave,
        nome: nomeJogo,
        idBgg,
        idLudopedia,
        anoLancamento: ano,
      },
    })

    // Upsert versão auditada padrão
    const versoesExistentes = await prisma.versaoCatalogo.findMany({
      where: { jogoId: jogo.id },
    })

    if (versoesExistentes.length === 0) {
      await prisma.versaoCatalogo.create({
        data: {
          jogoId: jogo.id,
          nomeVersao: `Edição Nacional (${editora})`,
          editora,
          idioma: 'Português',
          ano,
          maiorMm: item.maiorMm,
          menorMm: item.menorMm,
          espessuraMm: item.espessuraMm,
          confirmada: true,
          fonte: item.fonte,
        },
      })
    }
  }

  console.log(
    `✓ Semeados ${conteudo.jogosConhecidos.length} jogos auditados com versões em PostgreSQL.`,
  )
}

main()
  .catch((e) => {
    console.error('Erro ao semear banco:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
