import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIRETORIO_NUCLEO = fileURLToPath(new URL('../src/nucleo', import.meta.url))

/**
 * O núcleo é TypeScript puro: nada de UI, 3D, rede ou API de navegador (spec §5.3).
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

function listarArquivosDoNucleo(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name)
    if (entrada.isDirectory()) return listarArquivosDoNucleo(caminho)
    return entrada.name.endsWith('.ts') ? [caminho] : []
  })
}

describe('fronteira do nucleo', () => {
  const arquivos = listarArquivosDoNucleo(DIRETORIO_NUCLEO)

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
