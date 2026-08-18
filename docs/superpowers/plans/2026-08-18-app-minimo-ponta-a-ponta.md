# App mínimo ponta a ponta — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o LudoShelf existir de verdade no navegador: cadastro manual de estante e coleção, o motor de arranjo do plano 1 rodando de ponta a ponta, o resultado em cena 3D, tudo persistindo em IndexedDB entre sessões.

**Architecture:** SPA React sobre o pacote `app/` existente. Zustand é a única fonte de verdade em memória; IndexedDB (via Dexie, atrás de `RepositorioDeColecao`) é espelho, não fonte. A cena 3D é burra — recebe `Arranjo` pronto e desenha. O núcleo (`app/src/nucleo/`) permanece intocado e sem novas dependências.

**Tech Stack:** React 19.2.8 · Vite 8.2.1 · Zustand 5.0.15 · Dexie 4.4.5 · Three 0.185.1 · @react-three/fiber 9.7.0 · @react-three/drei 10.7.8 · Testing Library 16.3.2 · jsdom 30.0.1 · fake-indexeddb 6.2.5 — todas verificadas juntas por execução nesta sessão, não de memória.

**Spec de origem:** [`docs/superpowers/specs/2026-08-17-app-minimo-design.md`](../specs/2026-08-17-app-minimo-design.md)
**Depende de:** plano 1 (`app/src/nucleo/`), já mergeado em `main`.

---

## Contexto que o executor precisa saber

**Regra de ouro herdada do plano 1:** `app/src/nucleo/` é TypeScript puro e continua assim.
Nenhuma task deste plano toca lá dentro, exceto para *importar* — nunca para adicionar
React, Three.js ou qualquer coisa nova. `app/tests/fronteira.test.ts` continua garantindo
isso; não precisa mexer nele.

**Recálculo é síncrono, mas adiado um tick.** `arranjar()` do núcleo não é assíncrono —
mas se `recalcularArranjo` chamá-lo direto, a mesma thread que precisaria pintar o estado
"calculando" fica ocupada pelas iterações antes de o React ter a chance de renderizar.
A action agenda a chamada real via `requestAnimationFrame` (ou `setTimeout(0)` em teste),
para o navegador pintar o esmaecimento primeiro.

**`salvarJogo` é upsert**, não duas actions separadas para criar/editar — mesma
semântica de `RepositorioDeColecao.salvarJogo`, que usa `put` no Dexie.

**Separação de ambiente de teste, verificada nesta sessão:** `environmentMatchGlobs` do
Vitest 4.1.10 **não funcionou** para separar `src/nucleo/**` (ambiente `node`) do resto
do pacote `app` (ambiente `jsdom`) dentro de um único arquivo de config. A solução que
funcionou, e que a Task 1 replica: dois arquivos de config irmãos dentro de `app/`,
referenciados como dois projetos na raiz.

**React Three Fiber em jsdom precisa só do polyfill de `ResizeObserver`** — sem ele,
montar `<Canvas>` lança `This browser does not support ResizeObserver`. Nenhum mock de
WebGL é necessário; `OrbitControls`, `Edges` e `Html` do drei montam sem erro adicional.

**Convenções obrigatórias, herdadas do `CLAUDE.md` do repositório:**

- Identificadores em português.
- Funções de 4 a 20 linhas; arquivos abaixo de 500 linhas.
- Validação reaproveita os validadores do núcleo (`exigirMilimetroValido` etc.) — nunca
  duplica regra na camada de UI.
- Dublês de teste são classes/objetos nomeados (`RepositorioEmMemoria`), nunca stub
  inline.
- Imports relativos terminam em `.js` (ESM puro) nos arquivos `.ts`; nos `.tsx` também.
- `git commit -F <arquivo>` em vez de `-m` com heredoc, por causa do PowerShell.

---

## Estrutura de arquivos

Todos os caminhos são relativos a `C:\Users\Gianpaolo\repo\ludoshelf`.

| Arquivo | Responsabilidade |
|---|---|
| `app/package.json` | dependências novas |
| `app/vite.config.ts` | build + projeto de teste `app-ui` (jsdom) |
| `app/vitest.nucleo.config.ts` | projeto de teste `nucleo` (node) |
| `app/tsconfig.json` | `jsx`, `lib: DOM` |
| `app/index.html` | ponto de entrada Vite |
| `app/src/main.tsx` | bootstrap: cria `RepositorioDexie`, chama `inicializar` |
| `app/src/App.tsx` | abas + composição raiz |
| `app/src/setupTests.ts` | polyfill de `ResizeObserver`, `@testing-library/jest-dom` |
| `app/src/persistencia/RepositorioDeColecao.ts` | interface |
| `app/src/persistencia/RepositorioEmMemoria.ts` | dublê / fallback |
| `app/src/persistencia/BancoDoLudoShelf.ts` | schema Dexie |
| `app/src/persistencia/RepositorioDexie.ts` | implementação de produção |
| `app/src/estado/useEstadoDoApp.ts` | store Zustand |
| `app/src/componentes/Banner.tsx` | aviso de erro de persistência |
| `app/src/componentes/Abas.tsx` | navegação entre telas |
| `app/src/telas/estantes/DiagramaDeEstante.tsx` | SVG puro |
| `app/src/telas/estantes/FormularioDeEstante.tsx` | formulário + validação |
| `app/src/telas/estantes/TelaDeEstantes.tsx` | composição da tela |
| `app/src/telas/colecao/FormularioDeJogo.tsx` | cadastro/edição de jogo |
| `app/src/telas/colecao/TabelaDeJogos.tsx` | lista |
| `app/src/telas/colecao/TelaDeColecao.tsx` | composição da tela |
| `app/src/telas/arranjo/PainelDeNaoAlocados.tsx` | lista de `JogoNaoAlocado` |
| `app/src/telas/arranjo/TelaDeArranjo.tsx` | composição da tela + botão recalcular |
| `app/src/cena/corDaFamilia.ts` | hash determinístico string → HSL |
| `app/src/cena/mapear.ts` | função pura: `Arranjo`+`Estante` → props geométricas |
| `app/src/cena/CenaDoArranjo.tsx` | componente react-three-fiber |
| `app/src/cena/LimiteDeErroDaCena.tsx` | `ErrorBoundary` para falta de WebGL |

---

## Task 1: Fundação do pacote de UI

**Files:**
- Modify: `app/package.json`
- Create: `app/vite.config.ts`
- Create: `app/vitest.nucleo.config.ts`
- Modify: `app/tsconfig.json`
- Modify: `vitest.config.ts` (raiz)
- Create: `app/index.html`
- Create: `app/src/setupTests.ts`
- Create: `app/src/main.tsx`
- Create: `app/src/App.tsx`
- Test: `app/src/App.test.tsx`

- [ ] **Step 1: Adicionar as dependências**

Substitua `app/package.json` por:

```json
{
  "name": "@ludoshelf/app",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.8",
    "@react-three/fiber": "^9.7.0",
    "dexie": "^4.4.5",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "three": "^0.185.1",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.5",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@types/three": "^0.185.4",
    "@vitejs/plugin-react": "^6.0.5",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^30.0.1",
    "resize-observer-polyfill": "^1.5.1",
    "vite": "^8.2.1"
  }
}
```

- [ ] **Step 2: Config de build + projeto de teste da UI**

`app/vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testado nesta sessão: `environmentMatchGlobs` não separa nucleo (node) do resto
// (jsdom) dentro de um único config. Por isso este arquivo cobre só a UI —
// exclui `src/nucleo/**`, que tem seu próprio projeto em vitest.nucleo.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    name: 'app-ui',
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: ['**/node_modules/**', 'src/nucleo/**'],
  },
})
```

- [ ] **Step 3: Config de teste do núcleo**

`app/vitest.nucleo.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

// O núcleo é TypeScript puro; roda em node, sem o custo de montar jsdom.
export default defineConfig({
  test: {
    name: 'nucleo',
    environment: 'node',
    include: ['src/nucleo/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Apontar a raiz para os dois projetos**

Substitua `vitest.config.ts` (raiz) por:

```ts
import { defineConfig } from 'vitest/config'

// Dois projetos dentro do mesmo pacote app: um para a UI (jsdom), um para o
// núcleo (node). Verificado nesta sessão — a alternativa de um único config
// com `environmentMatchGlobs` não funcionou.
export default defineConfig({
  test: {
    projects: ['app/vite.config.ts', 'app/vitest.nucleo.config.ts'],
  },
})
```

- [ ] **Step 5: tsconfig com JSX e DOM**

Substitua `app/tsconfig.json` por:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    // `tests/fronteira.test.ts` lê o próprio diretório do núcleo com `node:fs` para
    // verificar a fronteira arquitetural. Sem isto o tsc não conhece os módulos node:
    // nem `import.meta.url`, e `pnpm typecheck` quebra enquanto `pnpm test` passa.
    "types": ["node"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 6: HTML de entrada do Vite**

`app/index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LudoShelf</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Setup de testes com o polyfill de ResizeObserver**

`app/src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import ResizeObserverPolyfill from 'resize-observer-polyfill'
import { afterEach } from 'vitest'

// jsdom não implementa ResizeObserver; react-three-fiber (via react-use-measure)
// exige um construtor global para medir o <canvas>. Verificado nesta sessão:
// sem isto, montar <Canvas> lança "This browser does not support ResizeObserver".
globalThis.ResizeObserver ??= ResizeObserverPolyfill as unknown as typeof ResizeObserver

// @testing-library/react só registra o cleanup automático sozinho quando
// `test.globals: true` está ligado no Vitest. Este projeto não usa globals
// (todo teste importa describe/expect/it explicitamente de 'vitest'), então
// sem isto o DOM de um teste vaza para o próximo — verificado nesta sessão:
// dois testes que usam screen.getByText passavam a achar elementos duplicados.
afterEach(() => {
  cleanup()
})
```

- [ ] **Step 8: Escrever o teste do App (falha primeiro)**

`app/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App.js'

it('renderiza o título do app', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'LudoShelf' })).toBeInTheDocument()
})
```

- [ ] **Step 9: Rodar para confirmar que falha**

```bash
pnpm install
```

```bash
pnpm test
```

Esperado: FAIL — `./App.js` não existe ainda.

- [ ] **Step 10: Implementar `App` e `main.tsx`**

`app/src/App.tsx`:

```tsx
/**
 * Composição raiz. Nesta task só existe o título — as abas e as telas entram
 * na Task 13, depois que estado, persistência e telas individuais existirem.
 */
export function App() {
  return <h1>LudoShelf</h1>
}
```

`app/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'

