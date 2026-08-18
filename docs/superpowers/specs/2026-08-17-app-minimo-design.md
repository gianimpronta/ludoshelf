# LudoShelf — app mínimo ponta a ponta (plano 2)

- **Data:** 2026-08-17
- **Status:** aprovado, pronto para virar plano de implementação
- **Repositório:** https://github.com/gianimpronta/ludoshelf
- **Depende de:** `docs/superpowers/specs/2026-08-16-ludoshelf-design.md` (spec do v1),
  plano 1 (`app/src/nucleo/`), já mergeado em `main`.

## 1. Objetivo

Fazer o app existir de verdade no navegador pela primeira vez: cadastro manual de
estante e coleção, o motor de arranjo do plano 1 rodando de ponta a ponta, o resultado
em 3D, e tudo persistindo localmente entre sessões.

## 2. Escopo

Dentro:

- Três telas — Estantes, Coleção, Arranjo — navegadas por abas.
- Cadastro manual de estante (com diagrama 2D ao vivo) e de jogos.
- Botão explícito "Recalcular arranjo", que chama `arranjar()` do núcleo.
- Cena 3D da tela de Arranjo: cuboides coloridos por família, sem textura.
- Persistência em IndexedDB via Dexie, atrás de `RepositorioDeColecao`.

Fora (fica para os planos 3 e 4):

- Importação de CSV, integração com Ludopedia, integração com BGG.
- Tabela semeada de medidas.
- Proxy HTTP.
- Ajuste manual por arrastar e soltar na cena 3D (fase 2 da spec original).
- Estante com prateleiras arrastáveis no diagrama 2D (ver §8.1 — fica marcado para uma
  fase futura, não deste plano).
- Textura/imagem de capa nas caixas da cena 3D.
- Web Worker para o motor (a spec original já decidiu contra isso no v1 — §7.5 da
  spec de origem).

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Recálculo por botão explícito, nunca automático | Escolha do usuário. A tela nunca muda sozinha embaixo dele; ~20 mil iterações por clique são perceptíveis. |
| D2 | Navegação por abas sem URL, sem React Router | App 100% local, sem nada compartilhável entre URLs no v1. Menos dependência, menos código. |
| D3 | Dexie.js sobre IndexedDB nativo | Poupa boilerplate de transação e versionamento de schema; fica inteiramente atrás de `RepositorioDeColecao`, então a escolha é barata de reverter. |
| D4 | Cuboides coloridos por família, sem textura de capa | O que a spec de origem já define em §8. Não há de onde viria uma imagem no v1 — cadastro manual não pede, e Ludopedia/BGG são planos futuros. |
| D5 | Recálculo mostra a cena antiga esmaecida + selo de progresso, nunca tela vazia | Escolha do usuário, validada visualmente. Funciona igual para cálculo rápido ou mais lento. |
| D6 | Zustand como única fonte de verdade; IndexedDB é espelho, não fonte | Um único lugar para debugar estado; o motor síncrono se encaixa como action que lê do próprio estado e escreve de volta. |
| D7 | Estante: diagrama 2D em SVG ao vivo, sem arraste, no v1 | Escolha do usuário. Resolve a conferência visual de proporções por uma fração do custo de um editor arrastável ou de uma prévia 3D dedicada. |

## 4. Arquitetura

### 4.1 Estrutura de pacotes

```
app/src/
├─ nucleo/          (plano 1, intocado)
├─ persistencia/    Dexie, RepositorioDeColecao
├─ estado/          store Zustand
├─ telas/           Estantes, Colecao, Arranjo
├─ cena/            componentes react-three-fiber + mapear.ts (função pura)
├─ componentes/     botões, campos, layout comum
├─ App.tsx          abas + composição raiz
└─ main.tsx         bootstrap Vite
```

**Dependências novas** (versões a fixar no plano de implementação, verificadas na
documentação corrente, não de memória): `react`, `react-dom`, `vite`,
`@vitejs/plugin-react`, `zustand`, `dexie`, `three`, `@react-three/fiber`,
`@react-three/drei`, e para teste: `@testing-library/react`,
`@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`.

`app/tsconfig.json` ganha `jsx: react-jsx` e `DOM` em `lib`. O Vitest passa a rodar
`environment: 'jsdom'` **só** nos testes de `telas/`, `estado/` e `cena/` — os testes do
núcleo continuam em ambiente `node` puro, via configuração por-projeto.

### 4.2 Fronteira de módulo

- `persistencia/` — só o Dexie sabe que existe IndexedDB. Ninguém mais importa `dexie`
  diretamente; todos passam por `RepositorioDeColecao`.
- `estado/` — o único lugar com estado mutável do app. Recebe `RepositorioDeColecao`
  por injeção (nunca importa `RepositorioDexie` diretamente), o que o torna testável com
  `RepositorioEmMemoria`.
