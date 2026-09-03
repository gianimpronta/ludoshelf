import type { CatalogoDeJogos } from '../catalogo/CatalogoDeJogos.js'
import { criarMedidas, type CaixaDeJogo, type SinalDeFrequencia } from '../nucleo/jogo.js'
import { normalizarNome, type Milimetros } from '../nucleo/medidas.js'
import type { ResultadoParseCsv } from './leitorCsv.js'
import { sanitizarNome } from './sanitizarNome.js'
import type {
  ItemDeErroLinha,
  ItemDePendencia,
  OpcoesDeImportacao,
  ResultadoProcessamentoCsv,
  UnidadeDeComprimento,
} from './tipos.js'

export function interpretarNumero(str: string | undefined): number | null {
  if (str === undefined || str.trim() === '') return null
  const limpo = str.trim().replace(',', '.')
  const num = Number(limpo)
  return Number.isFinite(num) && num > 0 ? num : null
}

function converterParaMm(valor: number, unidade?: UnidadeDeComprimento): Milimetros {
  if (unidade === 'in') return Math.round(valor * 25.4)
  if (unidade === 'cm') return Math.round(valor * 10)
  if (unidade === 'mm') return Math.round(valor)
  // Heurística: < 100 é quase certamente cm
  return valor < 100 ? Math.round(valor * 10) : Math.round(valor)
}