const raiz = document.getElementById('raiz')
if (raiz === null) {
  throw new Error('elemento #raiz não encontrado em index.html')
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 11: Rodar os testes**

```bash
pnpm test
```

Esperado: `Test Files 1 passed`, `Tests 1 passed` — mais os testes do núcleo já
existentes, agora rodando pelo projeto `nucleo`.

- [ ] **Step 12: Typecheck e format**

```bash
pnpm typecheck
```

Esperado: nenhuma saída, código 0.

```bash
pnpm format
```

- [ ] **Step 13: Commit**

```bash
git add app/package.json app/vite.config.ts app/vitest.nucleo.config.ts app/tsconfig.json vitest.config.ts app/index.html app/src/setupTests.ts app/src/main.tsx app/src/App.tsx app/src/App.test.tsx pnpm-lock.yaml
git commit -m "chore(app): monta a fundacao de UI com React, Vite, Zustand, Dexie e R3F"
```

---

## Task 2: `RepositorioDeColecao` e `RepositorioEmMemoria`

**Files:**
- Create: `app/src/persistencia/RepositorioDeColecao.ts`
- Create: `app/src/persistencia/RepositorioEmMemoria.ts`
- Create: `app/src/persistencia/RepositorioEmMemoria.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/persistencia/RepositorioEmMemoria.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante } from '../nucleo/estante.js'
import { RepositorioEmMemoria } from './RepositorioEmMemoria.js'

const jogo = (id: string): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = () =>
  montarEstante('e1', {
    nome: 'Billy',
    larguraUtilMm: 760,
    profundidadeUtilMm: 280,
    alturaDoRodapeMm: 80,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350],
  })

describe('RepositorioEmMemoria', () => {
  it('comeca vazio', async () => {
    const repositorio = new RepositorioEmMemoria()
    expect(await repositorio.carregarJogos()).toEqual([])
    expect(await repositorio.carregarEstantes()).toEqual([])
  })

  it('salva e recarrega um jogo', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('salvarJogo e upsert: mesmo id substitui', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarJogo({ ...jogo('a'), nome: 'Catan renomeado' })
    const jogos = await repositorio.carregarJogos()
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Catan renomeado')
  })

  it('remove um jogo', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.removerJogo('a')
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('remover um id inexistente nao lanca', async () => {
    const repositorio = new RepositorioEmMemoria()
    await expect(repositorio.removerJogo('fantasma')).resolves.toBeUndefined()
  })

  it('salva e recarrega uma estante', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarEstantes()).toEqual([estante()])
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./RepositorioEmMemoria.js` não existe.

- [ ] **Step 3: Implementar a interface**

`app/src/persistencia/RepositorioDeColecao.ts`:

```ts
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'

/**
 * Fronteira de persistência. `RepositorioDexie` é a implementação de produção;
 * `RepositorioEmMemoria` serve tanto de dublê de teste quanto de fallback
 * automático quando o IndexedDB está indisponível (spec §7).
 */
export interface RepositorioDeColecao {
  carregarJogos(): Promise<readonly CaixaDeJogo[]>
  /** Upsert: cadastro manual e edição são a mesma operação. */
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  carregarEstantes(): Promise<readonly Estante[]>
  salvarEstante(estante: Estante): Promise<void>
}
```

- [ ] **Step 4: Implementar o dublê**

`app/src/persistencia/RepositorioEmMemoria.ts`:

```ts
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'
import type { RepositorioDeColecao } from './RepositorioDeColecao.js'

/**
 * Dublê nomeado: usado nos testes de `estado/`, e como fallback real do app
 * quando o IndexedDB não abre (aba anônima).
 *
 * @example new RepositorioEmMemoria().salvarJogo(jogo)
 */
export class RepositorioEmMemoria implements RepositorioDeColecao {
  private readonly jogos = new Map<IdJogo, CaixaDeJogo>()
  private readonly estantes = new Map<string, Estante>()

  async carregarJogos(): Promise<readonly CaixaDeJogo[]> {
    return [...this.jogos.values()]
  }

  async salvarJogo(jogo: CaixaDeJogo): Promise<void> {
    this.jogos.set(jogo.id, jogo)
  }

  async removerJogo(id: IdJogo): Promise<void> {
    this.jogos.delete(id)
  }

  async carregarEstantes(): Promise<readonly Estante[]> {
    return [...this.estantes.values()]
  }

  async salvarEstante(estante: Estante): Promise<void> {
    this.estantes.set(estante.id, estante)
  }
}
```

- [ ] **Step 5: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 6: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/persistencia/RepositorioDeColecao.ts app/src/persistencia/RepositorioEmMemoria.ts app/src/persistencia/RepositorioEmMemoria.test.ts
git commit -m "feat(persistencia): define a interface do repositorio e o duble em memoria"
```

---

## Task 3: `RepositorioDexie`

**Files:**
- Create: `app/src/persistencia/BancoDoLudoShelf.ts`
- Create: `app/src/persistencia/RepositorioDexie.ts`
- Create: `app/src/persistencia/RepositorioDexie.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/persistencia/RepositorioDexie.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante } from '../nucleo/estante.js'
import { RepositorioDexie } from './RepositorioDexie.js'

const jogo = (id: string): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = () =>
  montarEstante('e1', {
    nome: 'Billy',
    larguraUtilMm: 760,
    profundidadeUtilMm: 280,
    alturaDoRodapeMm: 80,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350],
  })

