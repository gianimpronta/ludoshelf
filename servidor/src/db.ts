import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

if (!process.env.DATABASE_URL) {
  const caminhoRaiz = resolve(process.cwd(), '.env')
  const caminhoPai = resolve(process.cwd(), '../.env')
  if (existsSync(caminhoRaiz)) {
    dotenv.config({ path: caminhoRaiz })
  } else if (existsSync(caminhoPai)) {
    dotenv.config({ path: caminhoPai })
  }
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL não configurada no ambiente.')
}

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })
