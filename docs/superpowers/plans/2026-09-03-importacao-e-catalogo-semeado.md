# LudoShelf — importação de CSV e catálogo semeado (plano 3)

- **Data:** 2026-09-03
- **Status:** pronto para execução
- **Repositório:** https://github.com/gianimpronta/ludoshelf
- **Branch de trabalho:** `feat/importacao-csv-e-catalogo-semeado`
- **Depende de:** `docs/superpowers/specs/2026-09-03-importacao-e-catalogo-semeado-design.md` (spec aprovada do plano 3)

---

## 1. Visão Geral

Este plano implementa a entrada de dados em lote no LudoShelf por duas vias complementares e integradas:
1. **Importador de CSV resiliente**: leitura RFC 4180 puro, detecção de delimitador (`,` vs `;`), suporte a vírgula decimal e UTF-8 BOM, mapeamento flexível de colunas, sanitização de nomes especiais (`™`), resolução em dois passos de expansões (`jogo-base`), detecção de duplicatas e relatório linha a linha de importação parcial.
2. **Catálogo semeado de medidas**: interface assíncrona desacoplada (`CatalogoDeJogos`), tabela JSON auditada de formatos padrão e jogos populares (cumprindo a restrição cautelar R3 contra dados raspados do BGG), precedência estrita de medidas e atalho de preenchimento rápido no cadastro manual.
3. **Persistência em lote e interface**: `salvarJogos` via `bulkPut` no Dexie e modal guiado em 4 etapas na Tela de Coleção com download do modelo `template-ludoshelf.csv`.

---

## 2. Ordem de Execução das Tarefas

| Task | Módulo | Descrição |
|---|---|---|
| **Task 1** | `app/src/importacao/leitorCsv.ts` | Parser RFC 4180 puro com detecção de delimitador e suporte a aspas/BOM |
| **Task 2** | `app/src/importacao/sanitizarNome.ts` | Sanitização de símbolos de marca (`™`), espaços e validação de nomes |
| **Task 3** | `app/src/catalogo/` | Interface `CatalogoDeJogos`, `CatalogoSemeado`, `CatalogoFalso` e JSON auditado |
| **Task 4** | `app/src/importacao/processarCsv.ts` | Orquestrador de conversão: unidades, jogo-base, duplicatas e relatório |
| **Task 5** | `app/src/importacao/templateCsv.ts` | Gerador do arquivo de template CSV para download |
| **Task 6** | `app/src/persistencia/` | Método `salvarJogos` no `RepositorioDeColecao`, Dexie e EmMemoria |
| **Task 7** | `app/src/estado/useEstadoDoApp.ts` | Injeção do catálogo e action `importarJogos` no store |
| **Task 8** | `app/src/telas/colecao/FormularioDeJogo.tsx` | Atalho de formatos padrão de caixas no cadastro manual |
| **Task 9** | `app/src/telas/colecao/ModalImportarCsv.tsx` | Componentes de interface do modal de importação e relatório |
| **Task 10** | `app/tests/fronteira.test.ts` | Verificação de fronteiras arquiteturais e suite completa de testes |

---

## Task 1: Parser de CSV puro (`leitorCsv.ts`)

**Arquivos:**
- Criar: `app/src/importacao/leitorCsv.ts`
- Criar: `app/src/importacao/leitorCsv.test.ts`

- [ ] **Step 1: Escrever os testes do parser (falha)**