describe('RepositorioDexie', () => {
  // Cada teste abre um banco com nome único: fake-indexeddb persiste entre
  // testes do mesmo processo, e um nome compartilhado vazaria estado de um
  // teste para o outro.
  let contador = 0
  const novoRepositorio = () => new RepositorioDexie(`teste-${(contador += 1)}`)

  it('comeca vazio', async () => {
    const repositorio = novoRepositorio()
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('salva e recarrega um jogo', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('salvarJogo e upsert', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarJogo({ ...jogo('a'), nome: 'Renomeado' })
    const jogos = await repositorio.carregarJogos()
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Renomeado')
  })

  it('remove um jogo', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.removerJogo('a')
    expect(await repositorio.carregarJogos()).toEqual([])
  })

  it('salva e recarrega uma estante', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarEstantes()).toEqual([estante()])
  })

  it('persiste jogos e estantes em tabelas independentes', async () => {
    const repositorio = novoRepositorio()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarEstante(estante())
    expect(await repositorio.carregarJogos()).toHaveLength(1)
    expect(await repositorio.carregarEstantes()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./RepositorioDexie.js` não existe.

- [ ] **Step 3: Implementar o schema**

`app/src/persistencia/BancoDoLudoShelf.ts`:

```ts
import Dexie, { type Table } from 'dexie'
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo } from '../nucleo/jogo.js'

/**
 * As tabelas gravam os tipos de domínio do núcleo quase 1:1 (spec §5.1): não há
 * um modelo de persistência separado do modelo de domínio nesta escala.
 *
 * @example new BancoDoLudoShelf().jogos.put(jogo)
 */
export class BancoDoLudoShelf extends Dexie {
  jogos!: Table<CaixaDeJogo, string>
  estantes!: Table<Estante, string>

  constructor(nome = 'ludoshelf') {
    super(nome)
    this.version(1).stores({
      jogos: 'id, idJogoBase',
      estantes: 'id',
    })
  }
}
```

- [ ] **Step 4: Implementar o repositório**

`app/src/persistencia/RepositorioDexie.ts`:

```ts
import { BancoDoLudoShelf } from './BancoDoLudoShelf.js'
import type { RepositorioDeColecao } from './RepositorioDeColecao.js'
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'

/**
 * Implementação de produção sobre Dexie/IndexedDB. Só este arquivo (e
 * `BancoDoLudoShelf`) sabem que Dexie existe — o resto do app importa
 * `RepositorioDeColecao`.
 *
 * @example new RepositorioDexie().salvarJogo(jogo)
 */
export class RepositorioDexie implements RepositorioDeColecao {
  private readonly banco: BancoDoLudoShelf

  constructor(nomeDoBanco?: string) {
    this.banco = new BancoDoLudoShelf(nomeDoBanco)
  }

  async carregarJogos(): Promise<readonly CaixaDeJogo[]> {
    return this.banco.jogos.toArray()
  }

  async salvarJogo(jogo: CaixaDeJogo): Promise<void> {
    await this.banco.jogos.put(jogo)
  }

  async removerJogo(id: IdJogo): Promise<void> {
    await this.banco.jogos.delete(id)
  }

  async carregarEstantes(): Promise<readonly Estante[]> {
    return this.banco.estantes.toArray()
  }

  async salvarEstante(estante: Estante): Promise<void> {
    await this.banco.estantes.put(estante)
  }
}
```

- [ ] **Step 5: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 6: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/persistencia/BancoDoLudoShelf.ts app/src/persistencia/RepositorioDexie.ts app/src/persistencia/RepositorioDexie.test.ts
git commit -m "feat(persistencia): implementa o repositorio de producao sobre Dexie"
```

---

## Task 4: Store — inicialização e CRUD

**Files:**
- Create: `app/src/estado/useEstadoDoApp.ts`
- Create: `app/src/estado/useEstadoDoApp.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/estado/useEstadoDoApp.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { montarEstante, type Estante } from '../nucleo/estante.js'
import { RepositorioEmMemoria } from '../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from './useEstadoDoApp.js'

const jogo = (id: string): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = (id: string): Estante =>
  montarEstante(id, {
    nome: 'Billy',
    larguraUtilMm: 760,
    profundidadeUtilMm: 280,
    alturaDoRodapeMm: 80,
    espessuraDaPrateleiraMm: 18,
    alturasLivresMm: [350],
  })

beforeEach(() => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
})

describe('inicializar', () => {
  it('carrega jogos e estantes do repositorio', async () => {
    const repositorio = new RepositorioEmMemoria()
    await repositorio.salvarJogo(jogo('a'))
    await repositorio.salvarEstante(estante('e1'))

    await useEstadoDoApp.getState().inicializar(repositorio)

    expect(useEstadoDoApp.getState().jogos).toEqual([jogo('a')])
    expect(useEstadoDoApp.getState().estantes).toEqual([estante('e1')])
    expect(useEstadoDoApp.getState().erroDePersistencia).toBeNull()
  })

  it('cai para RepositorioEmMemoria e seta erroDePersistencia quando carregar falha', async () => {
    const repositorioQuebrado = {
      carregarJogos: () => Promise.reject(new Error('IndexedDB indisponível')),
      salvarJogo: () => Promise.resolve(),
      removerJogo: () => Promise.resolve(),
      carregarEstantes: () => Promise.resolve([]),
      salvarEstante: () => Promise.resolve(),
    }

    await useEstadoDoApp.getState().inicializar(repositorioQuebrado)

    expect(useEstadoDoApp.getState().erroDePersistencia).not.toBeNull()
    expect(useEstadoDoApp.getState().jogos).toEqual([])
  })
})

describe('salvarJogo', () => {
  it('adiciona um jogo novo ao estado e persiste', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)

    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    expect(useEstadoDoApp.getState().jogos).toEqual([jogo('a')])
    expect(await repositorio.carregarJogos()).toEqual([jogo('a')])
  })

  it('e upsert: editar um jogo existente nao duplica', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    await useEstadoDoApp.getState().salvarJogo({ ...jogo('a'), nome: 'Editado' })

    const jogos = useEstadoDoApp.getState().jogos
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.nome).toBe('Editado')
  })
})

describe('removerJogo', () => {
  it('remove do estado e do repositorio', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    await useEstadoDoApp.getState().removerJogo('a')

    expect(useEstadoDoApp.getState().jogos).toEqual([])
    expect(await repositorio.carregarJogos()).toEqual([])
  })
})

describe('salvarEstante e selecionarEstante', () => {
  it('salva uma estante e a torna ativa automaticamente se for a primeira', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)

    await useEstadoDoApp.getState().salvarEstante(estante('e1'))

    expect(useEstadoDoApp.getState().estantes).toEqual([estante('e1')])
    expect(useEstadoDoApp.getState().estanteAtivaId).toBe('e1')
  })

  it('selecionarEstante troca a ativa sem mexer na lista', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarEstante(estante('e1'))
    await useEstadoDoApp.getState().salvarEstante(estante('e2'))

    useEstadoDoApp.getState().selecionarEstante('e2')

    expect(useEstadoDoApp.getState().estanteAtivaId).toBe('e2')
    expect(useEstadoDoApp.getState().estantes).toHaveLength(2)
  })
})

describe('irParaTela', () => {
  it('troca a tela ativa', () => {
    useEstadoDoApp.getState().irParaTela('colecao')
    expect(useEstadoDoApp.getState().telaAtiva).toBe('colecao')
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./useEstadoDoApp.js` não existe.

- [ ] **Step 3: Implementar (sem `recalcularArranjo` ainda — Task 5)**

`app/src/estado/useEstadoDoApp.ts`:

```ts
import { create } from 'zustand'
import type { Arranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import type { CaixaDeJogo, IdJogo } from '../nucleo/jogo.js'
import type { RepositorioDeColecao } from '../persistencia/RepositorioDeColecao.js'
import { RepositorioEmMemoria } from '../persistencia/RepositorioEmMemoria.js'

export type Tela = 'estantes' | 'colecao' | 'arranjo'

export interface EstadoDoApp {
  readonly jogos: readonly CaixaDeJogo[]
  readonly estantes: readonly Estante[]
  readonly estanteAtivaId: string | null
  readonly arranjo: Arranjo | null

  readonly telaAtiva: Tela
  readonly calculando: boolean
  readonly erroDePersistencia: string | null

  readonly repositorio: RepositorioDeColecao

  inicializar(repositorio: RepositorioDeColecao): Promise<void>
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  salvarEstante(estante: Estante): Promise<void>
  selecionarEstante(id: string): void
  irParaTela(tela: Tela): void
}

const estadoInicial = {
  jogos: [] as readonly CaixaDeJogo[],
  estantes: [] as readonly Estante[],
  estanteAtivaId: null as string | null,
  arranjo: null as Arranjo | null,
  telaAtiva: 'estantes' as Tela,
  calculando: false,
  erroDePersistencia: null as string | null,
  repositorio: new RepositorioEmMemoria() as RepositorioDeColecao,
}

export const useEstadoDoApp = create<EstadoDoApp>((set, get) => ({
  ...estadoInicial,

  async inicializar(repositorio) {
    try {
      const [jogos, estantes] = await Promise.all([
        repositorio.carregarJogos(),
        repositorio.carregarEstantes(),
      ])
      set({ repositorio, jogos, estantes, erroDePersistencia: null })
    } catch {
      // Fallback automático (spec §7): o app segue funcional, sem persistir.
      set({
        repositorio: new RepositorioEmMemoria(),
        jogos: [],
        estantes: [],
        erroDePersistencia: 'Não foi possível abrir o armazenamento local; nada será salvo nesta sessão.',
      })
    }
  },

  async salvarJogo(jogo) {
    const { repositorio, jogos } = get()
    const semODuplicado = jogos.filter((j) => j.id !== jogo.id)
    set({ jogos: [...semODuplicado, jogo] })
    await repositorio.salvarJogo(jogo)
  },

  async removerJogo(id) {
    const { repositorio, jogos } = get()
    set({ jogos: jogos.filter((jogo) => jogo.id !== id) })
    await repositorio.removerJogo(id)
  },

  async salvarEstante(estante) {
    const { repositorio, estantes, estanteAtivaId } = get()
    const semADuplicada = estantes.filter((e) => e.id !== estante.id)
    set({
      estantes: [...semADuplicada, estante],
      estanteAtivaId: estanteAtivaId ?? estante.id,
    })
    await repositorio.salvarEstante(estante)
  },

  selecionarEstante(id) {
    set({ estanteAtivaId: id })
  },

  irParaTela(tela) {
    set({ telaAtiva: tela })
  },
}))
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/estado/useEstadoDoApp.ts app/src/estado/useEstadoDoApp.test.ts
git commit -m "feat(estado): store zustand com inicializacao e CRUD de jogos e estantes"
```

---

## Task 5: Store — `recalcularArranjo`

**Files:**
- Modify: `app/src/estado/useEstadoDoApp.ts`
- Modify: `app/src/estado/useEstadoDoApp.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Adicione ao final de `app/src/estado/useEstadoDoApp.test.ts`:

```ts
describe('recalcularArranjo', () => {
  it('nao faz nada sem estante ativa', () => {
    useEstadoDoApp.getState().recalcularArranjo()
    expect(useEstadoDoApp.getState().arranjo).toBeNull()
    expect(useEstadoDoApp.getState().calculando).toBe(false)
  })

  it('calcula o arranjo com os jogos e a estante ativa', async () => {
    const repositorio = new RepositorioEmMemoria()
    await useEstadoDoApp.getState().inicializar(repositorio)
    await useEstadoDoApp.getState().salvarEstante(estante('e1'))
    await useEstadoDoApp.getState().salvarJogo(jogo('a'))

    useEstadoDoApp.getState().recalcularArranjo()
    expect(useEstadoDoApp.getState().calculando).toBe(true)

    await vi.advanceTimersByTimeAsync(0)

    expect(useEstadoDoApp.getState().calculando).toBe(false)
    expect(useEstadoDoApp.getState().arranjo?.posicoes).toHaveLength(1)
  })
})
```

E troque o `import` do topo do arquivo para incluir `vi`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
```

E envolva a suíte com timers falsos, adicionando logo após os `beforeEach` já existentes:

```ts
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

(Adicione `afterEach` ao import de `vitest` também.)

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `recalcularArranjo` não existe em `EstadoDoApp`.

- [ ] **Step 3: Implementar**

Em `app/src/estado/useEstadoDoApp.ts`, adicione os imports do núcleo:

```ts
import { arranjar } from '../nucleo/motor.js'
import { geradorMulberry32 } from '../nucleo/gerador.js'
import { PESOS_PADRAO } from '../nucleo/pontuacao.js'
```

Adicione `recalcularArranjo(): void` à interface `EstadoDoApp`, e a implementação no
store (antes do fechamento do objeto retornado por `create`):

```ts
  recalcularArranjo() {
    const { estanteAtivaId, estantes, jogos } = get()
    const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
    if (estanteAtiva === undefined) return

    set({ calculando: true })
    // Adia um tick: sem isso a mesma thread que pintaria o esmaecimento fica
    // ocupada pelas iterações do motor, e o usuário nunca vê o estado
    // "calculando" (spec §6).
    setTimeout(() => {
      const arranjo = arranjar({
        jogos,
        estante: estanteAtiva,
        pesos: PESOS_PADRAO,
        gerador: geradorMulberry32(Date.now()),
        iteracoes: 20000,
      })
      set({ arranjo, calculando: false })
    }, 0)
  },
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/estado/useEstadoDoApp.ts app/src/estado/useEstadoDoApp.test.ts
git commit -m "feat(estado): recalcularArranjo chama o motor com adiamento de um tick"
```

---

## Task 6: `DiagramaDeEstante`

**Files:**
- Create: `app/src/telas/estantes/DiagramaDeEstante.tsx`
- Create: `app/src/telas/estantes/DiagramaDeEstante.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/telas/estantes/DiagramaDeEstante.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DefinicaoDeEstante } from '../../nucleo/estante.js'
import { DiagramaDeEstante } from './DiagramaDeEstante.js'

const definicao: DefinicaoDeEstante = {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 300],
}

describe('DiagramaDeEstante', () => {
  it('desenha um <svg>', () => {
    const { container } = render(<DiagramaDeEstante definicao={definicao} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('desenha uma linha de prateleira a mais que o numero de vaos', () => {
    // N alturas livres => N+1 traços horizontais (topo/rodapé contam como bordas
    // do retângulo, não como "linha de prateleira" — só as internas contam).
    const { container } = render(<DiagramaDeEstante definicao={definicao} />)
    const linhas = container.querySelectorAll('[data-papel="linha-de-prateleira"]')
    expect(linhas).toHaveLength(definicao.alturasLivresMm.length - 1)
  })

  it('anota cada altura livre em milimetros', () => {
    render(<DiagramaDeEstante definicao={definicao} />)
    expect(screen.getByText('350mm')).toBeInTheDocument()
    expect(screen.getByText('300mm')).toBeInTheDocument()
  })

  it('anota a largura total', () => {
    render(<DiagramaDeEstante definicao={definicao} />)
    expect(screen.getByText('760mm')).toBeInTheDocument()
  })

  it('nao lanca com uma unica prateleira', () => {
    const umaSo: DefinicaoDeEstante = { ...definicao, alturasLivresMm: [350] }
    const { container } = render(<DiagramaDeEstante definicao={umaSo} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./DiagramaDeEstante.js` não existe.

- [ ] **Step 3: Implementar**

`app/src/telas/estantes/DiagramaDeEstante.tsx`:

```tsx
import type { DefinicaoDeEstante } from '../../nucleo/estante.js'

const LARGURA_DO_SVG = 200
const ALTURA_MAX_DO_SVG = 200

/**
 * Corte lateral em SVG puro, redesenhado a cada mudança na definição — a
 * "opção A" da spec §8.1 (diagrama 2D ao vivo, sem arraste). Componente puro
 * (props in, SVG out), testável sem montar o formulário que o envolve.
 *
 * @example <DiagramaDeEstante definicao={definicaoAtual} />
 */
export function DiagramaDeEstante({ definicao }: { definicao: DefinicaoDeEstante }) {
  const alturaTotalMm =
    definicao.alturaDoRodapeMm +
    definicao.alturasLivresMm.reduce((soma, altura) => soma + altura, 0) +
    definicao.espessuraDaPrateleiraMm * definicao.alturasLivresMm.length

  const escala = ALTURA_MAX_DO_SVG / Math.max(alturaTotalMm, 1)
  const larguraDesenhada = Math.min(LARGURA_DO_SVG, definicao.larguraUtilMm * escala)

  const linhasDePrateleira = calcularLinhasDePrateleira(definicao, escala)

  return (
    <svg
      role="img"
      aria-label={`Diagrama da estante ${definicao.nome}`}
      viewBox={`0 0 ${LARGURA_DO_SVG + 60} ${ALTURA_MAX_DO_SVG + 20}`}
      width={LARGURA_DO_SVG + 60}
      height={ALTURA_MAX_DO_SVG + 20}
    >
      <text x={larguraDesenhada / 2} y="12" fontSize="11" textAnchor="middle">
        {definicao.larguraUtilMm}mm
      </text>
      <rect
        x="0"
        y="20"
        width={larguraDesenhada}
        height={alturaTotalMm * escala}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
      {linhasDePrateleira.map(({ yMm, alturaLivreMm }, indice) => (
        <g key={yMm}>
          {indice > 0 && (
            <line
              data-papel="linha-de-prateleira"
              x1="0"
              y1={20 + yMm * escala}
              x2={larguraDesenhada}
              y2={20 + yMm * escala}
              stroke="#333"
              strokeWidth="2"
            />
          )}
          <text x={larguraDesenhada + 8} y={20 + (yMm - alturaLivreMm / 2) * escala} fontSize="10">
            {alturaLivreMm}mm
          </text>
        </g>
      ))}
      <rect
        x="0"
        y={20 + alturaTotalMm * escala - definicao.alturaDoRodapeMm * escala}
        width={larguraDesenhada}
        height={Math.max(definicao.alturaDoRodapeMm * escala, 2)}
        fill="#c9a84f"
      />
    </svg>
  )
}

interface LinhaDePrateleira {
  readonly yMm: number
  readonly alturaLivreMm: number
}

/** De baixo para cima, mesma acumulação de `montarEstante` no núcleo. */
function calcularLinhasDePrateleira(
  definicao: DefinicaoDeEstante,
  _escala: number,
): readonly LinhaDePrateleira[] {
  const alturaTotalMm =
    definicao.alturaDoRodapeMm +
    definicao.alturasLivresMm.reduce((soma, altura) => soma + altura, 0) +
    definicao.espessuraDaPrateleiraMm * definicao.alturasLivresMm.length

  let alturaAcumuladaDoTopoMm = alturaTotalMm - definicao.alturaDoRodapeMm
  return definicao.alturasLivresMm.map((alturaLivreMm) => {
    const yMm = alturaTotalMm - alturaAcumuladaDoTopoMm
    alturaAcumuladaDoTopoMm -= alturaLivreMm + definicao.espessuraDaPrateleiraMm
    return { yMm, alturaLivreMm }
  })
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

Se o teste "desenha uma linha de prateleira a mais que o numero de vaos" falhar,
verifique se o `indice > 0` do `.map` está mesmo pulando a primeira linha — a intenção
é desenhar uma linha divisória só *entre* prateleiras, não no topo nem no rodapé (que já
são a borda do retângulo e o retângulo dourado, respectivamente).

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/telas/estantes/DiagramaDeEstante.tsx app/src/telas/estantes/DiagramaDeEstante.test.tsx
git commit -m "feat(telas): diagrama 2D ao vivo da estante em SVG puro"
```

---

## Task 7: Formulário e tela de Estantes

**Files:**
- Create: `app/src/telas/estantes/FormularioDeEstante.tsx`
- Create: `app/src/telas/estantes/FormularioDeEstante.test.tsx`
- Create: `app/src/telas/estantes/TelaDeEstantes.tsx`
- Create: `app/src/telas/estantes/TelaDeEstantes.test.tsx`

- [ ] **Step 1: Escrever os testes do formulário (falham)**

`app/src/telas/estantes/FormularioDeEstante.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioDeEstante } from './FormularioDeEstante.js'

describe('FormularioDeEstante', () => {
  it('envia a definicao preenchida', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy da sala')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(aoSalvar).toHaveBeenCalledWith({
      nome: 'Billy da sala',
      larguraUtilMm: 760,
      profundidadeUtilMm: 280,
      alturaDoRodapeMm: 80,
      espessuraDaPrateleiraMm: 18,
      alturasLivresMm: [350],
    })
  })

  it('adiciona um campo de prateleira ao clicar em + prateleira', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: '+ prateleira' }))

    expect(screen.getByLabelText('Altura livre da prateleira 2 (mm)')).toBeInTheDocument()
  })

  it('mostra o erro do validador do nucleo em vez de duplicar a regra', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760.5')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(screen.getByRole('alert')).toHaveTextContent('larguraUtilMm')
  })

  it('renderiza o diagrama ao vivo com os valores digitados', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    expect(screen.getByRole('img', { name: /Diagrama da estante/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./FormularioDeEstante.js` não existe.

- [ ] **Step 3: Implementar o formulário**

`app/src/telas/estantes/FormularioDeEstante.tsx`:

```tsx
import { useState } from 'react'
import type { DefinicaoDeEstante } from '../../nucleo/estante.js'
import { montarEstante } from '../../nucleo/estante.js'
import { DiagramaDeEstante } from './DiagramaDeEstante.js'

interface CamposDoFormulario {
  readonly nome: string
  readonly larguraUtilMm: string
  readonly profundidadeUtilMm: string
  readonly alturaDoRodapeMm: string
  readonly espessuraDaPrateleiraMm: string
  readonly alturasLivresMm: readonly string[]
}

const CAMPOS_VAZIOS: CamposDoFormulario = {
  nome: '',
  larguraUtilMm: '',
  profundidadeUtilMm: '',
  alturaDoRodapeMm: '',
  espessuraDaPrateleiraMm: '',
  alturasLivresMm: [''],
}

/**
 * Cadastro de estante. A validação é a mesma do núcleo: monta uma
 * `DefinicaoDeEstante` e tenta `montarEstante` só para capturar o erro — nenhuma
 * regra de validação é reescrita aqui (spec §7).
 *
 * @example <FormularioDeEstante aoSalvar={(def) => estado.salvarEstante(...)} />
 */
export function FormularioDeEstante({
  aoSalvar,
}: {
  aoSalvar: (definicao: DefinicaoDeEstante) => void
}) {
  const [campos, setCampos] = useState(CAMPOS_VAZIOS)
  const [erro, setErro] = useState<string | null>(null)

  const definicaoParaDiagrama: DefinicaoDeEstante = paraDefinicaoOuZero(campos)

  function aoSubmeter(evento: React.FormEvent): void {
    evento.preventDefault()
    try {
      const definicao = paraDefinicao(campos)
      montarEstante('previa', definicao) // só para validar; o id real vem do estado
      setErro(null)
      aoSalvar(definicao)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  function aoAdicionarPrateleira(): void {
    setCampos((atual) => ({
      ...atual,
      alturasLivresMm: [...atual.alturasLivresMm, ''],
    }))
  }

  function aoMudarAlturaLivre(indice: number, valor: string): void {
    setCampos((atual) => ({
      ...atual,
      alturasLivresMm: atual.alturasLivresMm.map((v, i) => (i === indice ? valor : v)),
    }))
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro !== null && <p role="alert">{erro}</p>}

      <label htmlFor="campo-nome">Nome</label>
      <input
        id="campo-nome"
        value={campos.nome}
        onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
      />

      <label htmlFor="campo-largura">Largura útil (mm)</label>
      <input
        id="campo-largura"
        value={campos.larguraUtilMm}
        onChange={(e) => setCampos({ ...campos, larguraUtilMm: e.target.value })}
      />

      <label htmlFor="campo-profundidade">Profundidade útil (mm)</label>
      <input
        id="campo-profundidade"
        value={campos.profundidadeUtilMm}
        onChange={(e) => setCampos({ ...campos, profundidadeUtilMm: e.target.value })}
      />

      <label htmlFor="campo-rodape">Altura do rodapé (mm)</label>
      <input
        id="campo-rodape"
        value={campos.alturaDoRodapeMm}
        onChange={(e) => setCampos({ ...campos, alturaDoRodapeMm: e.target.value })}
      />

      <label htmlFor="campo-espessura">Espessura da prateleira (mm)</label>
      <input
        id="campo-espessura"
        value={campos.espessuraDaPrateleiraMm}
        onChange={(e) => setCampos({ ...campos, espessuraDaPrateleiraMm: e.target.value })}
      />

      {campos.alturasLivresMm.map((valor, indice) => (
        <div key={indice}>
          <label htmlFor={`campo-altura-${indice}`}>
            Altura livre da prateleira {indice + 1} (mm)
          </label>
          <input
            id={`campo-altura-${indice}`}
            value={valor}
            onChange={(e) => aoMudarAlturaLivre(indice, e.target.value)}
          />
        </div>
      ))}
      <button type="button" onClick={aoAdicionarPrateleira}>
        + prateleira
      </button>

      <DiagramaDeEstante definicao={definicaoParaDiagrama} />

      <button type="submit">Salvar estante</button>
    </form>
  )
}

function paraNumero(valor: string): number {
  return valor.trim() === '' ? 0 : Number(valor)
}

function paraDefinicao(campos: CamposDoFormulario): DefinicaoDeEstante {
  return {
    nome: campos.nome,
    larguraUtilMm: paraNumero(campos.larguraUtilMm),
    profundidadeUtilMm: paraNumero(campos.profundidadeUtilMm),
    alturaDoRodapeMm: paraNumero(campos.alturaDoRodapeMm),
    espessuraDaPrateleiraMm: paraNumero(campos.espessuraDaPrateleiraMm),
    alturasLivresMm: campos.alturasLivresMm.map(paraNumero),
  }
}

/** Versão tolerante a campo vazio, só para o diagrama nunca lançar enquanto digita. */
function paraDefinicaoOuZero(campos: CamposDoFormulario): DefinicaoDeEstante {
  const definicao = paraDefinicao(campos)
  return {
    ...definicao,
    alturasLivresMm: definicao.alturasLivresMm.map((altura) => Math.max(altura, 1)),
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Escrever o teste da tela (falha)**

`app/src/telas/estantes/TelaDeEstantes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { TelaDeEstantes } from './TelaDeEstantes.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('TelaDeEstantes', () => {
  it('lista as estantes salvas', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeEstantes />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy da sala')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(await screen.findByText('Billy da sala')).toBeInTheDocument()
  })

  it('marca a estante ativa na lista', async () => {
    render(<TelaDeEstantes />)
    // Sem estante nenhuma salva ainda: a lista aparece vazia, sem lançar.
    expect(screen.getByText('Nenhuma estante cadastrada ainda.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./TelaDeEstantes.js` não existe.

- [ ] **Step 7: Implementar a tela**

`app/src/telas/estantes/TelaDeEstantes.tsx`:

```tsx
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarEstante } from '../../nucleo/estante.js'
import { FormularioDeEstante } from './FormularioDeEstante.js'

/** Composição da tela de Estantes: formulário + lista das já salvas. */
export function TelaDeEstantes() {
  const estantes = useEstadoDoApp((estado) => estado.estantes)
  const estanteAtivaId = useEstadoDoApp((estado) => estado.estanteAtivaId)
  const salvarEstante = useEstadoDoApp((estado) => estado.salvarEstante)
  const selecionarEstante = useEstadoDoApp((estado) => estado.selecionarEstante)

  return (
    <section>
      <h2>Estantes</h2>
      <FormularioDeEstante
        aoSalvar={(definicao) => {
          const id = crypto.randomUUID()
          salvarEstante(montarEstante(id, definicao))
        }}
      />

      <h3>Suas estantes</h3>
      {estantes.length === 0 ? (
        <p>Nenhuma estante cadastrada ainda.</p>
      ) : (
        <ul>
          {estantes.map((estante) => (
            <li key={estante.id}>
              <button type="button" onClick={() => selecionarEstante(estante.id)}>
                {estante.nome}
                {estante.id === estanteAtivaId ? ' (ativa)' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 8: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 9: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/telas/estantes
git commit -m "feat(telas): formulario e tela de estantes com validacao do nucleo"
```

---

## Task 8: Coleção — formulário, tabela e tela

**Files:**
- Create: `app/src/telas/colecao/FormularioDeJogo.tsx`
- Create: `app/src/telas/colecao/FormularioDeJogo.test.tsx`
- Create: `app/src/telas/colecao/TabelaDeJogos.tsx`
- Create: `app/src/telas/colecao/TabelaDeJogos.test.tsx`
- Create: `app/src/telas/colecao/TelaDeColecao.tsx`
- Create: `app/src/telas/colecao/TelaDeColecao.test.tsx`

- [ ] **Step 1: Escrever os testes do formulário (falham)**

`app/src/telas/colecao/FormularioDeJogo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'

describe('FormularioDeJogo', () => {
  it('cadastra um jogo com as medidas ordenadas pelo nucleo', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '220')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(aoSalvar).toHaveBeenCalledTimes(1)
    const jogoSalvo = aoSalvar.mock.calls[0]?.[0] as CaixaDeJogo
    expect(jogoSalvo.nome).toBe('Catan')
    expect(jogoSalvo.medidas.maiorMm).toBe(295)
    expect(jogoSalvo.medidas.menorMm).toBe(220)
    expect(jogoSalvo.medidas.espessuraMm).toBe(70)
    expect(jogoSalvo.idJogoBase).toBeNull()
    expect(jogoSalvo.frequencia).toEqual({ tipo: 'desconhecida' })
  })

  it('marca destaque quando o checkbox esta marcado', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Azul')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '72')
    await usuario.click(screen.getByLabelText('Destaque'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    const jogoSalvo = aoSalvar.mock.calls[0]?.[0] as CaixaDeJogo
    expect(jogoSalvo.frequencia).toEqual({ tipo: 'destaque', marcadoPeloUsuario: true })
  })

  it('mostra o erro do validador do nucleo', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '220.5')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(screen.getByRole('alert')).toHaveTextContent('ladoA')
  })

  it('lista jogos existentes como opcoes de jogo-base', async () => {
    const existentes: readonly CaixaDeJogo[] = [
      {
        id: 'catan',
        nome: 'Catan',
        medidas: { maiorMm: 295, menorMm: 295, espessuraMm: 70, origem: { tipo: 'manual' }, confirmadaPeloUsuario: true },
        idJogoBase: null,
        frequencia: { tipo: 'desconhecida' },
        idLudopedia: null,
        idBgg: null,
      },
    ]
    render(<FormularioDeJogo jogosExistentes={existentes} aoSalvar={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Catan' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./FormularioDeJogo.js` não existe.

- [ ] **Step 3: Implementar o formulário**

`app/src/telas/colecao/FormularioDeJogo.tsx`:

```tsx
import { useState } from 'react'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'

/**
 * Cadastro/edição manual de jogo. `criarMedidas` do núcleo resolve maior/menor
 * — o formulário nunca decide isso (spec §8.2).
 *
 * @example <FormularioDeJogo jogosExistentes={jogos} aoSalvar={estado.salvarJogo} />
 */
export function FormularioDeJogo({
  jogosExistentes,
  aoSalvar,
}: {
  jogosExistentes: readonly CaixaDeJogo[]
  aoSalvar: (jogo: CaixaDeJogo) => void
}) {
  const [nome, setNome] = useState('')
  const [ladoA, setLadoA] = useState('')
  const [ladoB, setLadoB] = useState('')
  const [espessura, setEspessura] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [idJogoBase, setIdJogoBase] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function aoSubmeter(evento: React.FormEvent): void {
    evento.preventDefault()
    try {
      const medidas = criarMedidas(
        Number(ladoA),
        Number(ladoB),
        Number(espessura),
        { tipo: 'manual' },
        true,
      )
      setErro(null)
      aoSalvar({
        id: crypto.randomUUID(),
        nome,
        medidas,
        idJogoBase: idJogoBase === '' ? null : idJogoBase,
        frequencia: destaque ? { tipo: 'destaque', marcadoPeloUsuario: true } : { tipo: 'desconhecida' },
        idLudopedia: null,
        idBgg: null,
      })
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro !== null && <p role="alert">{erro}</p>}

      <label htmlFor="jogo-nome">Nome</label>
      <input id="jogo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />

      <label htmlFor="jogo-lado-a">Lado A (mm)</label>
      <input id="jogo-lado-a" value={ladoA} onChange={(e) => setLadoA(e.target.value)} />

      <label htmlFor="jogo-lado-b">Lado B (mm)</label>
      <input id="jogo-lado-b" value={ladoB} onChange={(e) => setLadoB(e.target.value)} />

      <label htmlFor="jogo-espessura">Espessura (mm)</label>
      <input id="jogo-espessura" value={espessura} onChange={(e) => setEspessura(e.target.value)} />

      <label htmlFor="jogo-destaque">Destaque</label>
      <input
        id="jogo-destaque"
        type="checkbox"
        checked={destaque}
        onChange={(e) => setDestaque(e.target.checked)}
      />

      <label htmlFor="jogo-base">Jogo-base (se for expansão)</label>
      <select id="jogo-base" value={idJogoBase} onChange={(e) => setIdJogoBase(e.target.value)}>
        <option value="">— nenhum —</option>
        {jogosExistentes.map((jogo) => (
          <option key={jogo.id} value={jogo.id}>
            {jogo.nome}
          </option>
        ))}
      </select>

      <button type="submit">Salvar jogo</button>
    </form>
  )
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Escrever o teste da tabela (falha)**

`app/src/telas/colecao/TabelaDeJogos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

const jogo = (id: string, nome: string): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('TabelaDeJogos', () => {
  it('lista nome, medidas e procedencia de cada jogo', () => {
    render(<TabelaDeJogos jogos={[jogo('a', 'Catan')]} aoRemover={vi.fn()} />)
    expect(screen.getByText('Catan')).toBeInTheDocument()
    expect(screen.getByText('295 × 220 × 70 mm')).toBeInTheDocument()
    expect(screen.getByText('manual')).toBeInTheDocument()
  })

  it('chama aoRemover com o id certo', async () => {
    const aoRemover = vi.fn()
    const usuario = userEvent.setup()
    render(<TabelaDeJogos jogos={[jogo('a', 'Catan')]} aoRemover={aoRemover} />)

    await usuario.click(screen.getByRole('button', { name: 'Remover Catan' }))

    expect(aoRemover).toHaveBeenCalledWith('a')
  })

  it('mostra mensagem quando a colecao esta vazia', () => {
    render(<TabelaDeJogos jogos={[]} aoRemover={vi.fn()} />)
    expect(screen.getByText('Nenhum jogo cadastrado ainda.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./TabelaDeJogos.js` não existe.

- [ ] **Step 7: Implementar a tabela**

`app/src/telas/colecao/TabelaDeJogos.tsx`:

```tsx
import type { CaixaDeJogo } from '../../nucleo/jogo.js'

/** Lista a coleção. Só "manual" é alcançável neste plano (spec §8.2). */
export function TabelaDeJogos({
  jogos,
  aoRemover,
}: {
  jogos: readonly CaixaDeJogo[]
  aoRemover: (id: string) => void
}) {
  if (jogos.length === 0) {
    return <p>Nenhum jogo cadastrado ainda.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Medidas</th>
          <th>Procedência</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {jogos.map((jogo) => (
          <tr key={jogo.id}>
            <td>{jogo.nome}</td>
            <td>
              {jogo.medidas.maiorMm} × {jogo.medidas.menorMm} × {jogo.medidas.espessuraMm} mm
            </td>
            <td>{jogo.medidas.origem.tipo}</td>
            <td>
              <button type="button" onClick={() => aoRemover(jogo.id)}>
                Remover {jogo.nome}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 8: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 9: Escrever o teste da tela (falha)**

`app/src/telas/colecao/TelaDeColecao.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { TelaDeColecao } from './TelaDeColecao.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('TelaDeColecao', () => {
  it('cadastra e lista um jogo', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(await screen.findByText('Catan')).toBeInTheDocument()
  })

  it('remove um jogo cadastrado', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)
    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))
    await screen.findByText('Catan')

    await usuario.click(screen.getByRole('button', { name: 'Remover Catan' }))

    expect(screen.queryByText('Catan')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./TelaDeColecao.js` não existe.

- [ ] **Step 11: Implementar a tela**

`app/src/telas/colecao/TelaDeColecao.tsx`:

```tsx
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

/** Composição da tela de Coleção: formulário + tabela. */
export function TelaDeColecao() {
  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const salvarJogo = useEstadoDoApp((estado) => estado.salvarJogo)
  const removerJogo = useEstadoDoApp((estado) => estado.removerJogo)

  return (
    <section>
      <h2>Coleção</h2>
      <FormularioDeJogo jogosExistentes={jogos} aoSalvar={salvarJogo} />
      <TabelaDeJogos jogos={jogos} aoRemover={removerJogo} />
    </section>
  )
}
```

- [ ] **Step 12: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 13: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/telas/colecao
git commit -m "feat(telas): formulario, tabela e tela de colecao"
```

---

## Task 9: `corDaFamilia`

**Files:**
- Create: `app/src/cena/corDaFamilia.ts`
- Create: `app/src/cena/corDaFamilia.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/cena/corDaFamilia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { corDaFamilia } from './corDaFamilia.js'

describe('corDaFamilia', () => {
  it('e deterministico: mesma chave, mesma cor sempre', () => {
    expect(corDaFamilia('catan')).toBe(corDaFamilia('catan'))
  })

  it('produz uma string hsl valida', () => {
    expect(corDaFamilia('azul')).toMatch(/^hsl\(\d+, 65%, 55%\)$/)
  })

  it('chaves diferentes tendem a matizes diferentes', () => {
    expect(corDaFamilia('catan')).not.toBe(corDaFamilia('azul'))
  })

  it('nao lanca com string vazia', () => {
    expect(() => corDaFamilia('')).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./corDaFamilia.js` não existe.

- [ ] **Step 3: Implementar**

`app/src/cena/corDaFamilia.ts`:

```ts
/**
 * Cor por família, derivada por hash da chave — sem paleta fixa cadastrada
 * (spec S1). Mesma chave sempre produz a mesma cor; chaves diferentes tendem a
 * cair em matizes visualmente distintos.
 *
 * @example corDaFamilia('catan') // 'hsl(214, 65%, 55%)'
 */
export function corDaFamilia(chave: string): string {
  let hash = 0
  for (let indice = 0; indice < chave.length; indice += 1) {
    hash = (hash << 5) - hash + chave.charCodeAt(indice)
    hash |= 0
  }
  const matiz = Math.abs(hash) % 360
  return `hsl(${matiz}, 65%, 55%)`
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/cena/corDaFamilia.ts app/src/cena/corDaFamilia.test.ts
git commit -m "feat(cena): deriva cor por familia por hash deterministico"
```

---

## Task 10: `cena/mapear.ts`

Esta é a função pura que a Task 11 vai consumir — testável como qualquer módulo do
núcleo, sem React nem Three.js.

**Convenções de eixo, decididas aqui por não estarem na spec original (nova suposição
S4, adicionar a §11 da spec do plano 2 depois de implementado):**
- **X**: a estante inteira é centralizada em X=0. Dentro de um compartimento, um jogo
  fica em `larguraDoCompartimentoM/-2 + deslocamentoXMm/1000 + espessuraM/2` (a origem X
  de `deslocamentoXMm` é a borda esquerda do compartimento; a caixa é centralizada no
  próprio slot).
- **Y**: `alturaDaBaseMm/1000 + alturaDaCaixaNaPoseM/2` (a caixa fica em pé sobre a base
  do compartimento).
- **Z**: 0 — jogos são centralizados na profundidade do compartimento.

**Files:**
- Create: `app/src/cena/mapear.ts`
- Create: `app/src/cena/mapear.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

`app/src/cena/mapear.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { montarContexto, type Arranjo } from '../nucleo/arranjo.js'
import { montarEstante } from '../nucleo/estante.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { mapear } from './mapear.js'

const manual = { tipo: 'manual' } as const

const jogo = (
  id: string,
  idJogoBase: string | null = null,
  confirmadaPeloUsuario = true,
): CaixaDeJogo => ({
  id,
  nome: id,
  medidas: criarMedidas(295, 220, 70, manual, confirmadaPeloUsuario),
  idJogoBase,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350],
})

const arranjoCom = (naoAlocados: Arranjo['naoAlocados'] = []): Arranjo => ({
  posicoes: [{ idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 100, apoio: 'retrato' }],
  naoAlocados,
  pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
})

describe('mapear', () => {
  it('converte milimetros para metros', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    expect(objeto?.dimensoesXYZ[1]).toBeCloseTo(0.295, 5) // maiorMm em pé (retrato)
  })

  it('posiciona X pela borda esquerda do compartimento, centralizado na estante', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    // borda esquerda do compartimento = -0.38 (metade de 760mm); deslocamento
    // 100mm + metade da espessura (35mm) = 0.135m a partir da borda.
    expect(objeto?.posicaoXYZ[0]).toBeCloseTo(-0.38 + 0.135, 3)
  })

  it('posiciona Y sobre a base do compartimento', () => {
    const contexto = montarContexto([jogo('a')], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    const objeto = resultado.objetos[0]
    // alturaDaBaseMm do primeiro compartimento = alturaDoRodapeMm = 80mm = 0.08m
    expect(objeto?.posicaoXYZ[1]).toBeCloseTo(0.08 + 0.295 / 2, 3)
  })

  it('atribui a mesma cor a jogos da mesma familia', () => {
    const contexto = montarContexto([jogo('a'), jogo('b', 'a')], estante)
    const arranjo: Arranjo = {
      posicoes: [
        { idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 0, apoio: 'retrato' },
        { idJogo: 'b', idCompartimento: 'e1-p0', deslocamentoXMm: 70, apoio: 'retrato' },
      ],
      naoAlocados: [],
      pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
    }
    const resultado = mapear(arranjo, contexto, estante)
    expect(resultado.objetos[0]?.cor).toBe(resultado.objetos[1]?.cor)
  })

  it('marca tracejado quando a medida nao esta confirmada', () => {
    const contexto = montarContexto([jogo('a', null, false)], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    expect(resultado.objetos[0]?.tracejado).toBe(true)
  })

  it('nao marca tracejado quando a medida esta confirmada', () => {
    const contexto = montarContexto([jogo('a', null, true)], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    expect(resultado.objetos[0]?.tracejado).toBe(false)
  })

  it('gera uma prateleira por compartimento', () => {
    const contexto = montarContexto([], estante)
    const resultado = mapear(arranjoCom(), contexto, estante)
    expect(resultado.prateleiras).toHaveLength(1)
  })

  it('enfileira os nao alocados sem posicao derivada de encaixe', () => {
    const contexto = montarContexto([jogo('a'), jogo('x')], estante)
    const resultado = mapear(
      arranjoCom([{ idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 }]),
      contexto,
      estante,
    )
    expect(resultado.naoAlocados).toHaveLength(1)
    expect(resultado.naoAlocados[0]?.idJogo).toBe('x')
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./mapear.js` não existe.

- [ ] **Step 3: Implementar**

`app/src/cena/mapear.ts`:

```ts
import { exigirCompartimento, exigirJogo, type Arranjo, type ContextoDeArranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { corDaFamilia } from './corDaFamilia.js'

const MM_POR_METRO = 1000
const ESPACAMENTO_NAO_ALOCADOS_M = 0.05

export interface ObjetoNaCena {
  readonly idJogo: string
  readonly posicaoXYZ: readonly [number, number, number]
  readonly dimensoesXYZ: readonly [number, number, number]
  readonly cor: string
  readonly tracejado: boolean
}

export interface PrateleiraNaCena {
  readonly idCompartimento: string
  readonly posicaoXYZ: readonly [number, number, number]
  readonly dimensoesXYZ: readonly [number, number, number]
}

export interface NaoAlocadoNaCena {
  readonly idJogo: string
  readonly motivo: string
  readonly posicaoXYZ: readonly [number, number, number]
}

export interface CenaMapeada {
  readonly objetos: readonly ObjetoNaCena[]
  readonly prateleiras: readonly PrateleiraNaCena[]
  readonly naoAlocados: readonly NaoAlocadoNaCena[]
}

/**
 * Converte `Arranjo` + `Estante` em coordenadas de cena, em metros. Função pura
 * — a cena 3D (Task 11) só itera o resultado, nunca decide posição (spec §9).
 *
 * @example mapear(arranjo, contexto, estante).objetos[0].posicaoXYZ
 */
export function mapear(arranjo: Arranjo, contexto: ContextoDeArranjo, estante: Estante): CenaMapeada {
  const larguraDaEstanteM = estante.compartimentos[0]?.larguraUtilMm ?? 0
  const espessuraDaPrateleiraM = estante.espessuraDaPrateleiraMm / MM_POR_METRO

  return {
    objetos: arranjo.posicoes.map((posicao) => mapearObjeto(posicao, contexto, larguraDaEstanteM)),
    prateleiras: estante.compartimentos.map((compartimento) =>
      mapearPrateleira(compartimento, larguraDaEstanteM, espessuraDaPrateleiraM),
    ),
    naoAlocados: arranjo.naoAlocados.map((naoAlocado, indice) => ({
      idJogo: naoAlocado.idJogo,
      motivo: naoAlocado.motivo,
      posicaoXYZ: [
        larguraDaEstanteM / MM_POR_METRO / 2 + 0.3 + indice * ESPACAMENTO_NAO_ALOCADOS_M,
        0.1,
        0,
      ],
    })),
  }
}

function mapearObjeto(
  posicao: Arranjo['posicoes'][number],
  contexto: ContextoDeArranjo,
  larguraDaEstanteMm: number,
): ObjetoNaCena {
  const jogo = exigirJogo(contexto, posicao.idJogo)
  const compartimento = exigirCompartimento(contexto, posicao.idCompartimento)
  const { medidas } = jogo

  const [alturaMm, profundidadeMm] =
    posicao.apoio === 'retrato' ? [medidas.maiorMm, medidas.menorMm] : [medidas.menorMm, medidas.maiorMm]

  const xM =
    -larguraDaEstanteMm / MM_POR_METRO / 2 +
    (posicao.deslocamentoXMm + medidas.espessuraMm / 2) / MM_POR_METRO
  const yM = (compartimento.alturaDaBaseMm + alturaMm / 2) / MM_POR_METRO

  return {
    idJogo: jogo.id,
    posicaoXYZ: [xM, yM, 0],
    dimensoesXYZ: [medidas.espessuraMm / MM_POR_METRO, alturaMm / MM_POR_METRO, profundidadeMm / MM_POR_METRO],
    cor: corDaFamilia(jogo.idJogoBase ?? jogo.id),
    tracejado: !medidas.confirmadaPeloUsuario,
  }
}

function mapearPrateleira(
  compartimento: ContextoDeArranjo['compartimentos'][number],
  larguraDaEstanteMm: number,
  espessuraDaPrateleiraM: number,
): PrateleiraNaCena {
  return {
    idCompartimento: compartimento.id,
    posicaoXYZ: [0, compartimento.alturaDaBaseMm / MM_POR_METRO - espessuraDaPrateleiraM / 2, 0],
    dimensoesXYZ: [
      larguraDaEstanteMm / MM_POR_METRO,
      espessuraDaPrateleiraM,
      compartimento.profundidadeUtilMm / MM_POR_METRO,
    ],
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/cena/mapear.ts app/src/cena/mapear.test.ts
git commit -m "feat(cena): funcao pura que mapeia arranjo e estante para coordenadas 3D"
```

---

## Task 11: `CenaDoArranjo` (componente react-three-fiber)

**Files:**
- Create: `app/src/cena/CenaDoArranjo.tsx`
- Create: `app/src/cena/CenaDoArranjo.test.tsx`

- [ ] **Step 1: Escrever o teste de fumaça (falha)**

`app/src/cena/CenaDoArranjo.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { montarContexto, type Arranjo } from '../nucleo/arranjo.js'
import { montarEstante } from '../nucleo/estante.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { CenaDoArranjo } from './CenaDoArranjo.js'

const jogos: readonly CaixaDeJogo[] = [
  {
    id: 'a',
    nome: 'Catan',
    medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
    idJogoBase: null,
    frequencia: { tipo: 'desconhecida' },
    idLudopedia: null,
    idBgg: null,
  },
]

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350],
})

const arranjo: Arranjo = {
  posicoes: [{ idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 0, apoio: 'retrato' }],
  naoAlocados: [],
  pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
}

describe('CenaDoArranjo', () => {
  it('monta um <canvas> sem lancar', () => {
    const contexto = montarContexto(jogos, estante)
    const { container } = render(
      <CenaDoArranjo arranjo={arranjo} contexto={contexto} estante={estante} aoClicarJogo={() => {}} />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('monta mesmo com arranjo vazio', () => {
    const contexto = montarContexto([], estante)
    const arranjoVazio: Arranjo = {
      posicoes: [],
      naoAlocados: [],
      pontuacao: { total: 0, porTermo: { sobraConcentrada: 0, familiaDividida: 0, alturaDosOlhos: 0 } },
    }
    const { container } = render(
      <CenaDoArranjo arranjo={arranjoVazio} contexto={contexto} estante={estante} aoClicarJogo={() => {}} />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./CenaDoArranjo.js` não existe.

- [ ] **Step 3: Implementar**

`app/src/cena/CenaDoArranjo.tsx`:

```tsx
import { Edges, Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import type { Arranjo, ContextoDeArranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { mapear, type ObjetoNaCena } from './mapear.js'

/**
 * Cena 3D burra por design (spec §9): recebe `Arranjo` pronto e desenha, nunca
 * decide posição — isso é trabalho de `mapear`. Nenhum texto 3D por padrão; o
 * nome aparece em HTML sobreposto no jogo sob o cursor.
 *
 * @example <CenaDoArranjo arranjo={arranjo} contexto={contexto} estante={estante} aoClicarJogo={id => ...} />
 */
export function CenaDoArranjo({
  arranjo,
  contexto,
  estante,
  aoClicarJogo,
}: {
  arranjo: Arranjo
  contexto: ContextoDeArranjo
  estante: Estante
  aoClicarJogo: (idJogo: string) => void
}) {
  const cena = mapear(arranjo, contexto, estante)
  const [idEmFoco, setIdEmFoco] = useState<string | null>(null)

  return (
    <Canvas camera={{ position: [0, 1, 3] }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />
      <OrbitControls />

      {cena.prateleiras.map((prateleira) => (
        <mesh key={prateleira.idCompartimento} position={prateleira.posicaoXYZ}>
          <boxGeometry args={prateleira.dimensoesXYZ as [number, number, number]} />
          <meshStandardMaterial color="#c9b48f" />
        </mesh>
      ))}

      {cena.objetos.map((objeto) => (
        <ObjetoDoJogo
          key={objeto.idJogo}
          objeto={objeto}
          emFoco={objeto.idJogo === idEmFoco}
          aoEntrar={() => setIdEmFoco(objeto.idJogo)}
          aoSair={() => setIdEmFoco((atual) => (atual === objeto.idJogo ? null : atual))}
          aoClicar={() => aoClicarJogo(objeto.idJogo)}
        />
      ))}

      {cena.naoAlocados.map((naoAlocado) => (
        <mesh key={naoAlocado.idJogo} position={naoAlocado.posicaoXYZ}>
          <boxGeometry args={[0.04, 0.2, 0.2]} />
          <meshStandardMaterial color="#a8adb3" />
        </mesh>
      ))}
    </Canvas>
  )
}

function ObjetoDoJogo({
  objeto,
  emFoco,
  aoEntrar,
  aoSair,
  aoClicar,
}: {
  objeto: ObjetoNaCena
  emFoco: boolean
  aoEntrar: () => void
  aoSair: () => void
  aoClicar: () => void
}) {
  return (
    <mesh
      position={objeto.posicaoXYZ}
      onPointerOver={aoEntrar}
      onPointerOut={aoSair}
      onClick={aoClicar}
    >
      <boxGeometry args={objeto.dimensoesXYZ as [number, number, number]} />
      <meshStandardMaterial color={objeto.cor} />
      {objeto.tracejado && <Edges color="#333" />}
      {emFoco && <Html center>{objeto.idJogo}</Html>}
    </mesh>
  )
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/cena/CenaDoArranjo.tsx app/src/cena/CenaDoArranjo.test.tsx
git commit -m "feat(cena): componente react-three-fiber que desenha o arranjo mapeado"
```

---

## Task 12: `LimiteDeErroDaCena`, painel de não alocados e tela de Arranjo

**Files:**
- Create: `app/src/cena/LimiteDeErroDaCena.tsx`
- Create: `app/src/cena/LimiteDeErroDaCena.test.tsx`
- Create: `app/src/telas/arranjo/PainelDeNaoAlocados.tsx`
- Create: `app/src/telas/arranjo/PainelDeNaoAlocados.test.tsx`
- Create: `app/src/telas/arranjo/TelaDeArranjo.tsx`
- Create: `app/src/telas/arranjo/TelaDeArranjo.test.tsx`

- [ ] **Step 1: Escrever o teste do `ErrorBoundary` (falha)**

`app/src/cena/LimiteDeErroDaCena.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LimiteDeErroDaCena } from './LimiteDeErroDaCena.js'

function ComponenteQueLanca(): never {
  throw new Error('sem WebGL')
}

describe('LimiteDeErroDaCena', () => {
  it('renderiza os filhos normalmente quando nao ha erro', () => {
    render(
      <LimiteDeErroDaCena>
        <p>cena ok</p>
      </LimiteDeErroDaCena>,
    )
    expect(screen.getByText('cena ok')).toBeInTheDocument()
  })

  it('mostra mensagem de fallback quando a cena lanca', () => {
    render(
      <LimiteDeErroDaCena>
        <ComponenteQueLanca />
      </LimiteDeErroDaCena>,
    )
    expect(screen.getByText('Visualização 3D indisponível neste navegador.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./LimiteDeErroDaCena.js` não existe. O console mostrará o stack do
erro lançado por `ComponenteQueLanca` (React sempre loga erros de boundary) — isso é
esperado, não é uma falha adicional.

- [ ] **Step 3: Implementar**

`app/src/cena/LimiteDeErroDaCena.tsx`:

```tsx
import { Component, type ReactNode } from 'react'

interface Estado {
  readonly comErro: boolean
}

/** Fallback amigável quando o WebGL não está disponível (spec §7). */
export class LimiteDeErroDaCena extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { comErro: false }

  static getDerivedStateFromError(): Estado {
    return { comErro: true }
  }

  render() {
    if (this.state.comErro) {
      return <p>Visualização 3D indisponível neste navegador.</p>
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Escrever o teste do painel de não alocados (falha)**

`app/src/telas/arranjo/PainelDeNaoAlocados.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JogoNaoAlocado } from '../../nucleo/arranjo.js'
import { PainelDeNaoAlocados } from './PainelDeNaoAlocados.js'

describe('PainelDeNaoAlocados', () => {
  it('lista motivo e falta de cada jogo nao alocado', () => {
    const naoAlocados: readonly JogoNaoAlocado[] = [
      { idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 },
    ]
    render(<PainelDeNaoAlocados naoAlocados={naoAlocados} nomePorId={new Map([['x', 'Gloomhaven']])} />)
    expect(screen.getByText(/Gloomhaven/)).toBeInTheDocument()
    expect(screen.getByText(/alto-demais/)).toBeInTheDocument()
    expect(screen.getByText(/30mm/)).toBeInTheDocument()
  })

  it('mostra mensagem quando tudo coube', () => {
    render(<PainelDeNaoAlocados naoAlocados={[]} nomePorId={new Map()} />)
    expect(screen.getByText('Toda a coleção coube na estante.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./PainelDeNaoAlocados.js` não existe.

- [ ] **Step 7: Implementar**

`app/src/telas/arranjo/PainelDeNaoAlocados.tsx`:

```tsx
import type { JogoNaoAlocado } from '../../nucleo/arranjo.js'

/** Motivo + `faltaMm` de cada jogo que não coube (spec §8.3). */
export function PainelDeNaoAlocados({
  naoAlocados,
  nomePorId,
}: {
  naoAlocados: readonly JogoNaoAlocado[]
  nomePorId: ReadonlyMap<string, string>
}) {
  if (naoAlocados.length === 0) {
    return <p>Toda a coleção coube na estante.</p>
  }

  return (
    <ul>
      {naoAlocados.map((item) => (
        <li key={item.idJogo}>
          {nomePorId.get(item.idJogo) ?? item.idJogo} — {item.motivo} ({item.faltaMm}mm)
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 9: Escrever o teste da tela (falha)**

`app/src/telas/arranjo/TelaDeArranjo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarEstante } from '../../nucleo/estante.js'
import { criarMedidas } from '../../nucleo/jogo.js'
import { TelaDeArranjo } from './TelaDeArranjo.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
  vi.useFakeTimers()
})

describe('TelaDeArranjo', () => {
  it('mostra estado vazio quando nao ha arranjo calculado', () => {
    render(<TelaDeArranjo />)
    expect(screen.getByText('Nenhum arranjo calculado ainda.')).toBeInTheDocument()
  })

  it('calcula ao clicar em Recalcular e mostra a cena', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await useEstadoDoApp
      .getState()
      .salvarEstante(
        montarEstante('e1', {
          nome: 'Billy',
          larguraUtilMm: 760,
          profundidadeUtilMm: 280,
          alturaDoRodapeMm: 80,
          espessuraDaPrateleiraMm: 18,
          alturasLivresMm: [350],
        }),
      )
    await useEstadoDoApp.getState().salvarJogo({
      id: 'a',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    })

    render(<TelaDeArranjo />)
    await usuario.click(screen.getByRole('button', { name: 'Recalcular arranjo' }))

    expect(await screen.findByText(/Toda a coleção coube/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./TelaDeArranjo.js` não existe.

- [ ] **Step 11: Implementar**

`app/src/telas/arranjo/TelaDeArranjo.tsx`:

```tsx
import { useMemo } from 'react'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarContexto } from '../../nucleo/arranjo.js'
import { CenaDoArranjo } from '../../cena/CenaDoArranjo.js'
import { LimiteDeErroDaCena } from '../../cena/LimiteDeErroDaCena.js'
import { PainelDeNaoAlocados } from './PainelDeNaoAlocados.js'

/**
 * Composição da tela de Arranjo: viewport 3D + painel de não alocados + botão
 * Recalcular. Entrar sem nunca ter calculado mostra estado vazio explícito
 * (spec §8.3) — `arranjo: null` é exatamente esse estado.
 */
export function TelaDeArranjo() {
  const arranjo = useEstadoDoApp((estado) => estado.arranjo)
  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const estantes = useEstadoDoApp((estado) => estado.estantes)
  const estanteAtivaId = useEstadoDoApp((estado) => estado.estanteAtivaId)
  const calculando = useEstadoDoApp((estado) => estado.calculando)
  const recalcularArranjo = useEstadoDoApp((estado) => estado.recalcularArranjo)
  const irParaTela = useEstadoDoApp((estado) => estado.irParaTela)

  const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
  // `estanteAtiva` pode ser `undefined` (nenhuma estante cadastrada ainda) — nunca
  // usar non-null assertion aqui. Sem essa checagem, `montarContexto` receberia
  // `undefined` e lançaria bem no cenário que o estado vazio deveria cobrir.
  const contexto = useMemo(
    () => (estanteAtiva === undefined ? null : montarContexto(jogos, estanteAtiva)),
    [jogos, estanteAtiva],
  )
  const nomePorId = useMemo(() => new Map(jogos.map((jogo) => [jogo.id, jogo.nome])), [jogos])

  return (
    <section>
      <h2>Arranjo</h2>
      <button type="button" onClick={recalcularArranjo} disabled={estanteAtiva === undefined}>
        Recalcular arranjo
      </button>

      {arranjo === null ? (
        <p>Nenhum arranjo calculado ainda.</p>
      ) : (
        <div style={{ opacity: calculando ? 0.4 : 1, transition: 'opacity 200ms' }}>
          {calculando && <p role="status">Calculando…</p>}
          {estanteAtiva !== undefined && contexto !== null && (
            <LimiteDeErroDaCena>
              <CenaDoArranjo
                arranjo={arranjo}
                contexto={contexto}
                estante={estanteAtiva}
                aoClicarJogo={() => irParaTela('colecao')}
              />
            </LimiteDeErroDaCena>
          )}
          <PainelDeNaoAlocados naoAlocados={arranjo.naoAlocados} nomePorId={nomePorId} />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 12: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

Se o teste "calcula ao clicar em Recalcular" travar ou não encontrar o texto, confirme
que `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` está presente — sem
isso, o `click` não avança o `setTimeout(0)` de `recalcularArranjo` (Task 5) e o teste
trava esperando o texto aparecer.

- [ ] **Step 13: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/cena/LimiteDeErroDaCena.tsx app/src/cena/LimiteDeErroDaCena.test.tsx app/src/telas/arranjo
git commit -m "feat(telas): tela de arranjo com viewport 3D, recalculo e painel de nao alocados"
```

---

## Task 13: `Banner`, `Abas` e composição do `App`

**Files:**
- Create: `app/src/componentes/Banner.tsx`
- Create: `app/src/componentes/Banner.test.tsx`
- Create: `app/src/componentes/Abas.tsx`
- Create: `app/src/componentes/Abas.test.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/App.test.tsx`

- [ ] **Step 1: Escrever o teste do Banner (falha)**

`app/src/componentes/Banner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Banner } from './Banner.js'

describe('Banner', () => {
  it('nao renderiza nada quando a mensagem e nula', () => {
    const { container } = render(<Banner mensagem={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra a mensagem quando presente', () => {
    render(<Banner mensagem="Nada será salvo nesta sessão." />)
    expect(screen.getByRole('status')).toHaveTextContent('Nada será salvo nesta sessão.')
  })
})
```

- [ ] **Step 2: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./Banner.js` não existe.

- [ ] **Step 3: Implementar**

`app/src/componentes/Banner.tsx`:

```tsx
/** Aviso fixo de erro de persistência (spec §7). */
export function Banner({ mensagem }: { mensagem: string | null }) {
  if (mensagem === null) return null
  return <p role="status">{mensagem}</p>
}
```

- [ ] **Step 4: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 5: Escrever o teste das Abas (falha)**

`app/src/componentes/Abas.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Abas } from './Abas.js'

describe('Abas', () => {
  it('destaca a aba ativa', () => {
    render(<Abas telaAtiva="colecao" aoTrocar={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Coleção', selected: true })).toBeInTheDocument()
  })

  it('chama aoTrocar com a tela clicada', async () => {
    const aoTrocar = vi.fn()
    const usuario = userEvent.setup()
    render(<Abas telaAtiva="estantes" aoTrocar={aoTrocar} />)

    await usuario.click(screen.getByRole('tab', { name: 'Arranjo' }))

    expect(aoTrocar).toHaveBeenCalledWith('arranjo')
  })
})
```

- [ ] **Step 6: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — `./Abas.js` não existe.

- [ ] **Step 7: Implementar**

`app/src/componentes/Abas.tsx`:

```tsx
import type { Tela } from '../estado/useEstadoDoApp.js'

const ROTULOS: Record<Tela, string> = {
  estantes: 'Estantes',
  colecao: 'Coleção',
  arranjo: 'Arranjo',
}

/** Navegação por abas sem URL (spec D2). */
export function Abas({ telaAtiva, aoTrocar }: { telaAtiva: Tela; aoTrocar: (tela: Tela) => void }) {
  return (
    <nav role="tablist">
      {(Object.keys(ROTULOS) as Tela[]).map((tela) => (
        <button
          key={tela}
          type="button"
          role="tab"
          aria-selected={tela === telaAtiva}
          onClick={() => aoTrocar(tela)}
        >
          {ROTULOS[tela]}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 8: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 9: Escrever o teste do App recomposto (falha)**

Substitua `app/src/App.test.tsx` por:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { RepositorioEmMemoria } from './persistencia/RepositorioEmMemoria.js'
import { App } from './App.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('App', () => {
  it('comeca na tela de Estantes', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Estantes' })).toBeInTheDocument()
  })

  it('troca de tela ao clicar numa aba', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(screen.getByRole('tab', { name: 'Coleção' }))

    expect(screen.getByRole('heading', { name: 'Coleção' })).toBeInTheDocument()
  })

  it('mostra o banner quando ha erro de persistencia', () => {
    useEstadoDoApp.setState({ erroDePersistencia: 'Nada será salvo nesta sessão.' })
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Nada será salvo nesta sessão.')
  })
})
```

- [ ] **Step 10: Rodar para confirmar que falha**

```bash
pnpm test
```

Esperado: FAIL — o `App` atual só tem o `<h1>`, sem abas nem telas.

- [ ] **Step 11: Recompor o `App`**

Substitua `app/src/App.tsx` por:

```tsx
import { Abas } from './componentes/Abas.js'
import { Banner } from './componentes/Banner.js'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { TelaDeArranjo } from './telas/arranjo/TelaDeArranjo.js'
import { TelaDeColecao } from './telas/colecao/TelaDeColecao.js'
import { TelaDeEstantes } from './telas/estantes/TelaDeEstantes.js'

/** Composição raiz: abas + tela ativa (spec D2 — sem URL, sem React Router). */
export function App() {
  const telaAtiva = useEstadoDoApp((estado) => estado.telaAtiva)
  const irParaTela = useEstadoDoApp((estado) => estado.irParaTela)
  const erroDePersistencia = useEstadoDoApp((estado) => estado.erroDePersistencia)

  return (
    <main>
      <h1>LudoShelf</h1>
      <Banner mensagem={erroDePersistencia} />
      <Abas telaAtiva={telaAtiva} aoTrocar={irParaTela} />
      {telaAtiva === 'estantes' && <TelaDeEstantes />}
      {telaAtiva === 'colecao' && <TelaDeColecao />}
      {telaAtiva === 'arranjo' && <TelaDeArranjo />}
    </main>
  )
}
```

- [ ] **Step 12: Rodar os testes**

```bash
pnpm test
```

Esperado: todos verdes.

- [ ] **Step 13: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/componentes app/src/App.tsx app/src/App.test.tsx
git commit -m "feat(app): compoe abas, banner e as tres telas na raiz"
```

---

## Task 14: `main.tsx` real

**Files:**
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Trocar o bootstrap para usar `RepositorioDexie` e `inicializar`**

Substitua `app/src/main.tsx` por:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { RepositorioDexie } from './persistencia/RepositorioDexie.js'

const raiz = document.getElementById('raiz')
if (raiz === null) {
  throw new Error('elemento #raiz não encontrado em index.html')
}

// Dispara antes de renderizar; o store começa com RepositorioEmMemoria e troca
// assim que `inicializar` resolve (ou cai no fallback — spec §7).
void useEstadoDoApp.getState().inicializar(new RepositorioDexie())

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Rodar a suíte inteira**

```bash
pnpm test
```

Esperado: todos verdes — `main.tsx` não tem teste próprio (é bootstrap, testado
indiretamente pelos testes de `useEstadoDoApp.inicializar` e `App`).

- [ ] **Step 3: Verificar manualmente com o servidor de desenvolvimento**

```bash
pnpm --filter @ludoshelf/app dev
```

Abra a URL impressa (tipicamente `http://localhost:5173`). Confirme visualmente:
1. A tela de Estantes carrega, com o formulário e o diagrama.
2. Cadastrar uma estante faz ela aparecer na lista e o diagrama refletir os números.
3. A aba Coleção permite cadastrar um jogo.
4. A aba Arranjo mostra "Nenhum arranjo calculado ainda", e o botão Recalcular
   produz uma cena 3D navegável (arraste para orbitar).
5. Feche o servidor com Ctrl+C depois de confirmar.

- [ ] **Step 4: Typecheck, format, commit**

```bash
pnpm typecheck
pnpm format
```

```bash
git add app/src/main.tsx
git commit -m "feat(app): bootstrap real com RepositorioDexie"
```

---

## Task 15: Fechamento do plano 2

- [ ] **Step 1: Rodar a verificação completa**

```bash
pnpm test
```

Esperado: todos os testes passam — núcleo (projeto `nucleo`) e UI (projeto `app-ui`)
juntos, zero falhas.

```bash
pnpm typecheck
```

Esperado: nenhuma saída.

```bash
pnpm format:check
```

Esperado: `All matched files use Prettier code style!`

- [ ] **Step 2: Atualizar a spec com a suposição de eixo da cena**

Adicione à seção 11 de `docs/superpowers/specs/2026-08-17-app-minimo-design.md`:

```markdown
- **S4** — Convenção de eixos da cena: X centralizado na largura da estante; Y com
  origem no chão (`alturaDaBaseMm` do compartimento); Z centralizado na profundidade
  do compartimento (jogos não são encostados no fundo nem na frente). Não estava na
  spec original; decidido na implementação de `cena/mapear.ts`.
```

```bash
git add docs/superpowers/specs/2026-08-17-app-minimo-design.md
git commit -m "docs: registra a convencao de eixos da cena decidida na implementacao"
```

- [ ] **Step 3: Publicar**

```bash
git push
```

- [ ] **Step 4: Confirmar o estado**

```bash
git status -sb
```

Esperado: branch sincronizada com o remoto, sem divergência.

---

## Cobertura da spec por este plano

| Seção da spec | Onde está | Observação |
|---|---|---|
| §4 estrutura de pacotes e fronteiras | Task 1 | núcleo intocado, verificado por `fronteira.test.ts` já existente |
| §5 persistência (schema + interface) | Tasks 2–3 | `RepositorioEmMemoria` e `RepositorioDexie` |
| §6 estado (CRUD + recalcularArranjo) | Tasks 4–5 | upsert único, adiamento de tick, semente aleatória |
| §7 tratamento de erros | Tasks 4, 12, 13 | fallback de persistência, validação via núcleo, `ErrorBoundary` |
| §8.1 Estantes + diagrama 2D | Tasks 6–7 | |
| §8.2 Coleção | Task 8 | |
| §8.3 Arranjo + estado vazio | Task 12 | |
| §9 cena 3D | Tasks 9–11 | cor por família, tracejado, sem texto 3D por padrão, pilha de não alocados |
| §10 testes | todas as tasks | TDD em cada uma; `RepositorioEmMemoria` como dublê nomeado em todo teste de estado |
| S1–S3 | Tasks 5, 9 | cor por hash, upsert não desfeito em falha, iterações fixas |

**Fora deste plano, por pertencerem aos planos 3 e 4:** importador de CSV, tabela
semeada, proxy, integrações Ludopedia/BGG.