- `cena/` — burra por design, como a spec original já estabelece: recebe `Arranjo` +
  `Estante` prontos, nunca decide posição. A lógica de mapeamento fica isolada em
  `cena/mapear.ts`, uma função pura sem React nem Three.js nas assinaturas de entrada,
  testável como qualquer módulo do núcleo.
- `telas/` — consome o store; não chama `RepositorioDeColecao` nem `arranjar()`
  diretamente.

## 5. Persistência

### 5.1 Schema

```ts
class BancoDoLudoShelf extends Dexie {
  jogos!: Table<CaixaDeJogo, string>
  estantes!: Table<Estante, string>

  constructor() {
    super('ludoshelf')
    this.version(1).stores({
      jogos: 'id, idJogoBase',
      estantes: 'id',
    })
  }
}
```

As tabelas gravam os tipos de domínio do núcleo quase 1:1 — não há um modelo de
persistência separado do modelo de domínio nesta escala. `Estante` já grava com
`compartimentos` derivados (largura variável por compartimento já suportada pelo
plano 1), então a fase 2 (nichos, Kallax) não exige migração de schema.

### 5.2 Interface

```ts
interface RepositorioDeColecao {
  carregarJogos(): Promise<readonly CaixaDeJogo[]>
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  carregarEstantes(): Promise<readonly Estante[]>
  salvarEstante(estante: Estante): Promise<void>
}
```

Duas implementações: `RepositorioDexie` (produção) e `RepositorioEmMemoria` (testes, e
fallback automático quando o IndexedDB está indisponível — §7).

## 6. Estado

```ts
interface EstadoDoApp {
  jogos: readonly CaixaDeJogo[]
  estantes: readonly Estante[]
  estanteAtivaId: string | null
  arranjo: Arranjo | null

  telaAtiva: 'estantes' | 'colecao' | 'arranjo'
  calculando: boolean
  erroDePersistencia: string | null

  inicializar(repositorio: RepositorioDeColecao): Promise<void>
  salvarJogo(jogo: CaixaDeJogo): Promise<void>
  removerJogo(id: IdJogo): Promise<void>
  salvarEstante(estante: Estante): Promise<void>
  selecionarEstante(id: string): void
  recalcularArranjo(): void
  irParaTela(tela: EstadoDoApp['telaAtiva']): void
}
```

Um único store — a divisão em slices só valeria a pena com um estado bem maior.

`salvarJogo` é upsert (mesma semântica de `RepositorioDeColecao.salvarJogo`, que usa
`put` no Dexie): cadastro manual e "corrigir medida" a partir da cena 3D (§9) são a
mesma operação — criar e editar não precisam de duas actions distintas.

**`recalcularArranjo` é síncrona por dentro, mas adia um tick antes de calcular:**

```
1. calculando = true                          (React pinta a cena esmaecida + selo)
2. agenda a chamada real via requestAnimationFrame/setTimeout(0)
3. roda arranjar() com uma semente aleatória nova (Date.now()) — não fixa
4. grava o resultado em `arranjo`, calculando = false
```

O adiamento do passo 2 existe porque, sem ele, a mesma thread que precisaria pintar o
estado "calculando" é a que fica ocupada com as iterações — o esmaecimento nunca
chegaria a aparecer.

A semente é nova a cada clique (diferente dos testes, que usam sementes fixas): se o
primeiro resultado não agradar, recalcular deve poder produzir algo diferente.

`inicializar` roda uma vez no bootstrap, carrega jogos e estantes do repositório, e é
onde `erroDePersistencia` é setado se a abertura do IndexedDB falhar.

## 7. Tratamento de erros

| Situação | Comportamento |
|---|---|
| IndexedDB indisponível (aba anônima) | `inicializar` cai para `RepositorioEmMemoria` automaticamente; banner fixo avisa que nada será salvo. App continua funcional. |
| Formulário inválido (Estantes/Coleção) | Erro inline = a mensagem do `RangeError` do validador do núcleo, capturado no `onSubmit`. Nenhuma regra de validação duplicada na UI. |
| Falha ao gravar (quota excedida etc.) | A mutação já aplicada no Zustand **não é revertida**; `erroDePersistencia` é setado e um banner avisa que o dado não foi salvo. |
| Cena 3D sem WebGL | `ErrorBoundary` ao redor do `<Canvas>` mostra "Visualização 3D indisponível neste navegador" no lugar da cena. |

## 8. Telas

### 8.1 Estantes

Formulário com os campos de `DefinicaoDeEstante` (largura, profundidade, altura do
rodapé, espessura da prateleira, lista de alturas livres com "+ prateleira"). Lista de
estantes salvas ao lado, com a ativa marcada.

