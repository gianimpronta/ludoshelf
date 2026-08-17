# Fundação e motor de arranjo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o monorepo e o motor de arranjo completo do LudoShelf — tipos de domínio, encaixe, pontuação, busca local e ordenação — verificado inteiramente por testes, sem UI e sem rede.

**Architecture:** Um pnpm workspace com o pacote `app/`. Dentro dele, `src/nucleo/` é TypeScript puro: nenhum import de React, Three.js, `fetch` ou APIs de navegador. O motor recebe caixas em milímetros e uma estante de compartimentos, e devolve posições. Toda aleatoriedade entra injetada por um `Gerador`, para que os testes sejam repetíveis.

**Tech Stack:** Node 24.18.1 · pnpm 11.3.0 · TypeScript 7.0.2 · Vitest 4.1.10 · Prettier 3.9.6

**Spec de origem:** [`docs/superpowers/specs/2026-08-16-ludoshelf-design.md`](../specs/2026-08-16-ludoshelf-design.md)

---

## Contexto que o executor precisa saber

**O problema não é empacotamento 3D.** A orientação é única — toda caixa fica em pé com a
lombada à frente — então cada jogo consome exatamente sua **espessura** na largura da
prateleira. A soma independe da ordem. Isso reduz tudo a *bin packing 1D com
compatibilidade item-prateleira*: um jogo só pode ir num compartimento se também couber na
altura e na profundidade dele.

**Três consequências que explicam decisões deste plano:**

1. A ordem dentro da prateleira não afeta o encaixe, então a ordenação alfabética é uma
   etapa de apresentação no fim, não uma restrição do otimizador.
2. O espaço livre de um compartimento é sempre contíguo (empurre tudo para a esquerda).
   Portanto "maximizar espaço livre" significa **concentrar a sobra em poucos
   compartimentos**, e é por isso que a pontuação soma os **quadrados** da sobra.
3. "Caber" é restrição dura e fica **fora** da função de pontuação: a busca local nunca
   gera movimento que desaloque um jogo, e sempre aceita movimento que aloque um
   desalocado.

**Convenções obrigatórias no código:**

- Unidade interna é **milímetro inteiro**, sempre. Conversão só nas bordas.
- Imports relativos terminam em `.js` (ESM puro; foi assim que a fundação foi verificada).
- Tipos são explícitos. `any` e função sem tipo são proibidos.
- Mensagens de exceção incluem o valor ofensor e o formato esperado.
- Funções de 4 a 20 linhas. Arquivo abaixo de 500 linhas.
- Dublês de teste são **classes nomeadas** (`GeradorFixo`), nunca stub inline.

---

## Estrutura de arquivos

Todos os caminhos são relativos à raiz do repositório `C:\Users\Gianpaolo\repo\ludoshelf`.

| Arquivo | Responsabilidade |
|---|---|
| `pnpm-workspace.yaml` | declara o pacote `app` |
| `package.json` | scripts `test`, `typecheck`, `format`; devDependencies |
| `vitest.config.ts` | `projects: ['app']` |
| `tsconfig.base.json` | opções estritas compartilhadas |
| `.prettierrc.json` | formatação |
| `app/package.json` | pacote `@ludoshelf/app` |
| `app/tsconfig.json` | estende a base |
| `app/src/nucleo/medidas.ts` | `Milimetros`, conversões, `normalizarNome` |
| `app/src/nucleo/jogo.ts` | `CaixaDeJogo`, `MedidasDaCaixa`, `SinalDeFrequencia`, `pesoDeFrequencia` |
| `app/src/nucleo/estante.ts` | `Compartimento`, `Estante`, `montarEstante` |
| `app/src/nucleo/gerador.ts` | interface `Gerador`, `geradorMulberry32`, `GeradorFixo` |
| `app/src/nucleo/encaixe.ts` | `encaixar` — compatibilidade e sub-orientação |
| `app/src/nucleo/familias.ts` | `agruparFamilias` |
| `app/src/nucleo/arranjo.ts` | `Arranjo`, `PosicaoDeJogo`, `JogoNaoAlocado`, `ContextoDeArranjo` |
| `app/src/nucleo/pontuacao.ts` | `conforto`, `pontuar`, `PESOS_PADRAO` |
| `app/src/nucleo/arranjoInicial.ts` | `montarArranjoInicial` — First-Fit Decreasing |
| `app/src/nucleo/buscaLocal.ts` | `melhorar` — subida de encosta |
| `app/src/nucleo/ordenacao.ts` | `ordenarParaExibicao` |
| `app/src/nucleo/motor.ts` | `arranjar` — orquestra as três etapas |
| `app/tests/fronteira.test.ts` | proíbe imports de React/Three/rede dentro de `nucleo/` |
| `app/tests/regressao.test.ts` | cenário fixo + semente fixa → pontuação conhecida |

---

## Task 1: Fundação do monorepo

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `vitest.config.ts`
- Create: `tsconfig.base.json`
- Create: `.prettierrc.json`
- Create: `app/package.json`
- Create: `app/tsconfig.json`
- Test: `app/src/nucleo/fundacao.test.ts` (removido na Task 2)

- [ ] **Step 1: Criar o arquivo de workspace**

`pnpm-workspace.yaml`:

```yaml
packages:
  - app
```

- [ ] **Step 2: Criar o `package.json` da raiz**

`package.json`:

```json
{
  "name": "ludoshelf",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p app/tsconfig.json",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@types/node": "^26.2.0",
    "prettier": "^3.9.6",
    "typescript": "^7.0.2",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 3: Criar a configuração do Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

// `projects` substituiu `workspace`, deprecado no Vitest 3.2. Com um pacote só
// isso parece exagero, mas o pacote `proxy` entra no plano 4 e a raiz já fica pronta.
export default defineConfig({
  test: {
    projects: ['app'],
  },
})
```

- [ ] **Step 4: Criar o tsconfig base**

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

- [ ] **Step 5: Criar o pacote `app`**

`app/package.json`:

```json
{
  "name": "@ludoshelf/app",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
```

`app/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: Criar a configuração do Prettier**

`.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

- [ ] **Step 7: Escrever o teste que prova que a fundação roda**

`app/src/nucleo/fundacao.test.ts`:

```ts
import { expect, it } from 'vitest'

it('a suite do pacote app executa', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 8: Instalar e rodar**

```bash
pnpm install
```

```bash
pnpm test
```

Esperado: `Test Files 1 passed (1)` e `Tests 1 passed (1)`.

- [ ] **Step 9: Verificar a checagem de tipos**

```bash
pnpm typecheck
```

Esperado: nenhuma saída e código de saída 0.

- [ ] **Step 10: Commit**

```bash
git add pnpm-workspace.yaml package.json vitest.config.ts tsconfig.base.json .prettierrc.json app pnpm-lock.yaml
git commit -m "chore: monta o workspace pnpm com TypeScript 7 e Vitest 4"
```

---

## Task 2: Milímetros e normalização de nome

**Files:**
- Create: `app/src/nucleo/medidas.ts`
- Create: `app/src/nucleo/medidas.test.ts`
- Delete: `app/src/nucleo/fundacao.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/medidas.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cmParaMm, exigirMedidaValida, normalizarNome, polegadasParaMm } from './medidas.js'

describe('cmParaMm', () => {
  it('converte centímetros para milímetros inteiros', () => {
    expect(cmParaMm(29.5)).toBe(295)
  })

  it('arredonda em vez de truncar', () => {
    expect(cmParaMm(7.26)).toBe(73)
  })

  it('recusa valor não positivo dizendo o valor recebido', () => {
    expect(() => cmParaMm(0)).toThrow(/recebido: 0/)
  })
})

describe('polegadasParaMm', () => {
  it('converte polegadas do BGG para milímetros', () => {
    expect(polegadasParaMm(11.61)).toBe(295)
  })

  it('recusa valor não positivo', () => {
    expect(() => polegadasParaMm(-1)).toThrow(/polegadas/)
  })
})

describe('normalizarNome', () => {
  it('remove acentos, pontuação e caixa', () => {
    expect(normalizarNome('Terra Mystica: Fogo & Gelo')).toBe('terra mystica fogo gelo')
  })

  it('normaliza edição nacional com acentos', () => {
    expect(normalizarNome('Ora et Labora — Edição Nacional')).toBe('ora et labora edicao nacional')
  })

  it('colapsa espaços repetidos e apara as pontas', () => {
    expect(normalizarNome('  Catan   ')).toBe('catan')
  })

  // Testes de equivalência: é isto que a função existe para fazer — casar a mesma
  // caixa vinda de duas fontes diferentes. Testar só a saída de uma entrada por vez
  // deixou passar o bug do indicador ordinal.
  it('casa indicador ordinal com a letra simples equivalente', () => {
    expect(normalizarNome('Descent 2ª Edição')).toBe(normalizarNome('Descent 2a Edicao'))
  })

  it('casa a mesma grafia com e sem acento e pontuação', () => {
    expect(normalizarNome('Ora et Labora — Edição Nacional')).toBe(
      normalizarNome('ora et labora edicao nacional'),
    )
  })
})

