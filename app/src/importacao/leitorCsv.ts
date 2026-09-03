export type Delimitador = ',' | ';'

export interface RegistroCsv {
  readonly numeroDaLinha: number
  readonly valores: Readonly<Record<string, string>>
}

export interface ResultadoParseCsv {
  readonly cabecalhos: readonly string[]
  readonly linhas: readonly Readonly<Record<string, string>>[]
  readonly registros: readonly RegistroCsv[]
}

/**
 * Detecta se o CSV utiliza vírgula ou ponto-e-vírgula com base nas primeiras linhas,
 * ignorando delimitadores dentro de aspas.
 */
export function detectarDelimitador(conteudo: string): Delimitador {
  const primeiraLinha = conteudo.split(/\r?\n/)[0] ?? ''
  let emAspas = false
  let virgulas = 0
  let pontoEVirgulas = 0

  for (let i = 0; i < primeiraLinha.length; i++) {
    const char = primeiraLinha[i]
    if (char === '"') {
      emAspas = !emAspas
    } else if (!emAspas) {
      if (char === ',') virgulas++
      if (char === ';') pontoEVirgulas++
    }
  }

  return pontoEVirgulas > virgulas ? ';' : ','
}

/**
 * Parser RFC 4180 puro, sem dependências externas. Suporta BOM, aspas,
 * quebras de linha em campos e delimitadores flexíveis.
 */
export function parsearCsv(
  conteudoBruto: string,
  delimitadorParam?: Delimitador,
): ResultadoParseCsv {
  const conteudo = conteudoBruto.startsWith('\uFEFF') ? conteudoBruto.slice(1) : conteudoBruto
  const delimitador = delimitadorParam ?? detectarDelimitador(conteudo)

  const matrizLinhas: string[][] = []
  let linhaAtual: string[] = []
  let campoAtual = ''
  let emAspas = false

  for (let i = 0; i < conteudo.length; i++) {
    const char = conteudo[i]
    const proxChar = conteudo[i + 1]

    if (char === '"') {
      if (emAspas && proxChar === '"') {
        campoAtual += '"'
        i++ // pula a segunda aspas escapada
      } else {
        emAspas = !emAspas
      }
    } else if (char === delimitador && !emAspas) {
      linhaAtual.push(campoAtual.trim())
      campoAtual = ''
    } else if ((char === '\r' || char === '\n') && !emAspas) {
      if (char === '\r' && proxChar === '\n') {
        i++
      }
      linhaAtual.push(campoAtual.trim())
      if (linhaAtual.some((campo) => campo.length > 0)) {
        matrizLinhas.push(linhaAtual)
      }
      linhaAtual = []
      campoAtual = ''
    } else {
      campoAtual += char
    }
  }

  if (campoAtual.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim())
    if (linhaAtual.some((campo) => campo.length > 0)) {
      matrizLinhas.push(linhaAtual)
    }
  }

  if (matrizLinhas.length === 0) {
    return { cabecalhos: [], linhas: [], registros: [] }
  }

  const cabecalhos = matrizLinhas[0] ?? []
  const registros: RegistroCsv[] = []
  const linhas: Record<string, string>[] = []

  for (let idx = 1; idx < matrizLinhas.length; idx++) {
    const cols = matrizLinhas[idx] ?? []
    const obj: Record<string, string> = {}
    for (let c = 0; c < cabecalhos.length; c++) {
      const nomeCol = cabecalhos[c]
      if (nomeCol !== undefined) {
        obj[nomeCol] = cols[c] ?? ''
      }
    }
    linhas.push(obj)
    registros.push({ numeroDaLinha: idx + 1, valores: obj })
  }

  return { cabecalhos, linhas, registros }
}
