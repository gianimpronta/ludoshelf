import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIRETORIO_NUCLEO = fileURLToPath(new URL('../src/nucleo', import.meta.url))
const DIRETORIO_IMPORTACAO = fileURLToPath(new URL('../src/importacao', import.meta.url))
const DIRETORIO_CATALOGO = fileURLToPath(new URL('../src/catalogo', import.meta.url))

/**
 * O núcleo, importação e catálogo são TypeScript puro: nada de UI, 3D, rede ou API de navegador (spec §5.3).
 *
 * Isto é um teste e não uma regra de lint porque `typescript-eslint@8.67.0` declara
 * `typescript: ">=4.8.4 <6.1.0"` e não suporta o TypeScript 7 usado aqui. Como teste,
 * a fronteira quebra no mesmo `pnpm test` que todo o resto e não custa dependência.
 */
const PROIBIDOS = [
  { padrao: /from\s+['"]react/, descricao: 'import de React' },
  { padrao: /from\s+['"]three/, descricao: 'import de Three.js' },
  { padrao: /from\s+['"]@react-three/, descricao: 'import de react-three-fiber' },
  { padrao: /from\s+['"]zustand/, descricao: 'import de Zustand' },
  { padrao: /\bfetch\s*\(/, descricao: 'chamada de fetch' },
  { padrao: /\bwindow\./, descricao: 'uso de window' },
  { padrao: /\bdocument\./, descricao: 'uso de document' },
  { padrao: /\bindexedDB\b/, descricao: 'uso de IndexedDB' },
  { padrao: /\bMath\.random\s*\(/, descricao: 'aleatoriedade não injetada' },
]

function listarArquivosTs(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name)
    if (entrada.isDirectory()) return listarArquivosTs(caminho)
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts') ? [caminho] : []
  })
}

describe('fronteira do nucleo', () => {
  const arquivos = listarArquivosTs(DIRETORIO_NUCLEO)

  it('encontra os arquivos do nucleo', () => {
    expect(arquivos.length).toBeGreaterThan(0)
  })

  it.each(arquivos)('%s nao viola a fronteira', (caminho) => {
    const conteudo = readFileSync(caminho, 'utf8')
    const violacoes = PROIBIDOS.filter(({ padrao }) => padrao.test(conteudo)).map(
      ({ descricao }) => descricao,
    )
    expect(violacoes).toEqual([])
  })
})

describe('fronteira de importacao e catalogo puro', () => {
  // CatalogoHttp é o adaptador HTTP que fala com o proxy/servidor (spec §5.3).
  // Os demais arquivos de importação e catálogo devem ser TypeScript puro sem I/O.
  const arquivosPuros = [
    ...listarArquivosTs(DIRETORIO_IMPORTACAO),
    ...listarArquivosTs(DIRETORIO_CATALOGO).filter((c) => !c.endsWith('CatalogoHttp.ts')),
  ]

  it('encontra os arquivos de importacao e catalogo puro', () => {
    expect(arquivosPuros.length).toBeGreaterThan(0)
  })

  it.each(arquivosPuros)('%s nao viola a fronteira de pureza', (caminho) => {
    const conteudo = readFileSync(caminho, 'utf8')
    const violacoes = PROIBIDOS.filter(({ padrao }) => padrao.test(conteudo)).map(
      ({ descricao }) => descricao,
    )
    expect(violacoes).toEqual([])
  })

  it('CatalogoHttp nao viola fronteiras de UI, 3D ou persistencia', () => {
    const caminhoHttp = join(DIRETORIO_CATALOGO, 'CatalogoHttp.ts')
    const conteudo = readFileSync(caminhoHttp, 'utf8')
    const proibidosParaHttp = PROIBIDOS.filter(({ descricao }) => descricao !== 'chamada de fetch')
    const violacoes = proibidosParaHttp
      .filter(({ padrao }) => padrao.test(conteudo))
      .map(({ descricao }) => descricao)
    expect(violacoes).toEqual([])
  })
})