describe('exigirMedidaValida', () => {
  it('descreve o campo e o valor ofensor', () => {
    expect(() => exigirMedidaValida(Number.NaN, 'espessuraMm')).toThrow(
      /espessuraMm.*recebido: null/,
    )
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./medidas.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/medidas.ts`:

```ts
/** Toda medida do domínio é milímetro inteiro (spec §4, D9). */
export type Milimetros = number

const MM_POR_CM = 10
const MM_POR_POLEGADA = 25.4

/**
 * Falha se o valor não puder ser uma medida física.
 *
 * @example exigirMedidaValida(295, 'maiorMm')
 */
export function exigirMedidaValida(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError(
      `${campo} deve ser um número finito maior que zero; recebido: ${JSON.stringify(valor)}`,
    )
  }
}

/**
 * Converte centímetros para milímetros inteiros. Arredonda de propósito: o inteiro
 * é a garantia contra o falso "cabe por 0,2 mm".
 *
 * @example cmParaMm(29.5) // 295
 */
export function cmParaMm(centimetros: number): Milimetros {
  exigirMedidaValida(centimetros, 'centimetros')
  return Math.round(centimetros * MM_POR_CM)
}

/**
 * Converte polegadas para milímetros inteiros. O BGG devolve medidas em polegadas.
 *
 * @example polegadasParaMm(11.61) // 295
 */
export function polegadasParaMm(polegadas: number): Milimetros {
  exigirMedidaValida(polegadas, 'polegadas')
  return Math.round(polegadas * MM_POR_POLEGADA)
}

/**
 * Forma canônica de um nome para casamento entre fontes (spec S6): minúsculas,
 * sem acentos, sem pontuação, espaços colapsados.
 *
 * Usa NFKD e não NFD porque os indicadores ordinais `ª` e `º` não têm decomposição
 * canônica — só a de compatibilidade os reduz a `a` e `o`. Sem isso, "2ª edição" da
 * Ludopedia nunca casaria com "2a edicao" de uma planilha, e a falha seria silenciosa.
 *
 * @example normalizarNome('Descent 2ª Edição') // 'descent 2a edicao'
 */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
}
```

- [ ] **Step 4: Remover o teste de fundação, que já cumpriu o papel**

```bash
rm app/src/nucleo/fundacao.test.ts
```

- [ ] **Step 5: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 6: Commit**

```bash
git add -A app/src/nucleo
git commit -m "feat(nucleo): converte unidades para milimetro inteiro e normaliza nomes"
```

---

## Task 3: Tipos do jogo e peso de frequência

**Files:**
- Create: `app/src/nucleo/jogo.ts`
- Create: `app/src/nucleo/jogo.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/jogo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { criarMedidas, pesoDeFrequencia, PESO_DE_DESTAQUE } from './jogo.js'

describe('criarMedidas', () => {
  it('ordena os dois lados em maior e menor, independente da ordem recebida', () => {
    const medidas = criarMedidas(220, 300, 60, { tipo: 'manual' }, true)
    expect(medidas.maiorMm).toBe(300)
    expect(medidas.menorMm).toBe(220)
  })

  it('preserva a espessura, que nunca disputa com os outros lados', () => {
    const medidas = criarMedidas(295, 295, 72, { tipo: 'manual' }, true)
    expect(medidas.espessuraMm).toBe(72)
  })

  it('recusa medida inválida citando o campo', () => {
    expect(() => criarMedidas(295, 295, 0, { tipo: 'manual' }, true)).toThrow(/espessuraMm/)
  })
})

describe('pesoDeFrequencia', () => {
  it('trata desconhecida como zero', () => {
    expect(pesoDeFrequencia({ tipo: 'desconhecida' })).toBe(0)
  })

  it('usa a quantidade de partidas', () => {
    expect(pesoDeFrequencia({ tipo: 'partidas', quantidade: 12 })).toBe(12)
  })

  it('trata destaque como prioridade fixa, não como estatística', () => {
    expect(pesoDeFrequencia({ tipo: 'destaque', marcadoPeloUsuario: true })).toBe(PESO_DE_DESTAQUE)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./jogo.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/jogo.ts`:

```ts
import { exigirMedidaValida, type Milimetros } from './medidas.js'

export type IdJogo = string

/** De onde veio a medida. Existe porque a cobertura é irregular (spec §6.1). */
export type OrigemDaMedida =
  | { readonly tipo: 'manual' }
  | { readonly tipo: 'semeada'; readonly chaveDoTemplate: string }
  | { readonly tipo: 'planilha'; readonly arquivo: string; readonly linha: number }
  | { readonly tipo: 'bgg'; readonly idVersao: number; readonly obtidoEm: string }

export interface MedidasDaCaixa {
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly origem: OrigemDaMedida
  readonly confirmadaPeloUsuario: boolean
}

/** `desconhecida` é distinto de zero partidas: um é ausência de dado, o outro é dado. */
export type SinalDeFrequencia =
  | { readonly tipo: 'desconhecida' }
  | { readonly tipo: 'partidas'; readonly quantidade: number }
  | { readonly tipo: 'destaque'; readonly marcadoPeloUsuario: true }

export interface CaixaDeJogo {
  readonly id: IdJogo
  readonly nome: string
  readonly medidas: MedidasDaCaixa
  readonly idJogoBase: IdJogo | null
  readonly frequencia: SinalDeFrequencia
  readonly idLudopedia: number | null
  readonly idBgg: number | null
}

/** Marcar destaque é declaração de prioridade, não estatística (spec S5). */
export const PESO_DE_DESTAQUE = 20

/**
 * Única porta de entrada de medidas: garante `maiorMm >= menorMm`, invariante do
 * qual todo o cálculo de encaixe depende.
 *
 * @example criarMedidas(220, 300, 60, { tipo: 'manual' }, true).maiorMm // 300
 */
export function criarMedidas(
  ladoA: Milimetros,
  ladoB: Milimetros,
  espessuraMm: Milimetros,
  origem: OrigemDaMedida,
  confirmadaPeloUsuario: boolean,
): MedidasDaCaixa {
  exigirMedidaValida(ladoA, 'ladoA')
  exigirMedidaValida(ladoB, 'ladoB')
  exigirMedidaValida(espessuraMm, 'espessuraMm')
  return {
    maiorMm: Math.max(ladoA, ladoB),
    menorMm: Math.min(ladoA, ladoB),
    espessuraMm,
    origem,
    confirmadaPeloUsuario,
  }
}

/** Converte o sinal de frequência no número que a pontuação usa. */
export function pesoDeFrequencia(sinal: SinalDeFrequencia): number {
  switch (sinal.tipo) {
    case 'desconhecida':
      return 0
    case 'partidas':
      return sinal.quantidade
    case 'destaque':
      return PESO_DE_DESTAQUE
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/jogo.ts app/src/nucleo/jogo.test.ts
git commit -m "feat(nucleo): define a caixa de jogo e o peso de frequencia"
```

---

## Task 4: Estante e derivação da altura da base

**Files:**
- Create: `app/src/nucleo/estante.ts`
- Create: `app/src/nucleo/estante.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/estante.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarEstante } from './estante.js'

const definicaoBase = {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350, 300],
}

describe('montarEstante', () => {
  it('cria um compartimento por altura livre informada', () => {
    expect(montarEstante('e1', definicaoBase).compartimentos).toHaveLength(3)
  })

  it('acumula a altura da base de baixo para cima somando prateleira e vao', () => {
    const bases = montarEstante('e1', definicaoBase).compartimentos.map((c) => c.alturaDaBaseMm)
    expect(bases).toEqual([80, 448, 816])
  })

  it('replica largura e profundidade em todos os compartimentos', () => {
    const primeiro = montarEstante('e1', definicaoBase).compartimentos[0]
    expect(primeiro?.larguraUtilMm).toBe(760)
    expect(primeiro?.profundidadeUtilMm).toBe(280)
  })

  it('gera identificadores estaveis e previsiveis', () => {
    const ids = montarEstante('e1', definicaoBase).compartimentos.map((c) => c.id)
    expect(ids).toEqual(['e1-p0', 'e1-p1', 'e1-p2'])
  })

  // Sem esta asserção, gravar alturaDoRodapeMm no lugar de alturaUtilMm passaria
  // pelos outros cinco testes sem ninguém perceber.
  it('carrega a altura livre de cada prateleira no compartimento certo', () => {
    const alturas = montarEstante('e1', definicaoBase).compartimentos.map((c) => c.alturaUtilMm)
    expect(alturas).toEqual([350, 350, 300])
  })

  it('recusa estante sem prateleira nenhuma', () => {
    const vazia = { ...definicaoBase, alturasLivresMm: [] }
    expect(() => montarEstante('e1', vazia)).toThrow(/ao menos uma prateleira/)
  })

  it('aceita rodape zero, que e uma estante encostada no chao', () => {
    const noChao = { ...definicaoBase, alturaDoRodapeMm: 0 }
    expect(montarEstante('e1', noChao).compartimentos[0]?.alturaDaBaseMm).toBe(0)
  })

  it('recusa altura livre nao finita citando o indice', () => {
    const suja = { ...definicaoBase, alturasLivresMm: [350, Number.NaN, 300] }
    expect(() => montarEstante('e1', suja)).toThrow(/alturasLivresMm\[1\]/)
  })

  it('recusa rodape negativo', () => {
    const invertida = { ...definicaoBase, alturaDoRodapeMm: -10 }
    expect(() => montarEstante('e1', invertida)).toThrow(/alturaDoRodapeMm.*recebido: -10/)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./estante.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/estante.ts`:

Antes, acrescente ao final de `app/src/nucleo/medidas.ts` a guarda que aceita zero —
`exigirMedidaValida` exige `> 0`, e rodapé zero é uma estante encostada no chão:

```ts
/**
 * Falha se o valor não puder ser uma distância. Diferente de `exigirMedidaValida`,
 * aceita zero: rodapé zero é uma estante encostada no chão, que é real.
 *
 * @example exigirDistanciaValida(0, 'alturaDoRodapeMm')
 */
export function exigirDistanciaValida(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new RangeError(
      `${campo} deve ser um número finito não negativo; recebido: ${JSON.stringify(valor)}`,
    )
  }
}
```

Com dois testes em `medidas.test.ts`: aceita zero, e recusa negativo citando campo e valor.

`app/src/nucleo/estante.ts`:

```ts
import { exigirDistanciaValida, exigirMedidaValida, type Milimetros } from './medidas.js'

/**
 * Um espaço fechado onde caixas podem ser postas. Prateleira corrida é o caso em que
 * cada compartimento ocupa a largura inteira; nichos tipo Kallax, quando chegarem,
 * são apenas compartimentos menores. O motor não distingue os dois (spec §6.2).
 */
export interface Compartimento {
  readonly id: string
  readonly larguraUtilMm: Milimetros
  readonly alturaUtilMm: Milimetros
  readonly profundidadeUtilMm: Milimetros
  /** Do chão até a base deste compartimento. Alimenta o critério "altura dos olhos". */
  readonly alturaDaBaseMm: Milimetros
}

export interface Estante {
  readonly id: string
  readonly nome: string
  readonly alturaDoRodapeMm: Milimetros
  readonly espessuraDaPrateleiraMm: Milimetros
  readonly compartimentos: readonly Compartimento[]
}

/** O que a tela de Estantes coleta do usuário. */
export interface DefinicaoDeEstante {
  readonly nome: string
  readonly larguraUtilMm: Milimetros
  readonly profundidadeUtilMm: Milimetros
  readonly alturaDoRodapeMm: Milimetros
  readonly espessuraDaPrateleiraMm: Milimetros
  /** Alturas livres de baixo para cima. */
  readonly alturasLivresMm: readonly Milimetros[]
}

/**
 * Deriva os compartimentos acumulando a altura da base de baixo para cima:
 * base[0] = rodapé; base[i] = base[i-1] + altura livre[i-1] + espessura da prateleira.
 *
 * @example montarEstante('e1', def).compartimentos[1].alturaDaBaseMm // 448
 */
export function montarEstante(id: string, definicao: DefinicaoDeEstante): Estante {
  if (definicao.alturasLivresMm.length === 0) {
    throw new RangeError(
      `estante "${definicao.nome}" precisa de ao menos uma prateleira; ` +
        `recebido alturasLivresMm: []`,
    )
  }
  validarDefinicao(definicao)
  return {
    id,
    nome: definicao.nome,
    alturaDoRodapeMm: definicao.alturaDoRodapeMm,
    espessuraDaPrateleiraMm: definicao.espessuraDaPrateleiraMm,
    compartimentos: derivarCompartimentos(id, definicao),
  }
}

/**
 * Valida na entrada porque `alturaDaBaseMm` é um acumulador: um valor inválido em
 * qualquer prateleira se propaga para todas as de cima, e o sintoma só apareceria
 * lá na frente, no critério "altura dos olhos", longe da causa.
 */
function validarDefinicao(definicao: DefinicaoDeEstante): void {
  exigirMedidaValida(definicao.larguraUtilMm, 'larguraUtilMm')
  exigirMedidaValida(definicao.profundidadeUtilMm, 'profundidadeUtilMm')
  exigirDistanciaValida(definicao.alturaDoRodapeMm, 'alturaDoRodapeMm')
  exigirDistanciaValida(definicao.espessuraDaPrateleiraMm, 'espessuraDaPrateleiraMm')
  definicao.alturasLivresMm.forEach((altura, indice) =>
    exigirMedidaValida(altura, `alturasLivresMm[${indice}]`),
  )
}

function derivarCompartimentos(
  idEstante: string,
  definicao: DefinicaoDeEstante,
): readonly Compartimento[] {
  const compartimentos: Compartimento[] = []
  let alturaDaBaseMm = definicao.alturaDoRodapeMm
  for (const [indice, alturaUtilMm] of definicao.alturasLivresMm.entries()) {
    compartimentos.push({
      id: `${idEstante}-p${indice}`,
      larguraUtilMm: definicao.larguraUtilMm,
      alturaUtilMm,
      profundidadeUtilMm: definicao.profundidadeUtilMm,
      alturaDaBaseMm,
    })
    alturaDaBaseMm += alturaUtilMm + definicao.espessuraDaPrateleiraMm
  }
  return compartimentos
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/estante.ts app/src/nucleo/estante.test.ts
git commit -m "feat(nucleo): deriva compartimentos e altura da base a partir da estante"
```

---

## Task 5: Gerador aleatório injetável

**Files:**
- Create: `app/src/nucleo/gerador.ts`
- Create: `app/src/nucleo/gerador.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/gerador.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { GeradorFixo, geradorMulberry32, sortearIndice } from './gerador.js'

describe('geradorMulberry32', () => {
  it('produz a mesma sequencia para a mesma semente', () => {
    const a = geradorMulberry32(42)
    const b = geradorMulberry32(42)
    expect([a.proximo(), a.proximo()]).toEqual([b.proximo(), b.proximo()])
  })

  it('produz sequencias diferentes para sementes diferentes', () => {
    expect(geradorMulberry32(1).proximo()).not.toBe(geradorMulberry32(2).proximo())
  })

  it('mantem os valores dentro de [0, 1)', () => {
    const gerador = geradorMulberry32(7)
    for (let i = 0; i < 200; i += 1) {
      const valor = gerador.proximo()
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(1)
    }
  })
})

describe('GeradorFixo', () => {
  it('devolve a sequencia informada e depois recomeca', () => {
    const gerador = new GeradorFixo([0.1, 0.9])
    expect([gerador.proximo(), gerador.proximo(), gerador.proximo()]).toEqual([0.1, 0.9, 0.1])
  })

  it('recusa sequencia vazia', () => {
    expect(() => new GeradorFixo([])).toThrow(/recebido: \[\]/)
  })
})

describe('sortearIndice', () => {
  it('mapeia o sorteio para um indice valido', () => {
    expect(sortearIndice(new GeradorFixo([0.0]), 5)).toBe(0)
    expect(sortearIndice(new GeradorFixo([0.999]), 5)).toBe(4)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./gerador.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/gerador.ts`:

```ts
/**
 * Fonte de aleatoriedade da busca local. É injetada, e nunca `Math.random`, porque
 * sem repetibilidade não há como afirmar que uma mudança melhorou o arranjo.
 */
export interface Gerador {
  /** Próximo número em [0, 1). */
  proximo(): number
}

/**
 * mulberry32: PRNG determinístico de 32 bits, curto e de qualidade suficiente para
 * busca local. Não serve para criptografia.
 *
 * @example geradorMulberry32(42).proximo()
 */
export function geradorMulberry32(semente: number): Gerador {
  let estado = semente >>> 0
  return {
    proximo(): number {
      estado = (estado + 0x6d2b79f5) >>> 0
      let valor = estado
      valor = Math.imul(valor ^ (valor >>> 15), valor | 1)
      valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61)
      return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296
    },
  }
}

/** Dublê nomeado para testes: repete ciclicamente a sequência informada. */
export class GeradorFixo implements Gerador {
  private indice = 0

  constructor(private readonly sequencia: readonly number[]) {
    if (sequencia.length === 0) {
      throw new RangeError('GeradorFixo precisa de ao menos um valor; recebido: []')
    }
  }

  proximo(): number {
    const valor = this.sequencia[this.indice % this.sequencia.length]
    this.indice += 1
    return valor as number
  }
}

/**
 * Sorteia um índice em [0, tamanho).
 *
 * @example sortearIndice(gerador, 5) // 0..4
 */
export function sortearIndice(gerador: Gerador, tamanho: number): number {
  if (tamanho <= 0) {
    throw new RangeError(`tamanho deve ser maior que zero; recebido: ${tamanho}`)
  }
  return Math.min(tamanho - 1, Math.floor(gerador.proximo() * tamanho))
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/gerador.ts app/src/nucleo/gerador.test.ts
git commit -m "feat(nucleo): injeta aleatoriedade deterministica na busca local"
```

---

## Task 6: Encaixe e sub-orientação

Esta é a regra física do sistema. Um jogo cabe num compartimento se a **espessura** couber
na largura e se uma das duas poses couber em altura e profundidade:

- **retrato** (padrão): `maiorMm` na vertical, `menorMm` na profundidade
- **paisagem** (alternativa): `menorMm` na vertical, `maiorMm` na profundidade

O motor usa retrato sempre que ela couber e só recorre a paisagem quando retrato não cabe
na altura, para não produzir caixas deitadas de lado por ganho marginal (spec S1).

**Files:**
- Create: `app/src/nucleo/encaixe.ts`
- Create: `app/src/nucleo/encaixe.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/encaixe.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { encaixar } from './encaixe.js'
import { criarMedidas } from './jogo.js'
import type { Compartimento } from './estante.js'

const prateleira = (alturaUtilMm: number, profundidadeUtilMm = 320): Compartimento => ({
  id: 'c1',
  larguraUtilMm: 760,
  alturaUtilMm,
  profundidadeUtilMm,
  alturaDaBaseMm: 400,
})

const manual = { tipo: 'manual' } as const

describe('encaixar', () => {
  it('usa retrato quando a maior dimensao cabe na altura', () => {
    const medidas = criarMedidas(295, 295, 72, manual, true)
    expect(encaixar(medidas, prateleira(350))).toEqual({ cabe: true, apoio: 'retrato' })
  })

  it('vira para paisagem quando retrato nao cabe na altura mas paisagem cabe', () => {
    // Caso da spec §11: 300x220x60 numa prateleira de 250 mm de altura.
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(250))).toEqual({ cabe: true, apoio: 'paisagem' })
  })

  it('prefere retrato mesmo quando paisagem tambem caberia', () => {
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(400))).toEqual({ cabe: true, apoio: 'retrato' })
  })

  it('recusa por largura quando a espessura excede a prateleira', () => {
    const medidas = criarMedidas(295, 295, 800, manual, true)
    expect(encaixar(medidas, prateleira(350))).toEqual({
      cabe: false,
      motivo: 'largo-demais',
      faltaMm: 40,
    })
  })

  it('recusa por altura quando nem a menor dimensao cabe em pe', () => {
    const medidas = criarMedidas(400, 300, 70, manual, true)
    expect(encaixar(medidas, prateleira(250))).toEqual({
      cabe: false,
      motivo: 'alto-demais',
      faltaMm: 50,
    })
  })

  it('recusa por profundidade quando so a paisagem caberia mas a caixa e funda', () => {
    const medidas = criarMedidas(300, 220, 60, manual, true)
    expect(encaixar(medidas, prateleira(250, 280))).toEqual({
      cabe: false,
      motivo: 'fundo-demais',
      faltaMm: 20,
    })
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./encaixe.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/encaixe.ts`:

```ts
import type { Compartimento } from './estante.js'
import type { MedidasDaCaixa } from './jogo.js'
import type { Milimetros } from './medidas.js'

/** Como a caixa fica em pé: `maiorMm` na vertical ou `menorMm` na vertical. */
export type Apoio = 'retrato' | 'paisagem'

export type MotivoDeRecusa = 'alto-demais' | 'fundo-demais' | 'largo-demais'

export type ResultadoDeEncaixe =
  | { readonly cabe: true; readonly apoio: Apoio }
  | { readonly cabe: false; readonly motivo: MotivoDeRecusa; readonly faltaMm: Milimetros }

/**
 * Decide se a caixa cabe no compartimento e em que pose, ou por que não cabe.
 * O `faltaMm` da recusa é o que permite a UI dizer "faltam 41 mm" em vez de "não coube".
 *
 * @example encaixar(criarMedidas(300, 220, 60, origem, true), prateleira250)
 *          // { cabe: true, apoio: 'paisagem' }
 */
export function encaixar(medidas: MedidasDaCaixa, compartimento: Compartimento): ResultadoDeEncaixe {
  if (medidas.espessuraMm > compartimento.larguraUtilMm) {
    return recusa('largo-demais', medidas.espessuraMm - compartimento.larguraUtilMm)
  }
  if (cabeEmRetrato(medidas, compartimento)) {
    return { cabe: true, apoio: 'retrato' }
  }
  if (cabeEmPaisagem(medidas, compartimento)) {
    return { cabe: true, apoio: 'paisagem' }
  }
  return diagnosticarRecusa(medidas, compartimento)
}

function cabeEmRetrato(medidas: MedidasDaCaixa, compartimento: Compartimento): boolean {
  return (
    medidas.maiorMm <= compartimento.alturaUtilMm &&
    medidas.menorMm <= compartimento.profundidadeUtilMm
  )
}

function cabeEmPaisagem(medidas: MedidasDaCaixa, compartimento: Compartimento): boolean {
  return (
    medidas.menorMm <= compartimento.alturaUtilMm &&
    medidas.maiorMm <= compartimento.profundidadeUtilMm
  )
}

/**
 * Chega aqui só quando nenhuma pose serve. Se nem a menor dimensão cabe na altura,
 * o problema é altura. Caso contrário sobrou profundidade, e o que falta é a
 * dimensão que teria de entrar no fundo na única pose viável em altura.
 */
function diagnosticarRecusa(
  medidas: MedidasDaCaixa,
  compartimento: Compartimento,
): ResultadoDeEncaixe {
  if (medidas.menorMm > compartimento.alturaUtilMm) {
    return recusa('alto-demais', medidas.menorMm - compartimento.alturaUtilMm)
  }
  const fundoNecessarioMm =
    medidas.maiorMm <= compartimento.alturaUtilMm ? medidas.menorMm : medidas.maiorMm
  return recusa('fundo-demais', fundoNecessarioMm - compartimento.profundidadeUtilMm)
}

function recusa(motivo: MotivoDeRecusa, faltaMm: Milimetros): ResultadoDeEncaixe {
  return { cabe: false, motivo, faltaMm }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/encaixe.ts app/src/nucleo/encaixe.test.ts
git commit -m "feat(nucleo): decide encaixe e sub-orientacao com diagnostico de recusa"
```

---

## Task 7: Agrupamento de famílias

Uma família é um jogo-base com ao menos uma expansão. Jogo solto não forma família, porque
não há o que dividir — e a penalidade da pontuação conta *famílias divididas*.

**Files:**
- Create: `app/src/nucleo/familias.ts`
- Create: `app/src/nucleo/familias.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/familias.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { agruparFamilias } from './familias.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'

const jogo = (id: string, nome: string, idJogoBase: string | null): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 295, 70, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('agruparFamilias', () => {
  it('agrupa o base com suas expansoes', () => {
    const familias = agruparFamilias([
      jogo('a', 'Catan', null),
      jogo('b', 'Catan: Navegadores', 'a'),
      jogo('c', 'Catan: Cidades', 'a'),
    ])
    expect(familias).toEqual([{ idBase: 'a', membros: ['a', 'b', 'c'] }])
  })

  it('poe o base na primeira posicao', () => {
    const familias = agruparFamilias([
      jogo('b', 'Catan: Navegadores', 'a'),
      jogo('a', 'Catan', null),
    ])
    expect(familias[0]?.membros[0]).toBe('a')
  })

  it('ignora jogo solto, que nao forma familia', () => {
    expect(agruparFamilias([jogo('a', 'Azul', null)])).toEqual([])
  })

  it('ignora expansao cujo base nao esta na colecao', () => {
    expect(agruparFamilias([jogo('b', 'Expansao orfa', 'inexistente')])).toEqual([])
  })

  // Dados sujos vindos de importacao: sem estas guardas o agrupamento sai errado
  // em silencio — nada lanca, nenhum teste fica vermelho, so a pontuacao fica torta.
  it('ignora jogo que aponta para si mesmo', () => {
    expect(agruparFamilias([jogo('a', 'Auto-referente', 'a')])).toEqual([])
  })

  it('nao cria familias sobrepostas quando dois jogos se apontam mutuamente', () => {
    const familias = agruparFamilias([jogo('a', 'Um', 'b'), jogo('b', 'Outro', 'a')])
    expect(familias).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./familias.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/familias.ts`:

```ts
import type { CaixaDeJogo, IdJogo } from './jogo.js'

/** Jogo-base mais suas expansões. O base é sempre o primeiro membro. */
export interface Familia {
  readonly idBase: IdJogo
  readonly membros: readonly IdJogo[]
}

/**
 * Agrupa jogos-base com suas expansões. Só devolve grupos de dois ou mais: um jogo
 * solto não pode ser "dividido", então não interessa à penalidade de família (spec §7.4).
 *
 * @example agruparFamilias(jogos) // [{ idBase: 'a', membros: ['a', 'b'] }]
 */
export function agruparFamilias(jogos: readonly CaixaDeJogo[]): readonly Familia[] {
  const idsPresentes = new Set(jogos.map((jogo) => jogo.id))
  const expansoesPorBase = new Map<IdJogo, IdJogo[]>()

  for (const jogo of jogos) {
    if (jogo.idJogoBase === null || !idsPresentes.has(jogo.idJogoBase)) continue
    const irmas = expansoesPorBase.get(jogo.idJogoBase) ?? []
    irmas.push(jogo.id)
    expansoesPorBase.set(jogo.idJogoBase, irmas)
  }

  // `idJogoBase === null` é o que impede auto-referência e ciclo: quem já é expansão
  // nunca vira base. Sem isso, `a→b` com `b→a` produziria duas famílias sobrepostas,
  // e `a→a` produziria uma família com o membro repetido — os dois em silêncio.
  return jogos
    .filter((jogo) => jogo.idJogoBase === null && expansoesPorBase.has(jogo.id))
    .map((base) => ({
      idBase: base.id,
      membros: [base.id, ...(expansoesPorBase.get(base.id) ?? [])],
    }))
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/familias.ts app/src/nucleo/familias.test.ts
git commit -m "feat(nucleo): agrupa jogo-base com suas expansoes"
```

---

## Task 8: Tipos do arranjo e contexto

**Files:**
- Create: `app/src/nucleo/arranjo.ts`
- Create: `app/src/nucleo/arranjo.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/arranjo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350],
})

const jogo = (id: string, idJogoBase: string | null): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('montarContexto', () => {
  it('indexa os jogos por id', () => {
    const ctx = montarContexto([jogo('a', null)], estante)
    expect(ctx.jogosPorId.get('a')?.id).toBe('a')
  })

  it('indexa os compartimentos por id', () => {
    const ctx = montarContexto([], estante)
    expect([...ctx.compartimentosPorId.keys()]).toEqual(['e1-p0', 'e1-p1'])
  })

  it('calcula as familias uma unica vez', () => {
    const ctx = montarContexto([jogo('a', null), jogo('b', 'a')], estante)
    expect(ctx.familias).toEqual([{ idBase: 'a', membros: ['a', 'b'] }])
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./arranjo.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/arranjo.ts`:

```ts
import type { Apoio, MotivoDeRecusa } from './encaixe.js'
import type { Compartimento, Estante } from './estante.js'
import { agruparFamilias, type Familia } from './familias.js'
import type { CaixaDeJogo, IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

export interface PosicaoDeJogo {
  readonly idJogo: IdJogo
  readonly idCompartimento: string
  /** A partir da borda esquerda do compartimento. */
  readonly deslocamentoXMm: Milimetros
  readonly apoio: Apoio
}

/** `sem-espaco` significa que a caixa caberia nas dimensões, mas não sobrou largura. */
export type MotivoDeNaoAlocacao = MotivoDeRecusa | 'sem-espaco'

export interface JogoNaoAlocado {
  readonly idJogo: IdJogo
  readonly motivo: MotivoDeNaoAlocacao
  readonly faltaMm: Milimetros
}

export interface Pontuacao {
  readonly total: number
  readonly porTermo: Readonly<Record<'sobraConcentrada' | 'familiaDividida' | 'alturaDosOlhos', number>>
}

export interface Arranjo {
  readonly posicoes: readonly PosicaoDeJogo[]
  readonly naoAlocados: readonly JogoNaoAlocado[]
  readonly pontuacao: Pontuacao
}

/** Índices derivados uma vez e reusados em cada iteração da busca local. */
export interface ContextoDeArranjo {
  readonly jogosPorId: ReadonlyMap<IdJogo, CaixaDeJogo>
  readonly compartimentosPorId: ReadonlyMap<string, Compartimento>
  readonly compartimentos: readonly Compartimento[]
  readonly familias: readonly Familia[]
}

/**
 * Constrói os índices usados pelo motor. Fazer isso uma vez, e não a cada iteração,
 * é o que mantém a busca local barata.
 *
 * @example montarContexto(jogos, estante).jogosPorId.get('a')
 */
export function montarContexto(
  jogos: readonly CaixaDeJogo[],
  estante: Estante,
): ContextoDeArranjo {
  return {
    jogosPorId: new Map(jogos.map((jogo) => [jogo.id, jogo])),
    compartimentosPorId: new Map(estante.compartimentos.map((c) => [c.id, c])),
    compartimentos: estante.compartimentos,
    familias: agruparFamilias(jogos),
  }
}

/** Falha alto: um id ausente aqui é defeito de programação, não entrada do usuário. */
export function exigirJogo(ctx: ContextoDeArranjo, id: IdJogo): CaixaDeJogo {
  const jogo = ctx.jogosPorId.get(id)
  if (jogo === undefined) {
    throw new Error(`jogo ausente no contexto; recebido id: ${JSON.stringify(id)}`)
  }
  return jogo
}

export function exigirCompartimento(ctx: ContextoDeArranjo, id: string): Compartimento {
  const compartimento = ctx.compartimentosPorId.get(id)
  if (compartimento === undefined) {
    throw new Error(`compartimento ausente no contexto; recebido id: ${JSON.stringify(id)}`)
  }
  return compartimento
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/arranjo.ts app/src/nucleo/arranjo.test.ts
git commit -m "feat(nucleo): define os tipos do arranjo e os indices do contexto"
```

---

## Task 9: Conforto de altura e função de pontuação

Três termos, conforme spec §7.4. `sobraConcentrada` soma os **quadrados** da sobra em
metros, o que premia 60 cm livres num lugar sobre 15 cm em quatro. `familiaDividida` é
negativo, e o peso padrão alto o torna dominante sem torná-lo infinito.

**Files:**
- Create: `app/src/nucleo/pontuacao.ts`
- Create: `app/src/nucleo/pontuacao.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/pontuacao.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto, type Arranjo } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo, type SinalDeFrequencia } from './jogo.js'
import { conforto, haSinalDeFrequencia, pontuar, PESOS_PADRAO } from './pontuacao.js'

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 1000,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [400, 400, 400, 400],
})

const jogo = (
  id: string,
  idJogoBase: string | null = null,
  frequencia: SinalDeFrequencia = { tipo: 'desconhecida' },
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 100, { tipo: 'manual' }, true),
  idJogoBase,
  frequencia,
  idLudopedia: null,
  idBgg: null,
})

const vazia = { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } }

const arranjoCom = (
  posicoes: ReadonlyArray<{ idJogo: string; idCompartimento: string }>,
): Arranjo => ({
  posicoes: posicoes.map((p) => ({ ...p, deslocamentoXMm: 0, apoio: 'retrato' as const })),
  naoAlocados: [],
  pontuacao: vazia,
})

describe('conforto', () => {
  it('vale 1 dentro da faixa de 1200 a 1650 mm', () => {
    expect(conforto(1200)).toBe(1)
    expect(conforto(1650)).toBe(1)
  })

  it('cai proporcionalmente abaixo da faixa', () => {
    expect(conforto(600)).toBeCloseTo(0.5, 5)
  })

  it('cai acima da faixa e zera no limite de alcance', () => {
    expect(conforto(2200)).toBe(0)
  })
})

describe('pontuar — sobra concentrada', () => {
  it('premia a sobra reunida num compartimento so', () => {
    const ctx = montarContexto([jogo('a'), jogo('b')], estante)
    const juntos = pontuar(arranjoCom([
      { idJogo: 'a', idCompartimento: 'e1-p0' },
      { idJogo: 'b', idCompartimento: 'e1-p0' },
    ]), ctx, PESOS_PADRAO)
    const separados = pontuar(arranjoCom([
      { idJogo: 'a', idCompartimento: 'e1-p0' },
      { idJogo: 'b', idCompartimento: 'e1-p1' },
    ]), ctx, PESOS_PADRAO)
    expect(juntos.porTermo.sobraConcentrada).toBeGreaterThan(separados.porTermo.sobraConcentrada)
  })
})

describe('pontuar — familia dividida', () => {
  it('nao penaliza familia inteira no mesmo compartimento', () => {
    const ctx = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const pontuacao = pontuar(arranjoCom([
      { idJogo: 'a', idCompartimento: 'e1-p0' },
      { idJogo: 'b', idCompartimento: 'e1-p0' },
    ]), ctx, PESOS_PADRAO)
    expect(pontuacao.porTermo.familiaDividida).toBe(0)
  })

  it('penaliza uma vez por familia espalhada', () => {
    const ctx = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const pontuacao = pontuar(arranjoCom([
      { idJogo: 'a', idCompartimento: 'e1-p0' },
      { idJogo: 'b', idCompartimento: 'e1-p1' },
    ]), ctx, PESOS_PADRAO)
    expect(pontuacao.porTermo.familiaDividida).toBe(-1)
  })
})

describe('pontuar — altura dos olhos', () => {
  it('premia o jogo mais jogado na prateleira confortavel', () => {
    const jogos = [jogo('a', null, { tipo: 'partidas', quantidade: 30 }), jogo('b')]
    const ctx = montarContexto(jogos, estante)
    // e1-p2 tem base 940 mm; e1-p0 tem base 100 mm.
    const alto = pontuar(arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p2' }]), ctx, PESOS_PADRAO)
    const baixo = pontuar(arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p0' }]), ctx, PESOS_PADRAO)
    expect(alto.porTermo.alturaDosOlhos).toBeGreaterThan(baixo.porTermo.alturaDosOlhos)
  })

  it('zera o termo quando ninguem tem sinal de frequencia', () => {
    const ctx = montarContexto([jogo('a')], estante)
    const pontuacao = pontuar(arranjoCom([{ idJogo: 'a', idCompartimento: 'e1-p1' }]), ctx, PESOS_PADRAO)
    expect(pontuacao.porTermo.alturaDosOlhos).toBe(0)
  })
})

describe('haSinalDeFrequencia', () => {
  it('e falso quando a colecao inteira e desconhecida', () => {
    expect(haSinalDeFrequencia([jogo('a'), jogo('b')])).toBe(false)
  })

  it('e verdadeiro com ao menos um destaque', () => {
    const marcado = jogo('a', null, { tipo: 'destaque', marcadoPeloUsuario: true })
    expect(haSinalDeFrequencia([marcado])).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./pontuacao.js"`.

- [ ] **Step 3: Fechar a porta de entrada do peso de frequência**

`pesoDeFrequencia` recebe `quantidade` de fontes sujas — coluna de CSV digitada à mão e
resposta da API da Ludopedia. Um `NaN` ou `Infinity` ali não lança nada: contamina o total
da pontuação, e como toda comparação com `NaN` é `false`, a busca local (Task 11) **para de
aceitar melhorias sem erro e sem teste vermelho**. Feche isso antes de `pontuar` consumir o
valor.

Em `app/src/nucleo/jogo.ts`, substitua `pesoDeFrequencia` por:

```ts
/**
 * Converte o sinal de frequência no número que a pontuação usa.
 *
 * Valida `quantidade` porque ela vem de CSV e da API da Ludopedia: `NaN` ou
 * `Infinity` aqui viram `NaN` no total da pontuação, e aí toda comparação da busca
 * local devolve `false` — o otimizador para de melhorar sem acusar nada.
 *
 * @example pesoDeFrequencia({ tipo: 'partidas', quantidade: 12 }) // 12
 */
export function pesoDeFrequencia(sinal: SinalDeFrequencia): number {
  switch (sinal.tipo) {
    case 'desconhecida':
      return 0
    case 'partidas':
      return exigirQuantidadeValida(sinal.quantidade)
    case 'destaque':
      return PESO_DE_DESTAQUE
  }
}

function exigirQuantidadeValida(quantidade: number): number {
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    throw new RangeError(
      `quantidade de partidas deve ser um número finito não negativo; ` +
        `recebido: ${JSON.stringify(quantidade)}`,
    )
  }
  return quantidade
}
```

E em `app/src/nucleo/jogo.test.ts`, acrescente ao `describe('pesoDeFrequencia', ...)`:

```ts
  it('aceita zero partidas, que e dado e nao ausencia de dado', () => {
    expect(pesoDeFrequencia({ tipo: 'partidas', quantidade: 0 })).toBe(0)
  })

  it('recusa quantidade nao finita citando o valor recebido', () => {
    expect(() => pesoDeFrequencia({ tipo: 'partidas', quantidade: Number.NaN })).toThrow(
      /recebido: null/,
    )
  })

  it('recusa quantidade negativa', () => {
    expect(() => pesoDeFrequencia({ tipo: 'partidas', quantidade: -1 })).toThrow(/recebido: -1/)
  })
```

- [ ] **Step 4: Implementar a pontuação**

`app/src/nucleo/pontuacao.ts`:

```ts
import {
  exigirCompartimento,
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
  type Pontuacao,
} from './arranjo.js'
import { pesoDeFrequencia, type CaixaDeJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

export interface PesosDeCriterio {
  readonly sobraConcentrada: number
  readonly familiaDividida: number
  readonly alturaDosOlhos: number
}

/**
 * `familiaDividida` domina porque é penalidade forte — mas é finita, então cede
 * quando manter a família junta tornaria o encaixe impossível (spec §7.4).
 */
export const PESOS_PADRAO: PesosDeCriterio = {
  sobraConcentrada: 1,
  familiaDividida: 5,
  alturaDosOlhos: 2,
}

export const CONFORTO_MIN_MM = 1200
export const CONFORTO_MAX_MM = 1650
/** Acima disso não se alcança sem escada; o conforto zera (spec S3). */
export const ALCANCE_MAX_MM = 2200

/**
 * Quão confortável é pegar um jogo cuja base está nesta altura. 1,0 na faixa dos
 * olhos, caindo linearmente para 0 no chão e no limite de alcance.
 *
 * @example conforto(1400) // 1
 */
export function conforto(alturaDaBaseMm: Milimetros): number {
  if (alturaDaBaseMm >= CONFORTO_MIN_MM && alturaDaBaseMm <= CONFORTO_MAX_MM) return 1
  if (alturaDaBaseMm < CONFORTO_MIN_MM) return Math.max(0, alturaDaBaseMm / CONFORTO_MIN_MM)
  return Math.max(0, (ALCANCE_MAX_MM - alturaDaBaseMm) / (ALCANCE_MAX_MM - CONFORTO_MAX_MM))
}

/** Falso quando a coleção inteira está `desconhecida` — a UI avisa nesse caso (spec §10). */
export function haSinalDeFrequencia(jogos: readonly CaixaDeJogo[]): boolean {
  return jogos.some((jogo) => pesoDeFrequencia(jogo.frequencia) > 0)
}

/**
 * Pontua um arranjo. Pura e sem estado: mesma entrada, mesma saída.
 *
 * @example pontuar(arranjo, ctx, PESOS_PADRAO).total
 */
export function pontuar(
  arranjo: Arranjo,
  ctx: ContextoDeArranjo,
  pesos: PesosDeCriterio,
): Pontuacao {
  const porTermo = {
    sobraConcentrada: medirSobraConcentrada(arranjo, ctx),
    familiaDividida: medirFamiliaDividida(arranjo, ctx),
    alturaDosOlhos: medirAlturaDosOlhos(arranjo, ctx),
  }
  const total =
    pesos.sobraConcentrada * porTermo.sobraConcentrada +
    pesos.familiaDividida * porTermo.familiaDividida +
    pesos.alturaDosOlhos * porTermo.alturaDosOlhos
  return { total, porTermo }
}

/** Soma dos quadrados da sobra em metros: concentrar vale mais que espalhar. */
function medirSobraConcentrada(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  const ocupado = new Map<string, Milimetros>()
  for (const posicao of arranjo.posicoes) {
    const espessura = exigirJogo(ctx, posicao.idJogo).medidas.espessuraMm
    ocupado.set(posicao.idCompartimento, (ocupado.get(posicao.idCompartimento) ?? 0) + espessura)
  }
  let soma = 0
  for (const compartimento of ctx.compartimentos) {
    const livreM = (compartimento.larguraUtilMm - (ocupado.get(compartimento.id) ?? 0)) / 1000
    soma += livreM * livreM
  }
  return soma
}

/** Negativo: uma unidade de penalidade por família espalhada entre compartimentos. */
function medirFamiliaDividida(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  const compartimentoPorJogo = new Map(
    arranjo.posicoes.map((posicao) => [posicao.idJogo, posicao.idCompartimento]),
  )
  let divididas = 0
  for (const familia of ctx.familias) {
    const alojamentos = new Set(
      familia.membros
        .map((id) => compartimentoPorJogo.get(id))
        .filter((id): id is string => id !== undefined),
    )
    if (alojamentos.size > 1) divididas += 1
  }
  return -divididas
}

/** Média do conforto ponderada pela frequência. Zero quando não há sinal nenhum. */
function medirAlturaDosOlhos(arranjo: Arranjo, ctx: ContextoDeArranjo): number {
  let pesoTotal = 0
  let acumulado = 0
  for (const posicao of arranjo.posicoes) {
    const peso = pesoDeFrequencia(exigirJogo(ctx, posicao.idJogo).frequencia)
    if (peso === 0) continue
    pesoTotal += peso
    acumulado += peso * conforto(exigirCompartimento(ctx, posicao.idCompartimento).alturaDaBaseMm)
  }
  return pesoTotal === 0 ? 0 : acumulado / pesoTotal
}
```

- [ ] **Step 5: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo — 43 anteriores, mais 3 do guard de `quantidade` no Step 3
e 10 da pontuação.

- [ ] **Step 6: Commit**

```bash
git add app/src/nucleo/pontuacao.ts app/src/nucleo/pontuacao.test.ts app/src/nucleo/jogo.ts app/src/nucleo/jogo.test.ts
git commit -m "feat(nucleo): pontua sobra concentrada, familia dividida e altura dos olhos"
```

---

## Task 10: Arranjo inicial por First-Fit Decreasing

Unidades de alocação são **famílias inteiras** (quando existem) e jogos soltos, ordenadas
por espessura total decrescente. Cada unidade tenta entrar inteira no primeiro
compartimento onde couber; se nenhuma couber inteira, a unidade é quebrada e os membros
entram um a um.

**Files:**
- Create: `app/src/nucleo/arranjoInicial.ts`
- Create: `app/src/nucleo/arranjoInicial.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/arranjoInicial.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo, type MedidasDaCaixa } from './jogo.js'

const manual = { tipo: 'manual' } as const

const jogo = (
  id: string,
  medidas: MedidasDaCaixa,
  idJogoBase: string | null = null,
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas,
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estanteDe = (larguraUtilMm: number, alturasLivresMm: number[], profundidadeUtilMm = 320) =>
  montarEstante('e1', {
    nome: 'Billy',
    larguraUtilMm,
    profundidadeUtilMm,
    alturaDoRodapeMm: 100,
    espessuraDaPrateleiraMm: 20,
    alturasLivresMm,
  })

describe('montarArranjoInicial', () => {
  it('aloca todos os jogos quando ha espaco de sobra', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 70, manual, true)),
      jogo('b', criarMedidas(295, 220, 60, manual, true)),
    ]
    const estante = estanteDe(760, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.posicoes).toHaveLength(2)
    expect(arranjo.naoAlocados).toEqual([])
  })

  it('nao estoura a largura do compartimento', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 200, manual, true)),
      jogo('b', criarMedidas(295, 220, 200, manual, true)),
      jogo('c', criarMedidas(295, 220, 200, manual, true)),
    ]
    const estante = estanteDe(500, [350, 350])
    const ctx = montarContexto(jogos, estante)
    const arranjo = montarArranjoInicial(jogos, ctx)
    const porCompartimento = new Map<string, number>()
    for (const posicao of arranjo.posicoes) {
      const espessura = ctx.jogosPorId.get(posicao.idJogo)!.medidas.espessuraMm
      const usado = (porCompartimento.get(posicao.idCompartimento) ?? 0) + espessura
      porCompartimento.set(posicao.idCompartimento, usado)
      expect(usado).toBeLessThanOrEqual(500)
    }
  })

  it('mantem a familia junta quando ela cabe inteira', () => {
    const jogos = [
      jogo('base', criarMedidas(295, 220, 70, manual, true)),
      jogo('exp', criarMedidas(295, 220, 40, manual, true), 'base'),
      jogo('outro', criarMedidas(295, 220, 300, manual, true)),
    ]
    const estante = estanteDe(400, [350, 350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    const de = (id: string) => arranjo.posicoes.find((p) => p.idJogo === id)?.idCompartimento
    expect(de('base')).toBe(de('exp'))
  })

  it('recusa por altura o jogo mais alto que qualquer prateleira', () => {
    const jogos = [jogo('gigante', criarMedidas(400, 380, 80, manual, true))]
    const estante = estanteDe(760, [300])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.naoAlocados).toEqual([
      { idJogo: 'gigante', motivo: 'alto-demais', faltaMm: 80 },
    ])
  })

  it('marca sem-espaco quando o jogo caberia mas nao sobrou largura', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 300, manual, true)),
      jogo('b', criarMedidas(295, 220, 300, manual, true)),
    ]
    const estante = estanteDe(400, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    expect(arranjo.naoAlocados).toEqual([{ idJogo: 'b', motivo: 'sem-espaco', faltaMm: 200 }])
  })

  it('atribui deslocamentos crescentes sem sobreposicao', () => {
    const jogos = [
      jogo('a', criarMedidas(295, 220, 100, manual, true)),
      jogo('b', criarMedidas(295, 220, 80, manual, true)),
    ]
    const estante = estanteDe(760, [350])
    const arranjo = montarArranjoInicial(jogos, montarContexto(jogos, estante))
    const deslocamentos = arranjo.posicoes.map((p) => p.deslocamentoXMm).sort((x, y) => x - y)
    expect(deslocamentos).toEqual([0, 100])
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./arranjoInicial.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/arranjoInicial.ts`:

```ts
import {
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
  type JogoNaoAlocado,
  type PosicaoDeJogo,
} from './arranjo.js'
import { encaixar } from './encaixe.js'
import type { Compartimento } from './estante.js'
import type { CaixaDeJogo, IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'

const PONTUACAO_PENDENTE = {
  total: 0,
  porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 },
}

/** Uma família inteira ou um jogo solto. É a granularidade da inserção gulosa. */
interface Unidade {
  readonly membros: readonly CaixaDeJogo[]
  readonly espessuraTotalMm: Milimetros
}

/**
 * First-Fit Decreasing: unidades mais grossas primeiro, cada uma no primeiro
 * compartimento onde couber. A pontuação sai zerada — quem pontua é o motor (Task 12).
 *
 * @example montarArranjoInicial(jogos, ctx).naoAlocados
 */
export function montarArranjoInicial(
  jogos: readonly CaixaDeJogo[],
  ctx: ContextoDeArranjo,
): Arranjo {
  const livrePorCompartimento = new Map(
    ctx.compartimentos.map((c) => [c.id, c.larguraUtilMm as Milimetros]),
  )
  const posicoes: PosicaoDeJogo[] = []
  const naoAlocados: JogoNaoAlocado[] = []

  for (const unidade of montarUnidades(jogos, ctx)) {
    const destino = acharCompartimentoParaUnidade(unidade, ctx, livrePorCompartimento)
    if (destino !== null) {
      inserirMembros(unidade.membros, destino, livrePorCompartimento, posicoes)
      continue
    }
    for (const membro of unidade.membros) {
      inserirMembroSozinho(membro, ctx, livrePorCompartimento, posicoes, naoAlocados)
    }
  }
  return { posicoes, naoAlocados, pontuacao: PONTUACAO_PENDENTE }
}

/** Famílias viram um bloco; o resto vira unidade de um. Ordena por espessura decrescente. */
function montarUnidades(jogos: readonly CaixaDeJogo[], ctx: ContextoDeArranjo): Unidade[] {
  const emFamilia = new Set<IdJogo>()
  const unidades: Unidade[] = []

  for (const familia of ctx.familias) {
    const membros = familia.membros.map((id) => exigirJogo(ctx, id))
    membros.forEach((membro) => emFamilia.add(membro.id))
    unidades.push({ membros, espessuraTotalMm: somarEspessuras(membros) })
  }
  for (const jogo of jogos) {
    if (emFamilia.has(jogo.id)) continue
    unidades.push({ membros: [jogo], espessuraTotalMm: jogo.medidas.espessuraMm })
  }
  return unidades.sort((a, b) => b.espessuraTotalMm - a.espessuraTotalMm)
}

function somarEspessuras(membros: readonly CaixaDeJogo[]): Milimetros {
  return membros.reduce((soma, membro) => soma + membro.medidas.espessuraMm, 0)
}

function acharCompartimentoParaUnidade(
  unidade: Unidade,
  ctx: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): Compartimento | null {
  for (const compartimento of ctx.compartimentos) {
    const cabeDimensionalmente = unidade.membros.every(
      (membro) => encaixar(membro.medidas, compartimento).cabe,
    )
    const sobra = livre.get(compartimento.id) ?? 0
    if (cabeDimensionalmente && unidade.espessuraTotalMm <= sobra) return compartimento
  }
  return null
}

function inserirMembros(
  membros: readonly CaixaDeJogo[],
  compartimento: Compartimento,
  livre: Map<string, Milimetros>,
  posicoes: PosicaoDeJogo[],
): void {
  for (const membro of membros) {
    const resultado = encaixar(membro.medidas, compartimento)
    if (!resultado.cabe) throw new Error(`membro ${membro.id} nao cabe em ${compartimento.id}`)
    const usado = compartimento.larguraUtilMm - (livre.get(compartimento.id) ?? 0)
    posicoes.push({
      idJogo: membro.id,
      idCompartimento: compartimento.id,
      deslocamentoXMm: usado,
      apoio: resultado.apoio,
    })
    livre.set(compartimento.id, (livre.get(compartimento.id) ?? 0) - membro.medidas.espessuraMm)
  }
}

function inserirMembroSozinho(
  membro: CaixaDeJogo,
  ctx: ContextoDeArranjo,
  livre: Map<string, Milimetros>,
  posicoes: PosicaoDeJogo[],
  naoAlocados: JogoNaoAlocado[],
): void {
  const unidade: Unidade = { membros: [membro], espessuraTotalMm: membro.medidas.espessuraMm }
  const destino = acharCompartimentoParaUnidade(unidade, ctx, livre)
  if (destino === null) {
    naoAlocados.push(diagnosticar(membro, ctx, livre))
    return
  }
  inserirMembros([membro], destino, livre, posicoes)
}

/**
 * Explica por que o jogo ficou de fora. Se ele caberia dimensionalmente em algum
 * compartimento, o problema é largura ocupada — `sem-espaco`, com a menor falta.
 * Caso contrário, devolve a recusa dimensional menos severa.
 */
function diagnosticar(
  membro: CaixaDeJogo,
  ctx: ContextoDeArranjo,
  livre: ReadonlyMap<string, Milimetros>,
): JogoNaoAlocado {
  let melhorRecusa: JogoNaoAlocado | null = null
  let menorFaltaDeEspaco: Milimetros | null = null

  for (const compartimento of ctx.compartimentos) {
    const resultado = encaixar(membro.medidas, compartimento)
    if (resultado.cabe) {
      const falta = membro.medidas.espessuraMm - (livre.get(compartimento.id) ?? 0)
      if (menorFaltaDeEspaco === null || falta < menorFaltaDeEspaco) menorFaltaDeEspaco = falta
      continue
    }
    if (melhorRecusa === null || resultado.faltaMm < melhorRecusa.faltaMm) {
      melhorRecusa = { idJogo: membro.id, motivo: resultado.motivo, faltaMm: resultado.faltaMm }
    }
  }
  if (menorFaltaDeEspaco !== null) {
    return { idJogo: membro.id, motivo: 'sem-espaco', faltaMm: menorFaltaDeEspaco }
  }
  if (melhorRecusa === null) {
    throw new Error(`estante sem compartimentos ao diagnosticar o jogo ${membro.id}`)
  }
  return melhorRecusa
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/arranjoInicial.ts app/src/nucleo/arranjoInicial.test.ts
git commit -m "feat(nucleo): monta o arranjo inicial por first-fit decreasing"
```

---

## Task 11: Busca local

Subida de encosta. Cada iteração sorteia um movimento, avalia, e aceita só se a pontuação
melhorar. **Nenhum movimento desaloca um jogo** — é assim que "caber" permanece restrição
dura fora da função de pontuação.

**Files:**
- Create: `app/src/nucleo/buscaLocal.ts`
- Create: `app/src/nucleo/buscaLocal.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/buscaLocal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { melhorar } from './buscaLocal.js'
import { montarEstante } from './estante.js'
import { geradorMulberry32 } from './gerador.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { pontuar, PESOS_PADRAO } from './pontuacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, espessuraMm: number, idJogoBase: string | null = null): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, espessuraMm, manual, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 600,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350, 350, 350],
})

describe('melhorar', () => {
  it('nunca piora a pontuacao', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80), jogo('e', 200)]
    const ctx = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, ctx)
    const antes = pontuar(inicial, ctx, PESOS_PADRAO).total
    const depois = melhorar(inicial, ctx, PESOS_PADRAO, geradorMulberry32(1), 2000)
    expect(depois.pontuacao.total).toBeGreaterThanOrEqual(antes)
  })

  it('e repetivel com a mesma semente', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80)]
    const ctx = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, ctx)
    const um = melhorar(inicial, ctx, PESOS_PADRAO, geradorMulberry32(7), 1000)
    const dois = melhorar(inicial, ctx, PESOS_PADRAO, geradorMulberry32(7), 1000)
    expect(um.posicoes).toEqual(dois.posicoes)
  })

  it('preserva todos os jogos: nada some nem duplica', () => {
    const jogos = [jogo('a', 120), jogo('b', 90), jogo('c', 150), jogo('d', 80)]
    const ctx = montarContexto(jogos, estante)
    const resultado = melhorar(
      montarArranjoInicial(jogos, ctx),
      ctx,
      PESOS_PADRAO,
      geradorMulberry32(3),
      1000,
    )
    const vistos = [...resultado.posicoes.map((p) => p.idJogo), ...resultado.naoAlocados.map((n) => n.idJogo)]
    expect(vistos.sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('nunca estoura a largura de um compartimento', () => {
    const jogos = [jogo('a', 250), jogo('b', 250), jogo('c', 250), jogo('d', 250)]
    const ctx = montarContexto(jogos, estante)
    const resultado = melhorar(
      montarArranjoInicial(jogos, ctx),
      ctx,
      PESOS_PADRAO,
      geradorMulberry32(11),
      2000,
    )
    const usado = new Map<string, number>()
    for (const posicao of resultado.posicoes) {
      const espessura = ctx.jogosPorId.get(posicao.idJogo)!.medidas.espessuraMm
      usado.set(posicao.idCompartimento, (usado.get(posicao.idCompartimento) ?? 0) + espessura)
    }
    for (const total of usado.values()) expect(total).toBeLessThanOrEqual(600)
  })

  it('devolve o arranjo intacto quando nao ha iteracoes', () => {
    const jogos = [jogo('a', 120)]
    const ctx = montarContexto(jogos, estante)
    const inicial = montarArranjoInicial(jogos, ctx)
    const resultado = melhorar(inicial, ctx, PESOS_PADRAO, geradorMulberry32(1), 0)
    expect(resultado.posicoes).toEqual(inicial.posicoes)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./buscaLocal.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/buscaLocal.ts`:

```ts
import {
  exigirCompartimento,
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
  type JogoNaoAlocado,
  type PosicaoDeJogo,
} from './arranjo.js'
import { encaixar } from './encaixe.js'
import { sortearIndice, type Gerador } from './gerador.js'
import type { IdJogo } from './jogo.js'
import type { Milimetros } from './medidas.js'
import { pontuar, type PesosDeCriterio } from './pontuacao.js'

/** Estado de trabalho: quem está em cada compartimento, sem deslocamentos. */
type Lotacao = Map<string, IdJogo[]>

/**
 * Subida de encosta. Sorteia um movimento por iteração, aceita só se a pontuação
 * subir. Movimentos que desalocariam um jogo não são gerados — "caber" é restrição
 * dura e fica fora da pontuação (spec §7.4).
 *
 * @example melhorar(inicial, ctx, PESOS_PADRAO, geradorMulberry32(42), 20000)
 */
export function melhorar(
  arranjo: Arranjo,
  ctx: ContextoDeArranjo,
  pesos: PesosDeCriterio,
  gerador: Gerador,
  iteracoes: number,
): Arranjo {
  let lotacao = extrairLotacao(arranjo, ctx)
  let melhor = pontuar(materializar(lotacao, arranjo.naoAlocados, ctx), ctx, pesos).total

  for (let passo = 0; passo < iteracoes; passo += 1) {
    const candidata = sortearMovimento(lotacao, ctx, gerador)
    if (candidata === null) continue
    const pontuacao = pontuar(materializar(candidata, arranjo.naoAlocados, ctx), ctx, pesos).total
    if (pontuacao > melhor) {
      lotacao = candidata
      melhor = pontuacao
    }
  }
  const finalizado = materializar(lotacao, arranjo.naoAlocados, ctx)
  return { ...finalizado, pontuacao: pontuar(finalizado, ctx, pesos) }
}

function extrairLotacao(arranjo: Arranjo, ctx: ContextoDeArranjo): Lotacao {
  const lotacao: Lotacao = new Map(ctx.compartimentos.map((c) => [c.id, []]))
  for (const posicao of arranjo.posicoes) {
    lotacao.get(posicao.idCompartimento)?.push(posicao.idJogo)
  }
  return lotacao
}

/** Recalcula deslocamentos e apoios a partir da lotação. */
function materializar(
  lotacao: Lotacao,
  naoAlocados: readonly JogoNaoAlocado[],
  ctx: ContextoDeArranjo,
): Arranjo {
  const posicoes: PosicaoDeJogo[] = []
  for (const [idCompartimento, ids] of lotacao) {
    const compartimento = exigirCompartimento(ctx, idCompartimento)
    let deslocamentoXMm: Milimetros = 0
    for (const idJogo of ids) {
      const medidas = exigirJogo(ctx, idJogo).medidas
      const resultado = encaixar(medidas, compartimento)
      if (!resultado.cabe) throw new Error(`lotacao invalida: ${idJogo} em ${idCompartimento}`)
      posicoes.push({ idJogo, idCompartimento, deslocamentoXMm, apoio: resultado.apoio })
      deslocamentoXMm += medidas.espessuraMm
    }
  }
  return { posicoes, naoAlocados, pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } } }
}

/** Sorteia entre mover um jogo, trocar dois jogos e mover uma família inteira. */
function sortearMovimento(
  lotacao: Lotacao,
  ctx: ContextoDeArranjo,
  gerador: Gerador,
): Lotacao | null {
  const sorteio = sortearIndice(gerador, ctx.familias.length > 0 ? 3 : 2)
  if (sorteio === 0) return moverUmJogo(lotacao, ctx, gerador)
  if (sorteio === 1) return trocarDoisJogos(lotacao, ctx, gerador)
  return moverFamilia(lotacao, ctx, gerador)
}

function moverUmJogo(lotacao: Lotacao, ctx: ContextoDeArranjo, gerador: Gerador): Lotacao | null {
  const origem = sortearCompartimentoOcupado(lotacao, ctx, gerador)
  if (origem === null) return null
  const destino = exigirCompartimento(ctx, sortearIdCompartimento(ctx, gerador))
  const ids = lotacao.get(origem) ?? []
  const idJogo = ids[sortearIndice(gerador, ids.length)]
  if (idJogo === undefined || destino.id === origem) return null
  if (!podeReceber(destino.id, [idJogo], lotacao, ctx)) return null

  const proxima = clonar(lotacao)
  proxima.set(origem, (proxima.get(origem) ?? []).filter((id) => id !== idJogo))
  proxima.get(destino.id)?.push(idJogo)
  return proxima
}

function trocarDoisJogos(lotacao: Lotacao, ctx: ContextoDeArranjo, gerador: Gerador): Lotacao | null {
  const primeiro = sortearCompartimentoOcupado(lotacao, ctx, gerador)
  const segundo = sortearCompartimentoOcupado(lotacao, ctx, gerador)
  if (primeiro === null || segundo === null || primeiro === segundo) return null

  const idsA = lotacao.get(primeiro) ?? []
  const idsB = lotacao.get(segundo) ?? []
  const jogoA = idsA[sortearIndice(gerador, idsA.length)]
  const jogoB = idsB[sortearIndice(gerador, idsB.length)]
  if (jogoA === undefined || jogoB === undefined) return null

  const proxima = clonar(lotacao)
  proxima.set(primeiro, [...idsA.filter((id) => id !== jogoA), jogoB])
  proxima.set(segundo, [...idsB.filter((id) => id !== jogoB), jogoA])
  return respeitaLimites(proxima, ctx) ? proxima : null
}

function moverFamilia(lotacao: Lotacao, ctx: ContextoDeArranjo, gerador: Gerador): Lotacao | null {
  const familia = ctx.familias[sortearIndice(gerador, ctx.familias.length)]
  if (familia === undefined) return null
  const destino = sortearIdCompartimento(ctx, gerador)
  if (!podeReceber(destino, familia.membros, lotacao, ctx, familia.membros)) return null

  const proxima = clonar(lotacao)
  for (const [id, ids] of proxima) {
    proxima.set(id, ids.filter((idJogo) => !familia.membros.includes(idJogo)))
  }
  proxima.get(destino)?.push(...familia.membros)
  return proxima
}

/** Verifica dimensões e largura restante, descontando quem sairá do compartimento. */
function podeReceber(
  idCompartimento: string,
  entrantes: readonly IdJogo[],
  lotacao: Lotacao,
  ctx: ContextoDeArranjo,
  saindo: readonly IdJogo[] = [],
): boolean {
  const compartimento = exigirCompartimento(ctx, idCompartimento)
  const cabemDimensionalmente = entrantes.every(
    (id) => encaixar(exigirJogo(ctx, id).medidas, compartimento).cabe,
  )
  if (!cabemDimensionalmente) return false

  const atuais = (lotacao.get(idCompartimento) ?? []).filter((id) => !saindo.includes(id))
  const usado = somar(atuais, ctx) + somar(entrantes, ctx)
  return usado <= compartimento.larguraUtilMm
}

function respeitaLimites(lotacao: Lotacao, ctx: ContextoDeArranjo): boolean {
  for (const [idCompartimento, ids] of lotacao) {
    const compartimento = exigirCompartimento(ctx, idCompartimento)
    if (somar(ids, ctx) > compartimento.larguraUtilMm) return false
    if (ids.some((id) => !encaixar(exigirJogo(ctx, id).medidas, compartimento).cabe)) return false
  }
  return true
}

function somar(ids: readonly IdJogo[], ctx: ContextoDeArranjo): Milimetros {
  return ids.reduce((total, id) => total + exigirJogo(ctx, id).medidas.espessuraMm, 0)
}

function clonar(lotacao: Lotacao): Lotacao {
  return new Map([...lotacao].map(([id, ids]) => [id, [...ids]]))
}

function sortearIdCompartimento(ctx: ContextoDeArranjo, gerador: Gerador): string {
  const compartimento = ctx.compartimentos[sortearIndice(gerador, ctx.compartimentos.length)]
  if (compartimento === undefined) throw new Error('estante sem compartimentos')
  return compartimento.id
}

function sortearCompartimentoOcupado(
  lotacao: Lotacao,
  ctx: ContextoDeArranjo,
  gerador: Gerador,
): string | null {
  const ocupados = ctx.compartimentos.filter((c) => (lotacao.get(c.id) ?? []).length > 0)
  if (ocupados.length === 0) return null
  return ocupados[sortearIndice(gerador, ocupados.length)]?.id ?? null
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/buscaLocal.ts app/src/nucleo/buscaLocal.test.ts
git commit -m "feat(nucleo): melhora o arranjo por subida de encosta com movimentos validos"
```

---

## Task 12: Ordenação para exibição

Como a ordem dentro do compartimento não afeta o encaixe, ordenar é gratuito. A chave põe
cada expansão logo depois do seu jogo-base, o que produz adjacência na prática sem custo de
restrição (spec S2).

**Files:**
- Create: `app/src/nucleo/ordenacao.ts`
- Create: `app/src/nucleo/ordenacao.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/ordenacao.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto, type Arranjo } from './arranjo.js'
import { montarEstante } from './estante.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { ordenarParaExibicao } from './ordenacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, nome: string, idJogoBase: string | null = null): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 220, 100, manual, true),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 1000,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350],
})

const arranjoCom = (ids: readonly string[]): Arranjo => ({
  posicoes: ids.map((idJogo, indice) => ({
    idJogo,
    idCompartimento: 'e1-p0',
    deslocamentoXMm: indice * 100,
    apoio: 'retrato' as const,
  })),
  naoAlocados: [],
  pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
})

describe('ordenarParaExibicao', () => {
  it('ordena alfabeticamente por nome normalizado', () => {
    const jogos = [jogo('z', 'Zombicide'), jogo('a', 'Ávila'), jogo('m', 'Marco Polo')]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['z', 'm', 'a']), ctx)
    expect(ordenado.posicoes.map((p) => p.idJogo)).toEqual(['a', 'm', 'z'])
  })

  it('poe a expansao logo depois do seu jogo-base', () => {
    const jogos = [
      jogo('base', 'Catan'),
      jogo('exp', 'Catan: Navegadores', 'base'),
      jogo('outro', 'Carcassonne'),
    ]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['exp', 'outro', 'base']), ctx)
    expect(ordenado.posicoes.map((p) => p.idJogo)).toEqual(['outro', 'base', 'exp'])
  })

  it('recalcula os deslocamentos sem deixar buraco', () => {
    const jogos = [jogo('a', 'Azul'), jogo('b', 'Brass')]
    const ctx = montarContexto(jogos, estante)
    const ordenado = ordenarParaExibicao(arranjoCom(['b', 'a']), ctx)
    expect(ordenado.posicoes.map((p) => p.deslocamentoXMm)).toEqual([0, 100])
  })

  it('preserva os nao alocados e a pontuacao', () => {
    const jogos = [jogo('a', 'Azul')]
    const ctx = montarContexto(jogos, estante)
    const entrada: Arranjo = {
      ...arranjoCom(['a']),
      naoAlocados: [{ idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 }],
    }
    expect(ordenarParaExibicao(entrada, ctx).naoAlocados).toEqual(entrada.naoAlocados)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./ordenacao.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/ordenacao.ts`:

```ts
import {
  exigirJogo,
  type Arranjo,
  type ContextoDeArranjo,
  type PosicaoDeJogo,
} from './arranjo.js'
import type { CaixaDeJogo } from './jogo.js'
import { normalizarNome, type Milimetros } from './medidas.js'

/**
 * Reordena cada compartimento e recalcula os deslocamentos. Não muda quem está
 * onde — só a sequência —, o que é seguro porque a ordem não afeta o encaixe.
 *
 * @example ordenarParaExibicao(arranjo, ctx).posicoes[0].idJogo
 */
export function ordenarParaExibicao(arranjo: Arranjo, ctx: ContextoDeArranjo): Arranjo {
  const porCompartimento = new Map<string, PosicaoDeJogo[]>()
  for (const posicao of arranjo.posicoes) {
    const lista = porCompartimento.get(posicao.idCompartimento) ?? []
    lista.push(posicao)
    porCompartimento.set(posicao.idCompartimento, lista)
  }

  const posicoes: PosicaoDeJogo[] = []
  for (const lista of porCompartimento.values()) {
    lista.sort((a, b) => comparar(exigirJogo(ctx, a.idJogo), exigirJogo(ctx, b.idJogo), ctx))
    posicoes.push(...reposicionar(lista, ctx))
  }
  return { ...arranjo, posicoes }
}

/** Ordena por família, depois base antes de expansão, depois nome. */
function comparar(a: CaixaDeJogo, b: CaixaDeJogo, ctx: ContextoDeArranjo): number {
  const familiaA = chaveDeFamilia(a, ctx)
  const familiaB = chaveDeFamilia(b, ctx)
  if (familiaA !== familiaB) return familiaA < familiaB ? -1 : 1

  const ordemA = a.idJogoBase === null ? 0 : 1
  const ordemB = b.idJogoBase === null ? 0 : 1
  if (ordemA !== ordemB) return ordemA - ordemB

  return normalizarNome(a.nome).localeCompare(normalizarNome(b.nome))
}

/** Expansão herda a chave do seu base, e por isso ordena junto dele. */
function chaveDeFamilia(jogo: CaixaDeJogo, ctx: ContextoDeArranjo): string {
  if (jogo.idJogoBase === null) return normalizarNome(jogo.nome)
  const base = ctx.jogosPorId.get(jogo.idJogoBase)
  return normalizarNome(base?.nome ?? jogo.nome)
}

function reposicionar(
  lista: readonly PosicaoDeJogo[],
  ctx: ContextoDeArranjo,
): readonly PosicaoDeJogo[] {
  let deslocamentoXMm: Milimetros = 0
  return lista.map((posicao) => {
    const atual = { ...posicao, deslocamentoXMm }
    deslocamentoXMm += exigirJogo(ctx, posicao.idJogo).medidas.espessuraMm
    return atual
  })
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/ordenacao.ts app/src/nucleo/ordenacao.test.ts
git commit -m "feat(nucleo): ordena o arranjo para exibicao mantendo expansoes junto do base"
```

---

## Task 13: Motor orquestrador e invariantes

**Files:**
- Create: `app/src/nucleo/motor.ts`
- Create: `app/src/nucleo/motor.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/nucleo/motor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarEstante } from './estante.js'
import { geradorMulberry32 } from './gerador.js'
import { criarMedidas, type CaixaDeJogo } from './jogo.js'
import { arranjar } from './motor.js'
import { PESOS_PADRAO } from './pontuacao.js'

const manual = { tipo: 'manual' } as const

const jogo = (id: string, espessuraMm: number, partidas = 0): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, espessuraMm, manual, true),
  idJogoBase: null,
  frequencia: partidas === 0 ? { tipo: 'desconhecida' } : { tipo: 'partidas', quantidade: partidas },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 600,
  profundidadeUtilMm: 320,
  alturaDoRodapeMm: 100,
  espessuraDaPrateleiraMm: 20,
  alturasLivresMm: [350, 350],
})

const arranjarCom = (jogos: readonly CaixaDeJogo[]) =>
  arranjar({ jogos, estante, pesos: PESOS_PADRAO, gerador: geradorMulberry32(42), iteracoes: 2000 })

describe('arranjar — invariantes', () => {
  it('todo jogo esta posicionado ou tem motivo, nunca os dois nem nenhum', () => {
    const jogos = [jogo('a', 200), jogo('b', 200), jogo('c', 200), jogo('d', 200), jogo('e', 200)]
    const arranjo = arranjarCom(jogos)
    const posicionados = new Set(arranjo.posicoes.map((p) => p.idJogo))
    const recusados = new Set(arranjo.naoAlocados.map((n) => n.idJogo))
    for (const item of jogos) {
      expect(posicionados.has(item.id) !== recusados.has(item.id)).toBe(true)
    }
  })

  it('nenhum jogo aparece duas vezes', () => {
    const jogos = [jogo('a', 100), jogo('b', 100), jogo('c', 100)]
    const ids = arranjarCom(jogos).posicoes.map((p) => p.idJogo)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('o jogo mais alto que qualquer prateleira sai como alto-demais', () => {
    const gigante: CaixaDeJogo = {
      ...jogo('gigante', 80),
      medidas: criarMedidas(500, 480, 80, manual, true),
    }
    const arranjo = arranjarCom([jogo('a', 100), gigante])
    expect(arranjo.naoAlocados).toEqual([
      { idJogo: 'gigante', motivo: 'alto-demais', faltaMm: 130 },
    ])
  })

  it('quando a colecao nao cabe, o que sobra e o menos jogado', () => {
    const jogos = [
      jogo('muito-jogado', 400, 50),
      jogo('pouco-jogado', 400, 1),
      jogo('nunca-jogado', 400, 0),
      jogo('enchimento', 400, 30),
    ]
    const arranjo = arranjarCom(jogos)
    expect(arranjo.naoAlocados.length).toBeGreaterThan(0)
    expect(arranjo.posicoes.map((p) => p.idJogo)).toContain('muito-jogado')
  })

  it('devolve pontuacao coerente com os tres termos', () => {
    const arranjo = arranjarCom([jogo('a', 100), jogo('b', 100)])
    expect(Object.keys(arranjo.pontuacao.porTermo).sort()).toEqual([
      'alturaDosOlhos',
      'familiaDividida',
      'sobraConcentrada',
    ])
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm test
```

Esperado: FAIL com `Failed to resolve import "./motor.js"`.

- [ ] **Step 3: Implementar**

`app/src/nucleo/motor.ts`:

```ts
import { montarContexto, type Arranjo } from './arranjo.js'
import { montarArranjoInicial } from './arranjoInicial.js'
import { melhorar } from './buscaLocal.js'
import type { Estante } from './estante.js'
import type { Gerador } from './gerador.js'
import type { CaixaDeJogo } from './jogo.js'
import { ordenarParaExibicao } from './ordenacao.js'
import { pontuar, type PesosDeCriterio } from './pontuacao.js'

export interface EntradaDoMotor {
  readonly jogos: readonly CaixaDeJogo[]
  readonly estante: Estante
  readonly pesos: PesosDeCriterio
  readonly gerador: Gerador
  /** Dezenas de milhares são milissegundos para 50–300 jogos (spec §7.5). */
  readonly iteracoes: number
}

/**
 * Constrói, melhora e ordena. As três etapas da spec §7.3, nesta ordem.
 *
 * @example arranjar({ jogos, estante, pesos: PESOS_PADRAO, gerador, iteracoes: 20000 })
 */
export function arranjar(entrada: EntradaDoMotor): Arranjo {
  const ctx = montarContexto(entrada.jogos, entrada.estante)
  const inicial = montarArranjoInicial(entrada.jogos, ctx)
  const melhorado = melhorar(inicial, ctx, entrada.pesos, entrada.gerador, entrada.iteracoes)
  const ordenado = ordenarParaExibicao(melhorado, ctx)
  return { ...ordenado, pontuacao: pontuar(ordenado, ctx, entrada.pesos) }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: a suite inteira verde, incluindo os testes novos deste arquivo.

Se o teste "o que sobra é o menos jogado" falhar, aumente `iteracoes` para `20000` na
função `arranjarCom` do teste antes de mexer no algoritmo: o FFD inicial ordena por
espessura, e é a busca local que corrige pela frequência.

- [ ] **Step 5: Commit**

```bash
git add app/src/nucleo/motor.ts app/src/nucleo/motor.test.ts
git commit -m "feat(nucleo): orquestra construcao, melhoria e ordenacao do arranjo"
```

---

## Task 14: Teste de fronteira arquitetural

Substitui a regra de lint que a spec §5.3 pedia. `typescript-eslint@8.67.0` declara
`typescript: ">=4.8.4 <6.1.0"` e não suporta o TypeScript 7, então a fronteira é garantida
por um teste — que roda no mesmo `pnpm test` e não precisa de dependência nenhuma.

**Files:**
- Create: `app/tests/fronteira.test.ts`

- [ ] **Step 1: Escrever o teste**

`app/tests/fronteira.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIRETORIO_NUCLEO = fileURLToPath(new URL('../src/nucleo', import.meta.url))

/** O núcleo é TypeScript puro: nada de UI, 3D, rede ou API de navegador (spec §5.3). */
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
```

- [ ] **Step 2: Rodar o teste e confirmar que passa**

```bash
pnpm test
```

Esperado: todos os arquivos do núcleo passam. `Tests 78 passed (78)` aproximadamente — o
número varia com a quantidade de arquivos, porque `it.each` gera um teste por arquivo.

- [ ] **Step 3: Provar que o teste realmente pega uma violação**

Adicione temporariamente a linha `const x = Math.random()` no fim de
`app/src/nucleo/motor.ts` e rode:

```bash
pnpm test
```

Esperado: FAIL em `motor.ts nao viola a fronteira`, com
`expected [ 'aleatoriedade não injetada' ] to deeply equal []`.

- [ ] **Step 4: Remover a linha temporária e reconfirmar**

```bash
pnpm test
```

Esperado: tudo verde de novo.

- [ ] **Step 5: Commit**

```bash
git add app/tests/fronteira.test.ts
git commit -m "test: proibe imports de UI, 3D e rede dentro do nucleo"
```

---

## Task 15: Cenário de regressão com semente fixa

Protege contra piora silenciosa: se alguém mexer no algoritmo e a pontuação cair, este
teste quebra.

**Files:**
- Create: `app/tests/regressao.test.ts`

- [ ] **Step 1: Escrever o teste com o valor esperado deixado em aberto**

`app/tests/regressao.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarEstante } from '../src/nucleo/estante.js'
import { geradorMulberry32 } from '../src/nucleo/gerador.js'
import { criarMedidas, type CaixaDeJogo } from '../src/nucleo/jogo.js'
import { arranjar } from '../src/nucleo/motor.js'
import { PESOS_PADRAO } from '../src/nucleo/pontuacao.js'

const manual = { tipo: 'manual' } as const

interface LinhaDaColecao {
  readonly id: string
  readonly nome: string
  readonly idJogoBase: string | null
  readonly maiorMm: number
  readonly menorMm: number
  readonly espessuraMm: number
  readonly partidas: number
}

/** Coleção fixa: 12 jogos, duas famílias, medidas realistas em milímetros. */
const LINHAS: readonly LinhaDaColecao[] = [
  { id: 'catan', nome: 'Catan', idJogoBase: null, maiorMm: 295, menorMm: 295, espessuraMm: 70, partidas: 12 },
  { id: 'catan-nav', nome: 'Catan: Navegadores', idJogoBase: 'catan', maiorMm: 295, menorMm: 295, espessuraMm: 45, partidas: 4 },
  { id: 'catan-cid', nome: 'Catan: Cidades e Cavaleiros', idJogoBase: 'catan', maiorMm: 295, menorMm: 295, espessuraMm: 45, partidas: 2 },
  { id: 'azul', nome: 'Azul', idJogoBase: null, maiorMm: 295, menorMm: 295, espessuraMm: 72, partidas: 30 },
  { id: 'brass', nome: 'Brass: Birmingham', idJogoBase: null, maiorMm: 300, menorMm: 300, espessuraMm: 76, partidas: 8 },
  { id: 'wingspan', nome: 'Wingspan', idJogoBase: null, maiorMm: 295, menorMm: 240, espessuraMm: 70, partidas: 18 },
  { id: 'wingspan-eur', nome: 'Wingspan: Europa', idJogoBase: 'wingspan', maiorMm: 240, menorMm: 160, espessuraMm: 40, partidas: 6 },
  { id: 'marco', nome: 'Marco Polo', idJogoBase: null, maiorMm: 295, menorMm: 220, espessuraMm: 70, partidas: 3 },
  { id: 'carcassonne', nome: 'Carcassonne', idJogoBase: null, maiorMm: 300, menorMm: 220, espessuraMm: 60, partidas: 22 },
  { id: 'ticket', nome: 'Ticket to Ride', idJogoBase: null, maiorMm: 300, menorMm: 300, espessuraMm: 60, partidas: 15 },
  { id: 'patchwork', nome: 'Patchwork', idJogoBase: null, maiorMm: 240, menorMm: 240, espessuraMm: 55, partidas: 9 },
  { id: 'splendor', nome: 'Splendor', idJogoBase: null, maiorMm: 265, menorMm: 265, espessuraMm: 70, partidas: 11 },
]

const COLECAO: readonly CaixaDeJogo[] = LINHAS.map((linha) => ({
  id: linha.id,
  nome: linha.nome,
  medidas: criarMedidas(linha.maiorMm, linha.menorMm, linha.espessuraMm, manual, true),
  idJogoBase: linha.idJogoBase,
  frequencia: { tipo: 'partidas', quantidade: linha.partidas },
  idLudopedia: null,
  idBgg: null,
}))

const ESTANTE = montarEstante('billy', {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 350, 300],
})

const executar = () =>
  arranjar({
    jogos: COLECAO,
    estante: ESTANTE,
    pesos: PESOS_PADRAO,
    gerador: geradorMulberry32(20260816),
    iteracoes: 20000,
  })

describe('cenario de regressao', () => {
  it('e deterministico entre execucoes', () => {
    expect(executar().posicoes).toEqual(executar().posicoes)
  })

  it('aloca a colecao inteira nesta estante', () => {
    expect(executar().naoAlocados).toEqual([])
  })

  it('mantem as duas familias inteiras', () => {
    expect(executar().pontuacao.porTermo.familiaDividida).toBe(0)
  })

  it('registra a pontuacao conhecida', () => {
    // Preencha com o valor impresso no Step 2 e nunca o ajuste para "consertar"
    // um teste vermelho: queda de pontuação é regressão de verdade.
    expect(executar().pontuacao.total).toBeCloseTo(0, 6)
  })
})
```

- [ ] **Step 2: Rodar e ler a pontuação real**

```bash
pnpm test -- regressao
```

Esperado: FAIL no último teste, com a mensagem mostrando o valor real, algo como
`expected 3.14159 to be close to 0`.

- [ ] **Step 3: Fixar o valor observado**

Substitua `toBeCloseTo(0, 6)` por `toBeCloseTo(<valor observado>, 6)` usando o número que o
Step 2 imprimiu.

- [ ] **Step 4: Rodar a suíte inteira**

```bash
pnpm test
```

Esperado: tudo verde.

- [ ] **Step 5: Conferir tipos e formatação**

```bash
pnpm typecheck
```

Esperado: nenhuma saída, código 0.

```bash
pnpm format
```

- [ ] **Step 6: Commit**

```bash
git add app/tests/regressao.test.ts
git add -A
git commit -m "test: fixa cenario de regressao com semente e pontuacao conhecidas"
```

---

## Task 16: Fechamento do plano 1

- [ ] **Step 1: Rodar a verificação completa**

```bash
pnpm test
```

Esperado: todos os testes passam, zero falhas.

```bash
pnpm typecheck
```

Esperado: nenhuma saída.

```bash
pnpm format:check
```

Esperado: `All matched files use Prettier code style!`

- [ ] **Step 2: Publicar**

```bash
git push
```

- [ ] **Step 3: Confirmar o estado**

```bash
git status -sb
```

Esperado: `## main...origin/main` sem divergência.

---

## Cobertura da spec por este plano

| Seção da spec | Onde está | Observação |
|---|---|---|
| §4 D9 milímetros inteiros | Task 2 | conversões e validação |
| §5.2 stack | Task 1 | versões verificadas, sem typescript-eslint |
| §5.3 fronteira do núcleo | Task 14 | teste em vez de regra de lint |
| §6.1 `CaixaDeJogo`, `SinalDeFrequencia` | Task 3 | `criarMedidas` garante maior ≥ menor |
| §6.2 `Compartimento`, derivação de `alturaDaBaseMm` | Task 4 | |
| §6.3 `Arranjo`, `PosicaoDeJogo`, `JogoNaoAlocado` | Task 8 | |
| §7.2 sub-orientação | Task 6 | inclui o caso 300×220×60 da spec §11 |
| §7.3 algoritmo em três etapas | Tasks 10, 11, 12, 13 | |
| §7.4 pontuação e pesos | Task 9 | |
| §11 invariantes e bordas | Tasks 13, 15 | |
| S6 nome normalizado | Task 2 | |

**Fora deste plano, por pertencerem aos planos 2 a 4:** telas (§8), cena 3D (§8),
persistência (§5.3), importador de CSV (§9.3), tabela semeada (§9.4), proxy e adaptadores
(§9.2), tratamento de erros de rede (§10).

## Itens conhecidos, deixados para a camada de importação (plano 3)

Levantados durante a revisão deste plano e conscientemente adiados, porque o lugar certo de
tratá-los é onde o dado externo entra, não no núcleo:

- **`™` sobrevive à normalização.** `NFKD` decompõe `™` (U+2122) nas letras `T` e `M`, que
  passam pelo filtro `\p{Letter}`. Logo `normalizarNome('Catan™')` devolve `'catantm'` e não
  casa com `'catan'`. `®` não tem esse problema. Não bloqueia porque Ludopedia, BGG e
  exportações de CSV não trazem marca registrada no campo de nome — mas se aparecer, a
  correção é remover `\p{So}` antes de normalizar, com teste de regressão.
- **Nome vazio ou só de pontuação colapsa para `''`.** Dois itens sem nome real casariam
  entre si. A validação pertence ao importador de CSV, que deve recusar a linha citando o
  número dela, e não ao núcleo.
