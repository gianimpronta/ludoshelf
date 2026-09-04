import type { PrismaClient } from '@prisma/client'
import type { ClienteBgg } from '../bgg/clienteBgg.js'

export interface CriteriosBuscaCatalogo {
  readonly nome?: string | undefined
  readonly idBgg?: number | undefined
  readonly idLudopedia?: number | undefined
}

export interface ItemParaResolver {
  readonly linha?: number | undefined
  readonly nome: string
  readonly idBgg?: number | undefined
  readonly idLudopedia?: number | undefined
}

export interface ResultadoItemResolvido {
  readonly linha?: number | undefined
  readonly itemOriginal: ItemParaResolver
  readonly resultado: JogoCatalogoResposta | null
}

export interface VersaoCatalogoResposta {
  readonly id: string
  readonly idBggVersao?: number | null
  readonly nomeVersao: string
  readonly editora?: string | null
  readonly idioma?: string | null
  readonly ano?: number | null
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
  readonly confirmada: boolean
  readonly fonte: string
}

export interface JogoCatalogoResposta {
  readonly id: string
  readonly nome: string
  readonly idBgg?: number | null
  readonly idLudopedia?: number | null
  readonly anoLancamento?: number | null
  readonly versoes: readonly VersaoCatalogoResposta[]
}

export class ServicoCatalogo {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clienteBgg: ClienteBgg,
  ) {}

  async buscarPorIdBgg(idBgg: number): Promise<JogoCatalogoResposta | null> {
    const jogoDb = await this.prisma.jogoCatalogo.findUnique({
      where: { idBgg },
      include: { versoes: true },
    })

    if (jogoDb) {
      return this.mapearJogo(jogoDb)
    }

    // Se não encontrou no banco, busca no BGG
    const jogoBgg = await this.clienteBgg.buscarJogoComVersoes(idBgg)
    if (!jogoBgg) {
      return null
    }

    // Grava no banco para caches subsequentes
    const jogoCriado = await this.prisma.jogoCatalogo.create({
      data: {
        idBgg: jogoBgg.idBgg,
        nome: jogoBgg.nome,
        anoLancamento: jogoBgg.anoLancamento ?? null,
        versoes: {
          create: jogoBgg.versoes.map((v) => ({
            idBggVersao: v.idVersao,
            nomeVersao: v.nomeVersao,
            editora: v.editora ?? null,
            idioma: v.idioma ?? null,
            ano: v.ano ?? null,
            maiorMm: v.maiorMm,
            menorMm: v.menorMm,
            espessuraMm: v.espessuraMm,
            confirmada: false,
            fonte: 'bgg',
          })),
        },
      },
      include: { versoes: true },
    })

    return this.mapearJogo(jogoCriado)
  }

  async buscarPorIdLudopedia(idLudopedia: number): Promise<JogoCatalogoResposta | null> {
    const jogoDb = await this.prisma.jogoCatalogo.findUnique({
      where: { idLudopedia },
      include: { versoes: true },
    })

    return jogoDb ? this.mapearJogo(jogoDb) : null
  }

  async buscarPorNome(nome: string): Promise<readonly JogoCatalogoResposta[]> {
    const termo = nome.trim()
    if (!termo) return []

    // 1. Busca no PostgreSQL com unaccent e trigrama
    const jogosDb: any[] = await this.prisma.$queryRaw`
      SELECT j.*, similarity(immutable_unaccent(j.nome), immutable_unaccent(${termo})) as sim
      FROM jogos_catalogo j
      WHERE immutable_unaccent(j.nome) % immutable_unaccent(${termo})
         OR immutable_unaccent(j.nome) ILIKE ${'%' + termo + '%'}
      ORDER BY sim DESC
      LIMIT 10;
    `

    if (jogosDb.length > 0) {
      const ids = jogosDb.map((j) => j.id)
      const jogosCompletos = await this.prisma.jogoCatalogo.findMany({
        where: { id: { in: ids } },
        include: { versoes: true },
      })
      return jogosCompletos.map((j) => this.mapearJogo(j))
    }

    // 2. Se não encontrar no banco, tenta buscar no BGG
    const idBggEncontrado = await this.clienteBgg.pesquisarIdPorNome(termo)
    if (idBggEncontrado) {
      const jogoBgg = await this.buscarPorIdBgg(idBggEncontrado)
      if (jogoBgg) {
        return [jogoBgg]
      }
    }

    return []
  }

  async resolver(criterios: CriteriosBuscaCatalogo): Promise<JogoCatalogoResposta | null> {
    if (criterios.idBgg) {
      const porBgg = await this.buscarPorIdBgg(criterios.idBgg)
      if (porBgg) return porBgg
    }

    if (criterios.idLudopedia) {
      const porLudo = await this.buscarPorIdLudopedia(criterios.idLudopedia)
      if (porLudo) return porLudo
    }

    if (criterios.nome) {
      const porNome = await this.buscarPorNome(criterios.nome)
      if (porNome.length > 0 && porNome[0]) return porNome[0]
    }

    return null
  }

  async resolverLote(
    itens: readonly ItemParaResolver[],
  ): Promise<readonly ResultadoItemResolvido[]> {
    const resultados: ResultadoItemResolvido[] = []

    for (const item of itens) {
      const res = await this.resolver({
        nome: item.nome,
        idBgg: item.idBgg,
        idLudopedia: item.idLudopedia,
      })
      resultados.push({
        linha: item.linha !== undefined ? item.linha : undefined,
        itemOriginal: item,
        resultado: res,
      })
    }

    return resultados
  }

  private mapearJogo(jogo: any): JogoCatalogoResposta {
    return {
      id: jogo.id,
      nome: jogo.nome,
      idBgg: jogo.idBgg,
      idLudopedia: jogo.idLudopedia,
      anoLancamento: jogo.anoLancamento,
      versoes: (jogo.versoes || []).map((v: any) => ({
        id: v.id,
        idBggVersao: v.idBggVersao,
        nomeVersao: v.nomeVersao,
        editora: v.editora,
        idioma: v.idioma,
        ano: v.ano,
        maiorMm: v.maiorMm,
        menorMm: v.menorMm,
        espessuraMm: v.espessuraMm,
        confirmada: v.confirmada,
        fonte: v.fonte,
      })),
    }
  }
}