**`DiagramaDeEstante`** — componente SVG puro (`props in, SVG out`, sem estado próprio),
redesenhado a cada `onChange`: retângulo externo proporcional, uma linha por prateleira
com a altura anotada, rodapé destacado. Testável isolado, sem montar o formulário.

*Nota para o futuro:* a versão com prateleiras arrastáveis, sincronizadas nos dois
sentidos com os campos numéricos, é a evolução natural deste mesmo componente — quando
vier, substitui `DiagramaDeEstante` por uma versão com estado de arrasto, mas a
interface (`DefinicaoDeEstante` in, altura editada out) pode continuar igual.

### 8.2 Coleção

Tabela de jogos: nome, medidas, procedência (badge — só "manual" é alcançável neste
plano; os outros ficam prontos para os planos 3–4). Formulário de cadastro: nome, duas
medidas + espessura (`criarMedidas` resolve maior/menor), checkbox "destaque"
(`SinalDeFrequencia` manual), dropdown opcional de jogo-base para expansões.

### 8.3 Arranjo

Viewport 3D (§9) + painel lateral com a lista de "não coube" (motivo + `faltaMm` de
cada `JogoNaoAlocado`) + botão "Recalcular" (§6).

**Estado vazio explícito:** entrar na aba sem nunca ter calculado mostra "Nenhum arranjo
calculado ainda" + o botão, em vez de uma cena 3D vazia sem explicação —
`arranjo: null` no store é exatamente esse estado.

## 9. Cena 3D

`CenaDoArranjo` recebe `Arranjo` + `Estante` prontos; nunca decide posição.

- **Escala:** mm → metros só na borda da cena (`/1000`), nunca antes.
- **Estante:** um cuboide fino por prateleira, posicionado por `alturaDaBaseMm`.
- **Cada jogo:** `boxGeometry` nas dimensões da pose já resolvida (`apoio`), posicionado
  por `deslocamentoXMm`. Cor por família (hash de string → HSL, para famílias distintas
  caírem em cores visualmente diferentes sem paleta fixa). Contorno tracejado (`Edges`
  do drei) quando `confirmadaPeloUsuario === false`.
- **Câmera:** `OrbitControls`, posição inicial de frente para a estante; botão "vista
  frontal" restaura essa pose.
- **Nomes:** nenhum texto 3D por padrão. `<Html>` do drei ancorado no jogo sob o cursor
  mostra nome, medidas e procedência — é DOM posicionado, não geometria, evitando o
  gargalo de texto 3D já identificado na spec de origem.
- **Clique:** abre painel lateral com nome, medidas, procedência, e atalho "corrigir
  medida" para a tela de Coleção com o jogo pré-selecionado.
- **Pilha do "não coube":** fileira de cuboides cinzas no chão ao lado da estante,
  enfileirados sem posição derivada de encaixe; motivo aparece no hover.

## 10. Testes

- `persistencia/` — `RepositorioDexie` testado com `fake-indexeddb` (simula IndexedDB em
  Node). `RepositorioEmMemoria` é o dublê nomeado usado em todo teste de `estado/`.
- `estado/` — store isolado, injetando `RepositorioEmMemoria`; cobre
  `recalcularArranjo` (incluindo "sem estante ativa" → não faz nada) e o fallback de
  `erroDePersistencia`.
- `telas/` — fumaça com Testing Library: formulário valida, lista renderiza,
  `DiagramaDeEstante` recebe props e produz o SVG esperado.
- `cena/` — não testa pixel. `cena/mapear.ts` (função pura: `Arranjo` + `Estante` →
  lista de `{ posicaoXYZ, dimensoes, cor, tracejado }`) é testada como módulo do núcleo;
  o componente React só itera o resultado.

## 11. Suposições explícitas

- **S1** — Cor por família é derivada por hash de string, não por uma paleta fixa
  cadastrada — não há requisito de branding nem de cores estáveis entre sessões além do
  que o hash já garante (mesmo id → mesma cor sempre).
- **S2** — A falha ao gravar no IndexedDB não desfaz a mutação em memória: o usuário
  mantém o trabalho da sessão visível mesmo sabendo que não persistiu, em vez de perder
  a edição ao primeiro erro de gravação.
- **S3** — `recalcularArranjo` usa sempre `iteracoes: 20000` (o mesmo valor validado no
  cenário de regressão do plano 1) — não é configurável pelo usuário neste plano.
- **S4** — Convenção de eixos da cena: X centralizado na largura da estante; Y com
  origem no chão (`alturaDaBaseMm` do compartimento); Z centralizado na profundidade
  do compartimento (jogos não são encostados no fundo nem na frente). Não estava na
  spec original; decidido na implementação de `cena/mapear.ts`.