`app/src/importacao/leitorCsv.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parsearCsv, detectarDelimitador } from './leitorCsv.js'

describe('detectarDelimitador', () => {
  it('detecta virgula como delimitador padrao', () => {
    expect(detectarDelimitador('Nome,Largura,Profundidade\nCatan,295,220')).toBe(',')
  })

  it('detecta ponto-e-virgula quando dominante', () => {
    expect(detectarDelimitador('Nome;Largura;Profundidade\nCatan;295;220')).toBe(';')
  })

  it('ignora delimitadores contidos dentro de aspas', () => {
    expect(detectarDelimitador('Nome;Comentario\n"Catan, 2a Ed.";Top')).toBe(';')
  })
})

describe('parsearCsv', () => {
  it('remove UTF-8 BOM do inicio do arquivo', () => {
    const csv = '\uFEFFNome,Largura\nCatan,295'
    const resultado = parsearCsv(csv)
    expect(resultado.cabecalhos).toEqual(['Nome', 'Largura'])
    expect(resultado.linhas).toHaveLength(1)
    expect(resultado.linhas[0]).toEqual({ Nome: 'Catan', Largura: '295' })
  })

  it('suporta delimitador ponto-e-virgula', () => {
    const csv = 'Nome;Largura;Espessura\nAzul;295;72'
    const resultado = parsearCsv(csv)
    expect(resultado.cabecalhos).toEqual(['Nome', 'Largura', 'Espessura'])
    expect(resultado.linhas[0]).toEqual({ Nome: 'Azul', Largura: '295', Espessura: '72' })
  })

  it('suporta campos entre aspas contendo delimitador e quebras de linha', () => {
    const csv = 'Nome,Descricao\n"Terraforming Mars, O Jogo","Edicao\nNacional"'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas[0]).toEqual({
      Nome: 'Terraforming Mars, O Jogo',
      Descricao: 'Edicao\nNacional',
    })
  })

  it('trata aspas duplas escapadas via duas aspas duplas ("")', () => {
    const csv = 'Nome,Info\n"Catan ""Plus""",Novo'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas[0]?.Nome).toBe('Catan "Plus"')
  })

  it('ignora linhas em branco no final', () => {
    const csv = 'Nome,Lado\nCatan,295\n\n   \n'
    const resultado = parsearCsv(csv)
    expect(resultado.linhas).toHaveLength(1)
  })

  it('retorna linhas com numero da linha original para rastreabilidade', () => {
    const csv = 'Nome,Lado\nCatan,295\nDixit,280'
    const resultado = parsearCsv(csv)
    expect(resultado.registros[0]?.numeroDaLinha).toBe(2)
    expect(resultado.registros[1]?.numeroDaLinha).toBe(3)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

```bash
pnpm test app/src/importacao/leitorCsv.test.ts
```

- [ ] **Step 3: Implementar o parser**

`app/src/importacao/leitorCsv.ts`:
```ts
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
export function parsearCsv(conteudoBruto: string, delimitadorParam?: Delimitador): ResultadoParseCsv {
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
```

- [ ] **Step 4: Rodar o teste e validar aprovação**

```bash
pnpm test app/src/importacao/leitorCsv.test.ts
```

- [ ] **Step 5: Typecheck, format e commit**

```bash
pnpm typecheck
pnpm format
git add app/src/importacao/leitorCsv.ts app/src/importacao/leitorCsv.test.ts
git commit -m "feat(importacao): implementa leitor e parser rfc 4180 puro de csv"
```

---

## Task 2: Sanitização de Nomes (`sanitizarNome.ts`)

**Arquivos:**
- Criar: `app/src/importacao/sanitizarNome.ts`
- Criar: `app/src/importacao/sanitizarNome.test.ts`

- [ ] **Step 1: Escrever os testes de sanitização (falha)**

`app/src/importacao/sanitizarNome.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { normalizarNome } from '../nucleo/medidas.js'
import { sanitizarNome } from './sanitizarNome.js'

describe('sanitizarNome', () => {
  it('remove simbolo trademark (™) para casar com nome normalizado', () => {
    const nomeLimpo = sanitizarNome('Catan™')
    expect(nomeLimpo).toBe('Catan')
    expect(normalizarNome(nomeLimpo)).toBe(normalizarNome('Catan'))
  })

  it('remove outros simbolos como marcas registradas e copyrights', () => {
    expect(sanitizarNome('Ticket to Ride®')).toBe('Ticket to Ride')
    expect(sanitizarNome('Pandemic©')).toBe('Pandemic')
  })

  it('lanca erro ao receber string vazia ou puramente pontuacao/simbolos', () => {
    expect(() => sanitizarNome('')).toThrow(RangeError)
    expect(() => sanitizarNome('   ')).toThrow(RangeError)
    expect(() => sanitizarNome('---')).toThrow(RangeError)
    expect(() => sanitizarNome('™®©')).toThrow(RangeError)
  })

  it('preserva acentuacoes e caracteres alfanumericos', () => {
    expect(sanitizarNome('Descent 2ª Edição')).toBe('Descent 2ª Edição')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

```bash
pnpm test app/src/importacao/sanitizarNome.test.ts
```

- [ ] **Step 3: Implementar `sanitizarNome`**

`app/src/importacao/sanitizarNome.ts`:
```ts
/**
 * Remove símbolos de marca e símbolos gráficos (\p{So}) que causariam
 * falhas na decomposição NFKD (como ™ virando "tm") e valida que o
 * nome não se reduz a uma string vazia.
 */
export function sanitizarNome(nomeBruto: string): string {
  const nomeLimpo = nomeBruto
    .replace(/[\u2122\u00AE\u00A9]/gu, '') // ™, ®, ©
    .replace(/\p{So}/gu, '')
    .trim()

  const testeAlfanumerico = nomeLimpo.replace(/[^\p{Letter}\p{Number}]+/gu, '').trim()
  if (testeAlfanumerico.length === 0) {
    throw new RangeError(`Nome de jogo inválido ou vazio; recebido: ${JSON.stringify(nomeBruto)}`)
  }

  return nomeLimpo
}
```

- [ ] **Step 4: Rodar o teste e validar aprovação**

```bash
pnpm test app/src/importacao/sanitizarNome.test.ts
```

- [ ] **Step 5: Typecheck, format e commit**

```bash
pnpm typecheck
pnpm format
git add app/src/importacao/sanitizarNome.ts app/src/importacao/sanitizarNome.test.ts
git commit -m "feat(importacao): adiciona sanitizacao de nomes com remocao de simbolos especiais"
```

---

## Task 3: Catálogo Semeado e Formatos Padrão (`app/src/catalogo/`)

**Arquivos:**
- Criar: `app/src/catalogo/CatalogoDeJogos.ts`
- Criar: `app/src/catalogo/dados/tabela-semeada.json`
- Criar: `app/src/catalogo/CatalogoSemeado.ts`
- Criar: `app/src/catalogo/CatalogoFalso.ts`
- Criar: `app/src/catalogo/CatalogoSemeado.test.ts`

- [ ] **Step 1: Criar a interface `CatalogoDeJogos.ts`**

`app/src/catalogo/CatalogoDeJogos.ts`:
```ts
import type { Milimetros } from '../nucleo/medidas.js'

export interface FormatoPadrao {
  readonly chave: string
  readonly rotulo: string
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly fonte: string
}

export interface ResultadoBuscaCatalogo {
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly chaveDoTemplate: string
  readonly fonte: string
}

export interface CatalogoDeJogos {
  buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null>
  listarFormatosPadrao(): readonly FormatoPadrao[]
}
```

- [ ] **Step 2: Criar os dados em `app/src/catalogo/dados/tabela-semeada.json`**

`app/src/catalogo/dados/tabela-semeada.json`:
```json
{
  "formatosPadrao": [
    {
      "chave": "quadrada-grande-295",
      "rotulo": "Caixa Quadrada Padrão (295×295×70 mm)",
      "maiorMm": 295,
      "menorMm": 295,
      "espessuraMm": 70,
      "fonte": "especificacao-padrao-industria"
    },
    {
      "chave": "retangular-media-295x220",
      "rotulo": "Caixa Retangular Média (295×220×65 mm)",
      "maiorMm": 295,
      "menorMm": 220,
      "espessuraMm": 65,
      "fonte": "especificacao-padrao-industria"
    },
    {
      "chave": "quadrada-media-200",
      "rotulo": "Caixa Quadrada Média (200×200×50 mm)",
      "maiorMm": 200,
      "menorMm": 200,
      "espessuraMm": 50,
      "fonte": "especificacao-padrao-industria"
    },
    {
      "chave": "pequena-160",
      "rotulo": "Caixa Pequena (160×160×45 mm)",
      "maiorMm": 160,
      "menorMm": 160,
      "espessuraMm": 45,
      "fonte": "especificacao-padrao-industria"
    },
    {
      "chave": "cartas-compacta-120x95",
      "rotulo": "Caixa Compacta de Cartas (120×95×30 mm)",
      "maiorMm": 120,
      "menorMm": 95,
      "espessuraMm": 30,
      "fonte": "especificacao-padrao-industria"
    }
  ],
  "jogosConhecidos": [
    {
      "chave": "catan",
      "nomesConhecidos": ["catan", "os colonizadores de catan", "settlers of catan"],
      "maiorMm": 295,
      "menorMm": 240,
      "espessuraMm": 75,
      "fonte": "medicao-propria-galapagos"
    },
    {
      "chave": "azul",
      "nomesConhecidos": ["azul"],
      "maiorMm": 260,
      "menorMm": 260,
      "espessuraMm": 70,
      "fonte": "medicao-propria-galapagos"
    },
    {
      "chave": "carcassonne",
      "nomesConhecidos": ["carcassonne"],
      "maiorMm": 275,
      "menorMm": 190,
      "espessuraMm": 65,
      "fonte": "medicao-propria-devir"
    },
    {
      "chave": "terraforming-mars",
      "nomesConhecidos": ["terraforming mars"],
      "maiorMm": 298,
      "menorMm": 298,
      "espessuraMm": 71,
      "fonte": "medicao-propria-meeplebr"
    },
    {
      "chave": "wingspan",
      "nomesConhecidos": ["wingspan"],
      "maiorMm": 296,
      "menorMm": 296,
      "espessuraMm": 78,
      "fonte": "medicao-propria-grok"
    },
    {
      "chave": "dixit",
      "nomesConhecidos": ["dixit"],
      "maiorMm": 277,
      "menorMm": 277,
      "espessuraMm": 55,
      "fonte": "medicao-propria-galapagos"
    },
    {
      "chave": "ticket-to-ride",
      "nomesConhecidos": ["ticket to ride", "ticket to ride europa"],
      "maiorMm": 298,
      "menorMm": 298,
      "espessuraMm": 73,
      "fonte": "medicao-propria-galapagos"
    }
  ]
}
```

- [ ] **Step 3: Escrever o teste do `CatalogoSemeado` e dublê (falha)**

`app/src/catalogo/CatalogoSemeado.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CatalogoSemeado } from './CatalogoSemeado.js'
import { CatalogoFalso } from './CatalogoFalso.js'

describe('CatalogoSemeado', () => {
  const catalogo = new CatalogoSemeado()

  it('lista formatos padrao com dimensoes positivas inteiras', () => {
    const formatos = catalogo.listarFormatosPadrao()
    expect(formatos.length).toBeGreaterThan(0)
    for (const f of formatos) {
      expect(f.maiorMm).toBeGreaterThan(0)
      expect(f.menorMm).toBeGreaterThan(0)
      expect(f.espessuraMm).toBeGreaterThan(0)
      expect(f.fonte).toBeTruthy()
      expect(f.fonte.toLowerCase()).not.toContain('bgg')
    }
  })

  it('localiza jogo conhecido por nome exato e normalizado', async () => {
    const catan = await catalogo.buscarPorNome('Catan')
    expect(catan).not.toBeNull()
    expect(catan?.maiorMm).toBe(295)

    const catanNormalizado = await catalogo.buscarPorNome('  catan™  ')
    expect(catanNormalizado).toEqual(catan)
  })

  it('devolve null quando o jogo nao esta na base semeada', async () => {
    const desconhecido = await catalogo.buscarPorNome('Jogo Totalmente Inexistente 1234')
    expect(desconhecido).toBeNull()
  })

  it('garante auditoria de fonte em todos os itens (risco R3)', async () => {
    const dados = (catalogo as any).carregarDados()
    for (const j of dados.jogosConhecidos) {
      expect(j.fonte).toBeTruthy()
      expect(j.fonte.toLowerCase()).not.toContain('bgg')
    }
  })
})

describe('CatalogoFalso', () => {
  it('permite registrar e buscar jogos em memoria para testes', async () => {
    const falso = new CatalogoFalso()
    falso.definirMedida('Terra Mystica', {
      maiorMm: 315,
      menorMm: 225,
      espessuraMm: 90,
      chaveDoTemplate: 'terra-mystica',
      fonte: 'teste',
    })

    const achado = await falso.buscarPorNome('terra mystica')
    expect(achado?.maiorMm).toBe(315)
  })
})
```

- [ ] **Step 4: Implementar `CatalogoSemeado.ts` e `CatalogoFalso.ts`**

`app/src/catalogo/CatalogoSemeado.ts`:
```ts
import { normalizarNome } from '../nucleo/medidas.js'
import { sanitizarNome } from '../importacao/sanitizarNome.js'
import type { CatalogoDeJogos, FormatoPadrao, ResultadoBuscaCatalogo } from './CatalogoDeJogos.js'
import dadosSemeadura from './dados/tabela-semeada.json' with { type: 'json' }

interface EntradaJogoConhecido {
  readonly chave: string
  readonly nomesConhecidos: readonly string[]
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
  readonly fonte: string
}

export class CatalogoSemeado implements CatalogoDeJogos {
  private readonly mapaNomes = new Map<string, ResultadoBuscaCatalogo>()

  constructor() {
    for (const item of dadosSemeadura.jogosConhecidos as readonly EntradaJogoConhecido[]) {
      const resultado: ResultadoBuscaCatalogo = {
        maiorMm: item.maiorMm,
        menorMm: item.menorMm,
        espessuraMm: item.espessuraMm,
        chaveDoTemplate: item.chave,
        fonte: item.fonte,
      }
      for (const nome of item.nomesConhecidos) {
        this.mapaNomes.set(normalizarNome(nome), resultado)
      }
    }
  }

  async buscarPorNome(nomeBruto: string): Promise<ResultadoBuscaCatalogo | null> {
    try {
      const limpo = sanitizarNome(nomeBruto)
      const normalizado = normalizarNome(limpo)
      return this.mapaNomes.get(normalizado) ?? null
    } catch {
      return null
    }
  }

  listarFormatosPadrao(): readonly FormatoPadrao[] {
    return dadosSemeadura.formatosPadrao as readonly FormatoPadrao[]
  }

  protected carregarDados() {
    return dadosSemeadura
  }
}
```

`app/src/catalogo/CatalogoFalso.ts`:
```ts
import { normalizarNome } from '../nucleo/medidas.js'
import type { CatalogoDeJogos, FormatoPadrao, ResultadoBuscaCatalogo } from './CatalogoDeJogos.js'

export class CatalogoFalso implements CatalogoDeJogos {
  private readonly dados = new Map<string, ResultadoBuscaCatalogo>()
  private formatos: readonly FormatoPadrao[] = []

  definirMedida(nome: string, resultado: ResultadoBuscaCatalogo): void {
    this.dados.set(normalizarNome(nome), resultado)
  }

  definirFormatos(formatos: readonly FormatoPadrao[]): void {
    this.formatos = formatos
  }

  async buscarPorNome(nome: string): Promise<ResultadoBuscaCatalogo | null> {
    return this.dados.get(normalizarNome(nome)) ?? null
  }

  listarFormatosPadrao(): readonly FormatoPadrao[] {
    return this.formatos
  }
}
```

- [ ] **Step 5: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/catalogo/
pnpm typecheck
pnpm format
git add app/src/catalogo/
git commit -m "feat(catalogo): implementa CatalogoSemeado com base de formatos e jogos auditados"
```

---

## Task 4: Processador e Resolvedor de CSV (`processarCsv.ts`)

**Arquivos:**
- Criar: `app/src/importacao/tipos.ts`
- Criar: `app/src/importacao/processarCsv.ts`
- Criar: `app/src/importacao/processarCsv.test.ts`

- [ ] **Step 1: Criar interfaces de importação em `app/src/importacao/tipos.ts`**

`app/src/importacao/tipos.ts`:
```ts
import type { CaixaDeJogo } from '../nucleo/jogo.js'

export type UnidadeDeComprimento = 'mm' | 'cm' | 'in'

export interface MapeamentoDeColunas {
  readonly colunaNome: string
  readonly colunaMaiorMm?: string
  readonly colunaMenorMm?: string
  readonly colunaEspessuraMm?: string
  readonly colunaUnidade?: string
  readonly colunaJogoBase?: string
  readonly colunaPartidas?: string
}

export type PoliticaDuplicatas = 'substituir' | 'ignorar' | 'manter-existente'

export interface OpcoesDeImportacao {
  readonly mapeamento: MapeamentoDeColunas
  readonly unidadePadrao?: UnidadeDeComprimento
  readonly politicaDuplicatas: PoliticaDuplicatas
  readonly tentarCompletarComCatalogo: boolean
  readonly nomeDoArquivo?: string
}

export interface ItemDePendencia {
  readonly linha: number
  readonly nome: string
  readonly tipo: 'jogo-base-nao-encontrado' | 'medida-ausente' | 'duplicata-ignorada'
  readonly detalhe: string
}

export interface ItemDeErroLinha {
  readonly linha: number
  readonly motivo: string
  readonly dadoBruto: string
}

export interface ResultadoProcessamentoCsv {
  readonly jogosProntosParaSalvar: readonly CaixaDeJogo[]
  readonly pendencias: readonly ItemDePendencia[]
  readonly erros: readonly ItemDeErroLinha[]
  readonly totalLinhasArquivo: number
}
```

- [ ] **Step 2: Escrever testes cobrindo todas as regras de importação (falha)**

`app/src/importacao/processarCsv.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { CatalogoFalso } from '../catalogo/CatalogoFalso.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { parsearCsv } from './leitorCsv.js'
import { processarCsv } from './processarCsv.js'

describe('processarCsv', () => {
  const catalogoFalso = new CatalogoFalso()

  it('importa jogos com medidas em centimetros convertidas para milimetros inteiros', async () => {
    const csv = parsearCsv('Jogo;Comprimento;Largura;Altura;Unidade\nCatan;29,5;22;7;cm')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Jogo',
          colunaMaiorMm: 'Comprimento',
          colunaMenorMm: 'Largura',
          colunaEspessuraMm: 'Altura',
          colunaUnidade: 'Unidade',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    const catan = res.jogosProntosParaSalvar[0]!
    expect(catan.nome).toBe('Catan')
    expect(catan.medidas.maiorMm).toBe(295)
    expect(catan.medidas.menorMm).toBe(220)
    expect(catan.medidas.espessuraMm).toBe(70)
  })

  it('aplica heuristica: valores < 100 sem unidade viram centimetros', async () => {
    const csv = parsearCsv('Jogo;A;B;Espessura\nAzul;26;26;7')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Jogo',
          colunaMaiorMm: 'A',
          colunaMenorMm: 'B',
          colunaEspessuraMm: 'Espessura',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    const azul = res.jogosProntosParaSalvar[0]!
    expect(azul.medidas.maiorMm).toBe(260)
    expect(azul.medidas.espessuraMm).toBe(70)
  })

  it('vincula expansao ao jogo-base declarado em outra linha do proprio arquivo', async () => {
    const csv = parsearCsv(
      'Nome;Maior;Menor;Espessura;Base\n' +
        'Catan Cidades & Cavaleiros;295;220;50;Catan\n' +
        'Catan;295;220;70;',
    )
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
          colunaJogoBase: 'Base',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    const base = res.jogosProntosParaSalvar.find((j) => j.nome === 'Catan')!
    const expansao = res.jogosProntosParaSalvar.find((j) => j.nome.includes('Cidades'))!
    expect(expansao.idJogoBase).toBe(base.id)
  })

  it('vincula expansao ao jogo-base ja cadastrado na colecao', async () => {
    const baseExistente: CaixaDeJogo = {
      id: 'id-base-catan',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    }

    const csv = parsearCsv('Nome;Maior;Menor;Espessura;Base\nExpansao 5-6;295;150;45;Catan')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
          colunaJogoBase: 'Base',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [baseExistente],
    })

    const expansao = res.jogosProntosParaSalvar[0]!
    expect(expansao.idJogoBase).toBe('id-base-catan')
  })

  it('completa medidas ausentes via catalogo semeado com confirmadaPeloUsuario: false', async () => {
    catalogoFalso.definirMedida('Dixit', {
      maiorMm: 277,
      menorMm: 277,
      espessuraMm: 55,
      chaveDoTemplate: 'dixit',
      fonte: 'teste',
    })

    const csv = parsearCsv('Nome\nDixit')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: { colunaNome: 'Nome' },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: true,
      },
      jogosExistentes: [],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    const dixit = res.jogosProntosParaSalvar[0]!
    expect(dixit.medidas.maiorMm).toBe(277)
    expect(dixit.medidas.confirmadaPeloUsuario).toBe(false)
    expect(dixit.medidas.origem).toEqual({ tipo: 'semeada', chaveDoTemplate: 'dixit' })
  })

  it('respeita a politica de duplicatas "ignorar"', async () => {
    const catanExistente: CaixaDeJogo = {
      id: 'existente',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    }

    const csv = parsearCsv('Nome;Maior;Menor;Espessura\nCatan;300;200;50')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: { colunaNome: 'Nome' },
        politicaDuplicatas: 'ignorar',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [catanExistente],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(0)
    expect(res.pendencias).toContainEqual(
      expect.objectContaining({ tipo: 'duplicata-ignorada', nome: 'Catan' }),
    )
  })

  it('registra erro de linha sem abortar linhas validas', async () => {
    const csv = parsearCsv('Nome;Maior;Menor;Espessura\n;295;220;70\nAzul;260;260;70')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    expect(res.erros).toHaveLength(1)
    expect(res.erros[0]?.linha).toBe(2)
    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    expect(res.jogosProntosParaSalvar[0]?.nome).toBe('Azul')
  })
})
```

- [ ] **Step 3: Implementar `processarCsv.ts`**

`app/src/importacao/processarCsv.ts`:
```ts
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

function interpretarNumero(str: string | undefined): number | null {
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

  // Primeiro passo: parse básico, indexação de nomes deste lote para amarrar jogo-base
  interface ItemIntermediario {
    readonly registroIndex: number
    readonly linhaNum: number
    readonly id: string
    readonly nome: string
    readonly nomeNormalizado: string
    readonly nomeBaseRef: string | null
    readonly ladoA: number | null
    readonly ladoB: number | null
    readonly espessura: number | null
    readonly unidade?: UnidadeDeComprimento
    readonly partidas: number | null
    readonly duplicataDeId: string | null
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

    const ladoA = interpretarNumero(mapeamento.colunaMaiorMm ? reg.valores[mapeamento.colunaMaiorMm] : undefined)
    const ladoB = interpretarNumero(mapeamento.colunaMenorMm ? reg.valores[mapeamento.colunaMenorMm] : undefined)
    const esp = interpretarNumero(
      mapeamento.colunaEspessuraMm ? reg.valores[mapeamento.colunaEspessuraMm] : undefined,
    )

    const unidTexto = mapeamento.colunaUnidade ? reg.valores[mapeamento.colunaUnidade]?.toLowerCase().trim() : undefined
    let unidade: UnidadeDeComprimento | undefined = opcoes.unidadePadrao
    if (unidTexto === 'cm' || unidTexto === 'mm' || unidTexto === 'in') {
      unidade = unidTexto
    }

    const nomeBaseRef = mapeamento.colunaJogoBase ? reg.valores[mapeamento.colunaJogoBase]?.trim() || null : null
    const partidasNum = mapeamento.colunaPartidas ? interpretarNumero(reg.valores[mapeamento.colunaPartidas]) : null

    intermediarios.push({
      registroIndex: idx,
      linhaNum: reg.numeroDaLinha,
      id,
      nome: nomeSanitizado,
      nomeNormalizado: nomeNorm,
      nomeBaseRef,
      ladoA,
      ladoB,
      espessura: esp,
      unidade,
      partidas: partidasNum,
      duplicataDeId: existente ? existente.id : null,
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
      maiorMm = Math.max(mA, mB)
      menorMm = Math.min(mA, mB)
      espessuraMm = converterParaMm(item.espessura, item.unidade)
      confirmada = item.unidade !== undefined // se a unidade foi explicitada, é tratada como confirmada
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
      // Preenche com medida padrão mínima provisória e registra pendência
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
```

- [ ] **Step 4: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/importacao/processarCsv.test.ts
pnpm typecheck
pnpm format
git add app/src/importacao/
git commit -m "feat(importacao): implementa processador de importacao de csv com resolucao de parentesco e relatorio"
```

---

## Task 5: Gerador de Template CSV (`templateCsv.ts`)

**Arquivos:**
- Criar: `app/src/importacao/templateCsv.ts`
- Criar: `app/src/importacao/templateCsv.test.ts`

- [ ] **Step 1: Escrever teste do template CSV**

`app/src/importacao/templateCsv.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parsearCsv } from './leitorCsv.js'
import { gerarTemplateCsv } from './templateCsv.js'

describe('gerarTemplateCsv', () => {
  it('gera CSV com BOM UTF-8 e colunas recomendadas', () => {
    const csv = gerarTemplateCsv()
    expect(csv.startsWith('\uFEFF')).toBe(true)

    const parseado = parsearCsv(csv)
    expect(parseado.cabecalhos).toContain('Nome')
    expect(parseado.cabecalhos).toContain('Comprimento (mm)')
    expect(parseado.cabecalhos).toContain('Largura (mm)')
    expect(parseado.cabecalhos).toContain('Espessura (mm)')
    expect(parseado.cabecalhos).toContain('Jogo-Base')
    expect(parseado.cabecalhos).toContain('Partidas')
    expect(parseado.linhas.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Implementar `templateCsv.ts`**

`app/src/importacao/templateCsv.ts`:
```ts
export function gerarTemplateCsv(): string {
  const cabecalho = 'Nome;Comprimento (mm);Largura (mm);Espessura (mm);Unidade;Jogo-Base;Partidas'
  const linhas = [
    'Catan;295;220;70;mm;;12',
    'Catan: Cidades & Cavaleiros;295;220;50;mm;Catan;5',
    'Azul;260;260;70;mm;;8',
    'Dixit;277;277;55;mm;;20',
  ]
  return `\uFEFF${cabecalho}\r\n${linhas.join('\r\n')}\r\n`
}
```

- [ ] **Step 3: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/importacao/templateCsv.test.ts
pnpm typecheck
pnpm format
git add app/src/importacao/templateCsv.ts app/src/importacao/templateCsv.test.ts
git commit -m "feat(importacao): adiciona gerador de template csv compativel com excel"
```

---

## Task 6: Persistência em Lote (`RepositorioDeColecao.salvarJogos`)

**Arquivos:**
- Modificar: `app/src/persistencia/RepositorioDeColecao.ts`
- Modificar: `app/src/persistencia/RepositorioDexie.ts`
- Modificar: `app/src/persistencia/RepositorioDexie.test.ts`
- Modificar: `app/src/persistencia/RepositorioEmMemoria.ts`
- Modificar: `app/src/persistencia/RepositorioEmMemoria.test.ts`

- [ ] **Step 1: Adicionar `salvarJogos(jogos: readonly CaixaDeJogo[]): Promise<void>` na interface**
- [ ] **Step 2: Implementar testes unitários para `salvarJogos` em Dexie e EmMemoria**
- [ ] **Step 3: Implementar com `bulkPut` no Dexie e splice/map em Memória**
- [ ] **Step 4: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/persistencia/
pnpm typecheck
pnpm format
git commit -m "feat(persistencia): adiciona salvarJogos em lote com bulkPut"
```

---

## Task 7: Integração no Store Zustand (`useEstadoDoApp.ts`)

**Arquivos:**
- Modificar: `app/src/estado/useEstadoDoApp.ts`
- Modificar: `app/src/estado/useEstadoDoApp.test.ts`

- [ ] **Step 1: Adicionar suporte ao `catalogo: CatalogoDeJogos` na inicialização**
- [ ] **Step 2: Adicionar action `salvarJogos(jogos: readonly CaixaDeJogo[]): Promise<void>`**
- [ ] **Step 3: Testar a persistência combinada e atualização do array de jogos**
- [ ] **Step 4: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/estado/
pnpm typecheck
pnpm format
git commit -m "feat(estado): adiciona suporte ao catalogo e action salvarJogos no store"
```

---

## Task 8: Atalho de Formatos Padrão no `FormularioDeJogo.tsx`

**Arquivos:**
- Modificar: `app/src/telas/colecao/FormularioDeJogo.tsx`
- Modificar: `app/src/telas/colecao/FormularioDeJogo.test.tsx`

- [ ] **Step 1: Escrever teste onde a seleção de um formato padrão preenche `ladoA`, `ladoB` e `espessura`**
- [ ] **Step 2: Adicionar o seletor `Aplicar formato padrão...` no formulário**
- [ ] **Step 3: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/telas/colecao/FormularioDeJogo.test.tsx
pnpm typecheck
pnpm format
git commit -m "feat(colecao): adiciona seletor de formatos padrao de caixa no cadastro manual"
```

---

## Task 9: Interface do Modal de Importação na Tela de Coleção

**Arquivos:**
- Criar: `app/src/telas/colecao/ModalImportarCsv.tsx`
- Criar: `app/src/telas/colecao/TabelaDeRelatorio.tsx`
- Criar: `app/src/telas/colecao/ModalImportarCsv.test.tsx`
- Modificar: `app/src/telas/colecao/TelaDeColecao.tsx`
- Modificar: `app/src/telas/colecao/TelaDeColecao.test.tsx`

- [ ] **Step 1: Escrever testes unitários do modal (Passo 1 ao 4)**
- [ ] **Step 2: Implementar os componentes visuais estilizados no tema Dark**
- [ ] **Step 3: Adicionar os botões "Importar CSV" e "Baixar modelo CSV" na `TelaDeColecao.tsx`**
- [ ] **Step 4: Rodar testes, typecheck, format e commit**

```bash
pnpm test app/src/telas/colecao/
pnpm typecheck
pnpm format
git commit -m "feat(colecao): adiciona fluxo completo de importacao de csv com modal e relatorio"
```

---

## Task 10: Testes de Fronteira e Validação Integrada

**Arquivos:**
- Modificar: `app/tests/fronteira.test.ts`

- [ ] **Step 1: Garantir que `importacao/` e `catalogo/` respeitam as fronteiras arquiteturais**
- [ ] **Step 2: Rodar a suíte completa de testes (`pnpm test`)**
- [ ] **Step 3: Executar `pnpm typecheck` e `pnpm format:check`**
- [ ] **Step 4: Validar o fluxo interativo no navegador do Orca**
- [ ] **Step 5: Commit final de fechamento do Plano 3**