export async function processarCsv(
  resultadoCsv: ResultadoParseCsv,
  params: {
    catalogo: CatalogoDeJogos
    opcoes: OpcoesDeImportacao
    jogosExistentes: readonly CaixaDeJogo[]
  },
): Promise<ResultadoProcessamentoCsv> {
  const { catalogo, opcoes, jogosExistentes } = params
  const { mapeamento, politicaDuplicatas, tentarCompletarComCatalogo } = opcoes

  const jogosProntos: CaixaDeJogo[] = []
  const pendencias: ItemDePendencia[] = []
  const erros: ItemDeErroLinha[] = []

  const mapaExistentesPorNome = new Map<string, CaixaDeJogo>()
  for (const jogo of jogosExistentes) {
    mapaExistentesPorNome.set(normalizarNome(jogo.nome), jogo)
  }

  interface ItemIntermediario {
    readonly linhaNum: number
    readonly id: string
    readonly nome: string
    readonly nomeBaseRef: string | null
    readonly ladoA: number | null
    readonly ladoB: number | null
    readonly espessura: number | null
    readonly unidade?: UnidadeDeComprimento | undefined
    readonly partidas: number | null
  }

  const intermediarios: ItemIntermediario[] = []
  const mapaLotePorNome = new Map<string, string>() // nomeNormalizado -> id

  for (let idx = 0; idx < resultadoCsv.registros.length; idx++) {
    const reg = resultadoCsv.registros[idx]!
    const nomeBruto = reg.valores[mapeamento.colunaNome] ?? ''

    let nomeSanitizado: string
    try {
      nomeSanitizado = sanitizarNome(nomeBruto)
    } catch (e) {
      erros.push({
        linha: reg.numeroDaLinha,
        motivo: e instanceof Error ? e.message : String(e),
        dadoBruto: nomeBruto,
      })
      continue
    }

    const nomeNorm = normalizarNome(nomeSanitizado)
    const existente = mapaExistentesPorNome.get(nomeNorm)

    if (existente && politicaDuplicatas === 'ignorar') {
      pendencias.push({
        linha: reg.numeroDaLinha,
        nome: nomeSanitizado,
        tipo: 'duplicata-ignorada',
        detalhe: `Jogo "${nomeSanitizado}" já existe na coleção e foi ignorado.`,
      })
      continue
    }

    const id = existente && politicaDuplicatas === 'substituir' ? existente.id : crypto.randomUUID()
    mapaLotePorNome.set(nomeNorm, id)

    const ladoA = interpretarNumero(
      mapeamento.colunaMaiorMm ? reg.valores[mapeamento.colunaMaiorMm] : undefined,
    )
    const ladoB = interpretarNumero(
      mapeamento.colunaMenorMm ? reg.valores[mapeamento.colunaMenorMm] : undefined,
    )
    const esp = interpretarNumero(
      mapeamento.colunaEspessuraMm ? reg.valores[mapeamento.colunaEspessuraMm] : undefined,
    )

    const unidTexto = mapeamento.colunaUnidade
      ? reg.valores[mapeamento.colunaUnidade]?.toLowerCase().trim()
      : undefined
    let unidade: UnidadeDeComprimento | undefined =
      opcoes.unidadePadrao === 'auto' ? undefined : opcoes.unidadePadrao

    if (unidTexto) {
      if (/^(cm|cent[ií]metros?|cms)$/i.test(unidTexto)) {
        unidade = 'cm'
      } else if (/^(mm|mil[ií]metros?|mms)$/i.test(unidTexto)) {
        unidade = 'mm'
      } else if (/^(in|pol|polegadas?|inches?|")$/i.test(unidTexto)) {
        unidade = 'in'
      }
    }

    const nomeBaseRef = mapeamento.colunaJogoBase
      ? reg.valores[mapeamento.colunaJogoBase]?.trim() || null
      : null
    const partidasNum = mapeamento.colunaPartidas
      ? interpretarNumero(reg.valores[mapeamento.colunaPartidas])
      : null

    intermediarios.push({
      linhaNum: reg.numeroDaLinha,
      id,
      nome: nomeSanitizado,
      nomeBaseRef,
      ladoA,
      ladoB,
      espessura: esp,
      unidade,
      partidas: partidasNum,
    })
  }

  // Segundo passo: resolução de parentesco e medidas
  for (const item of intermediarios) {
    let idJogoBase: string | null = null
    if (item.nomeBaseRef !== null) {
      const baseNorm = normalizarNome(item.nomeBaseRef)
      const idNoLote = mapaLotePorNome.get(baseNorm)
      const idNaColecao = mapaExistentesPorNome.get(baseNorm)?.id

      idJogoBase = idNoLote ?? idNaColecao ?? null
      if (idJogoBase === null) {
        pendencias.push({
          linha: item.linhaNum,
          nome: item.nome,
          tipo: 'jogo-base-nao-encontrado',
          detalhe: `Jogo-base "${item.nomeBaseRef}" não encontrado no arquivo nem na coleção.`,
        })
      }
    }

    let maiorMm: Milimetros | null = null
    let menorMm: Milimetros | null = null
    let espessuraMm: Milimetros | null = null
    let origemMedida: CaixaDeJogo['medidas']['origem'] = {
      tipo: 'planilha',
      arquivo: opcoes.nomeDoArquivo ?? 'importacao.csv',
      linha: item.linhaNum,
    }
    let confirmada = false

    if (item.ladoA !== null && item.ladoB !== null && item.espessura !== null) {
      const mA = converterParaMm(item.ladoA, item.unidade)
      const mB = converterParaMm(item.ladoB, item.unidade)
      const mC = converterParaMm(item.espessura, item.unidade)
      const ordenados = [mA, mB, mC].sort((a, b) => b - a)
      maiorMm = ordenados[0]!
      menorMm = ordenados[1]!
      espessuraMm = ordenados[2]!
      confirmada = item.unidade !== undefined
    } else if (tentarCompletarComCatalogo) {
      const achado = await catalogo.buscarPorNome(item.nome)
      if (achado !== null) {
        maiorMm = achado.maiorMm
        menorMm = achado.menorMm
        espessuraMm = achado.espessuraMm
        origemMedida = { tipo: 'semeada', chaveDoTemplate: achado.chaveDoTemplate }
        confirmada = false
      }
    }

    if (maiorMm === null || menorMm === null || espessuraMm === null) {
      maiorMm = 200
      menorMm = 200
      espessuraMm = 50
      confirmada = false
      pendencias.push({
        linha: item.linhaNum,
        nome: item.nome,
        tipo: 'medida-ausente',
        detalhe: 'Dimensões não informadas; preenchidas provisoriamente com 200×200×50 mm.',
      })
    }

    const frequencia: SinalDeFrequencia =
      item.partidas !== null && item.partidas > 0
        ? { tipo: 'partidas', quantidade: item.partidas }
        : { tipo: 'desconhecida' }

    try {
      const medidas = criarMedidas(maiorMm, menorMm, espessuraMm, origemMedida, confirmada)
      jogosProntos.push({
        id: item.id,
        nome: item.nome,
        medidas,
        idJogoBase,
        frequencia,
        idLudopedia: null,
        idBgg: null,
      })
    } catch (e) {
      erros.push({
        linha: item.linhaNum,
        motivo: e instanceof Error ? e.message : String(e),
        dadoBruto: `${item.nome} (${maiorMm}x${menorMm}x${espessuraMm})`,
      })
    }
  }

  return {
    jogosProntosParaSalvar: jogosProntos,
    pendencias,
    erros,
    totalLinhasArquivo: resultadoCsv.registros.length,
  }
}
