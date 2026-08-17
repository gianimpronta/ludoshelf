# LudoShelf — design do v1

- **Data:** 2026-08-16
- **Status:** aprovado, pronto para virar plano de implementação
- **Repositório:** https://github.com/gianimpronta/ludoshelf

## 1. Objetivo

Organizar uma coleção de jogos de tabuleiro em estantes. O usuário informa as medidas
da estante e a sua coleção; o app calcula automaticamente um arranjo das caixas e o
exibe em 3D no navegador.

## 2. Escopo do v1

Dentro:

- Cadastro de estantes de prateleiras corridas, com alturas fixas informadas pelo usuário.
- Coleção alimentada por quatro vias: cadastro manual, importação de CSV, importação da
  coleção da Ludopedia e busca de medidas no BGG.
- Motor de arranjo automático, com quatro critérios hierarquizados.
- Visualização 3D do resultado, com o que não coube exibido separadamente.
- Proxy HTTP próprio que guarda os tokens das APIs de terceiros.

Fora:

- Ajuste manual por arrastar e soltar (fase 2 — o modelo de dados já a acomoda; ver §6.4).
- Estantes de nichos tipo Kallax, alturas irregulares, divisórias verticais (fase 2 — o
  modelo de compartimentos já as acomoda; ver §6.2).
- Orientações além de "em pé, lombada à frente" (fase 2; ver §7.2).
- Importação de arquivos XLSX (ver §9.3).
- Contas de usuário e sincronização entre dispositivos. Persistência é local.

## 3. Descobertas sobre as fontes de dados

Verificadas em 2026-08-16. Elas invertem a premissa inicial do projeto e por isso vêm
antes das decisões.

### 3.1 A API da Ludopedia não expõe medidas de caixa

Confirmado lendo o spec OpenAPI em `https://ludopedia.com.br/api/openapi.yaml`. O schema
`Jogo` contém `id_jogo`, `nm_jogo`, `thumb`, `tp_jogo`, `link`, `ano_publicacao`,
`ano_nacional`, `qt_jogadores_min`, `qt_jogadores_max`, `vl_tempo_jogo`, `idade_minima`,
`qt_tem`, `qt_teve`, `qt_favorito`, `qt_quer`, `qt_jogou`, `mecanicas`, `categorias`,
`temas`, `artistas`, `designers`. Nenhum campo de largura, altura, profundidade ou peso.

O que ela resolve, e que é bastante:

- `GET /colecao` — a lista de jogos do usuário, poupando digitação de nomes.
- `GET /jogos?id_jogo_base=<id>` — os jogos que são expansão do base indicado. É a única
  via verificada para descobrir a relação base/expansão, já que o schema `Jogo` não tem
  campo de pai. Alimenta o critério "família junta".
- `GET /partidas` — partidas registradas, que alimentam o critério "altura dos olhos".

Autenticação: OAuth2. O acesso é concedido sob solicitação a `api@ludopedia.com.br`.

### 3.2 A XML API do BGG passou a exigir registro

`GET https://boardgamegeek.com/xmlapi2/thing?id=13` devolve
`401 Unauthorized — See https://boardgamegeek.com/using_the_xml_api`. Mesmo resultado em
`api.geekdo.com`, tanto na xmlapi quanto na xmlapi2.

O token é **de aplicação**, não de usuário: o desenvolvedor registra a aplicação e envia
`Authorization: Bearer <token>`. O registro é obrigatório para uso comercial e não
comercial. Há uma exceção: baixar a própria coleção estando logado não exige registro.

Consequência direta de arquitetura: um token de aplicação embutido em JavaScript de
navegador é um token público. Ele tem de ficar no servidor.

Medidas físicas existem apenas nos itens de **versão** (`thing?id=<id>&versions=1`, campos
`width`, `length`, `depth`, `weight`, em polegadas), frequentemente ausentes ou zeradas, e
variam por edição — a edição nacional costuma divergir da original.

### 3.3 CORS não foi verificado

A tentativa de inspecionar os cabeçalhos CORS da Ludopedia falhou por erro de handshake
TLS da máquina de desenvolvimento (`schannel: SEC_E_INVALID_TOKEN`), que é um problema
local e não do servidor remoto. Portanto **não se sabe** se a API aceita chamada direta do
navegador. O design não depende dessa resposta: o proxy resolve CORS por construção.

## 4. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Otimizador automático primeiro; ajuste manual na fase 2 | Escolha do usuário. O motor de arranjo é o coração do produto. |
| D2 | Estante de prateleiras corridas, alturas fixas | Escolha do usuário. Reduz o problema a bin packing 1D com compatibilidade. |
| D3 | Estante modelada como lista de compartimentos | Permite nichos e alturas irregulares depois sem reescrever o motor. |
| D4 | Orientação única: em pé, lombada à frente | Escolha do usuário. Torna a largura ocupada por jogo determinística. |
| D5 | Quatro critérios hierarquizados (§6.2) | Escolha do usuário; a hierarquia resolve o conflito entre eles. |
| D6 | Quatro vias de entrada de dados: manual, CSV, Ludopedia, BGG | Escolha do usuário. O CSV é a única via em massa sem dependência de token. |
| D7 | SPA + proxy fino desde o início | Escolha do usuário; o token de aplicação do BGG (§3.2) exige servidor de qualquer forma. |
| D8 | Importador de CSV genérico com mapeamento de colunas na UI | Cobre export da Ludopedia, do BGG e planilha própria sem um parser por formato. |
| D9 | Milímetros inteiros como unidade interna única | Evita erro de arredondamento que produz "cabe por 0,2 mm". |
| D10 | pnpm workspace com dois pacotes (`app/`, `proxy/`) | Dois deployables justificam dois pacotes; um terceiro só para o núcleo seria cerimônia. |

## 5. Arquitetura

### 5.1 Camadas

```
Navegador (SPA)                    Proxy fino (Node)              Terceiros
├─ UI React                        ├─ Adaptador Ludopedia   ───▶  Ludopedia (OAuth2)
├─ Visualizador 3D (r3f)           ├─ Adaptador BGG         ───▶  BGG (Bearer)
├─ Motor de arranjo (TS puro) ◀────┤  Normalizador → mm
├─ Repositório local (IndexedDB)   ├─ Cache de medidas
├─ Cliente do catálogo (HTTP) ────▶└─ Cofre dos tokens
└─ Tabela semeada (JSON)
```

A regra que sustenta o desenho: **o motor de arranjo não importa React, não importa
Three.js e não faz rede.** Recebe caixas em milímetros e compartimentos, devolve posições.
É a única parte onde um defeito é caro, e assim ela roda inteira em teste de unidade.

### 5.2 Stack

| Camada | Escolha |
|---|---|
| Build / SPA | Vite + React + TypeScript estrito |
| 3D | react-three-fiber + drei |
| Estado | Zustand |
| Persistência | IndexedDB atrás da interface `RepositorioDeColecao` |
| Proxy | Node + Hono, TypeScript |
| Testes | Vitest, comando único `pnpm test` |
| Monorepo | pnpm workspace: `app/`, `proxy/` |

As versões exatas serão fixadas no plano de implementação consultando a documentação
corrente, não de memória.

### 5.3 Fronteiras de módulo

- `app/src/nucleo/` — tipos de domínio, motor de arranjo, função de pontuação. Zero
  dependências de runtime. Regra de lint proíbe importar React, Three.js ou `fetch` aqui.
- `app/src/catalogo/` — interface `CatalogoDeJogos`, com `CatalogoHttp` (fala com o proxy),
  `CatalogoSemeado` (lê o JSON versionado) e `CatalogoFalso` (testes).
- `app/src/persistencia/` — `RepositorioDeColecao` sobre IndexedDB.
- `app/src/importacao/` — `LeitorDeCsv` e o mapeamento de colunas.
- `app/src/cena/` — componentes react-three-fiber. Só consomem o resultado do motor.
- `proxy/src/adaptadores/` — `AdaptadorLudopedia`, `AdaptadorBgg`, cada um com fixtures.

Dependências entram por parâmetro ou construtor, nunca por import global.

## 6. Modelo de dados

### 6.1 Domínio

```ts
type Milimetros = number;                    // inteiro, sempre
type IdJogo = string;                        // identificador local, estável entre sessões

interface CaixaDeJogo {
  readonly id: IdJogo;
  readonly nome: string;
  readonly medidas: MedidasDaCaixa;
  readonly idJogoBase: IdJogo | null;        // expansão aponta para o base
  readonly partidasRegistradas: number;      // 0 quando desconhecido
}

interface MedidasDaCaixa {
  readonly maiorMm: Milimetros;              // maior face
  readonly menorMm: Milimetros;              // menor face
  readonly espessuraMm: Milimetros;          // a lombada
  readonly origem: OrigemDaMedida;
  readonly confirmadaPeloUsuario: boolean;
}

type OrigemDaMedida =
  | { tipo: 'manual' }
  | { tipo: 'semeada';  chaveDoTemplate: string }
  | { tipo: 'planilha'; arquivo: string; linha: number }
  | { tipo: 'bgg';      idVersao: number; obtidoEm: string };
```

As medidas são nomeadas pela caixa (`maior`/`menor`/`espessura`), não pela pose
(`largura`/`altura`/`profundidade`), porque a pose é decisão do motor, não propriedade do
objeto.

`OrigemDaMedida` existe porque a cobertura será irregular e às vezes errada. A UI mostra a
procedência e uma medida vinda do BGG entra como sugestão a confirmar.

### 6.2 Estante

```ts
interface Compartimento {
  readonly id: string;
  readonly larguraUtilMm: Milimetros;
  readonly alturaUtilMm: Milimetros;
  readonly profundidadeUtilMm: Milimetros;
  readonly alturaDaBaseMm: Milimetros;       // do chão até a base do compartimento
}

interface Estante {
  readonly id: string;
  readonly nome: string;
  readonly compartimentos: readonly Compartimento[];
}
```

Prateleira corrida = N compartimentos, cada um com a largura cheia da estante. Kallax
futuro = grade de compartimentos pequenos. Mesmo motor.

`alturaDaBaseMm` é o que permite calcular "altura dos olhos" sem gambiarra.

### 6.3 Resultado

```ts
interface Arranjo {
  readonly posicoes: readonly PosicaoDeJogo[];
  readonly naoAlocados: readonly JogoNaoAlocado[];
  readonly pontuacao: Pontuacao;
}

interface PosicaoDeJogo {
  readonly idJogo: IdJogo;
  readonly idCompartimento: string;
  readonly deslocamentoXMm: Milimetros;      // a partir da borda esquerda
  readonly apoio: 'retrato' | 'paisagem';
}

interface JogoNaoAlocado {
  readonly idJogo: IdJogo;
  readonly motivo: 'alto-demais' | 'fundo-demais' | 'largo-demais' | 'sem-espaco';
  readonly faltaMm: Milimetros;              // quanto faltou, para a UI explicar
}
```

Dizer **por que** um jogo não coube é mais útil que o arranjo em si: é o que responde
"preciso de outra estante ou só reorganizar?".

### 6.4 Acomodação da fase 2

O ajuste manual por arrastar e soltar vira `fixarJogoEm(idJogo, idCompartimento)`: o motor
passa a tratar aquela posição como travada e reotimiza o resto ao redor. `PosicaoDeJogo`
já é dado separado de `CaixaDeJogo` exatamente para isso.

## 7. Motor de arranjo

### 7.1 Três consequências da orientação única

1. **A ordem dentro da prateleira não afeta o encaixe.** Todo jogo em pé consome sua
   espessura; a soma independe da ordem. Ordenação alfabética sai de graça, aplicada no
   fim.
2. **O espaço livre de uma prateleira já é sempre contíguo** (empurre tudo para a
   esquerda). "Maximizar espaço livre contínuo" é, portanto, concentrar a sobra em poucas
   prateleiras, não arrumar dentro de uma.
3. **O problema é bin packing 1D com compatibilidade item-prateleira**, não empacotamento
   3D.

### 7.2 Compatibilidade e sub-orientação

Um jogo cabe num compartimento se `espessuraMm <= larguraUtilMm` e uma das poses vale:

- **retrato** (padrão): `maiorMm <= alturaUtilMm` e `menorMm <= profundidadeUtilMm`
- **paisagem** (alternativa): `menorMm <= alturaUtilMm` e `maiorMm <= profundidadeUtilMm`

**Regra:** o motor usa retrato sempre que ela couber, e só considera paisagem quando
retrato não cabe na altura. Assim ele não produz caixas deitadas de lado por ganho
marginal, mas também não perde soluções viáveis.

Esta é uma suposição de projeto, não um requisito do usuário. Trocar para escolha livre é
alterar uma condição.

### 7.3 Algoritmo

```
1. montarArranjoInicial()   First-Fit Decreasing por espessura, respeitando §7.2,
                            com famílias inseridas em bloco
2. melhorar()               subida de encosta com reinícios; movimentos:
                            mover um jogo · trocar dois jogos · mover família inteira
3. ordenarParaExibicao()    alfabética, com expansões logo após o respectivo base
```

Alternativas descartadas: ILP ou programação por restrições (exato, mas dependência pesada,
lento acima de ~100 jogos, e o ótimo matemático não é o resultado desejado); guloso puro
(rápido, mas com quatro critérios em conflito entrega arranjos ruins sem recurso).

### 7.4 Função de pontuação

```ts
interface PesosDeCriterio {
  readonly sobraConcentrada: number;
  readonly familiaDividida: number;
  readonly alturaDosOlhos: number;
}

interface Pontuacao {
  readonly total: number;
  readonly porTermo: Readonly<Record<keyof PesosDeCriterio, number>>;
}

function pontuar(arranjo: Arranjo, pesos: PesosDeCriterio): Pontuacao
```

Pura, sem estado. `porTermo` existe para a UI mostrar o efeito de cada peso e para os
testes de regressão apontarem qual termo mudou.

| Termo | Medida | Motivo da forma |
|---|---|---|
| Sobra concentrada | soma dos **quadrados** da largura livre por compartimento | o quadrado premia 60 cm livres num lugar sobre 15 cm em quatro |
| Família dividida | penalidade × nº de famílias em compartimentos diferentes | alta, porém **finita**: cede se travar o encaixe, em vez de tornar o problema insolúvel |
| Altura dos olhos | Σ (partidas registradas × conforto da altura da base) | conforto = 1,0 entre 1200 mm e 1650 mm, caindo para as pontas |
| Alfabética | não pontuada | é ordenação final, custo zero (§7.1, ponto 1) |

Hierarquia efetiva: caber é restrição dura; família junta é penalidade forte e finita;
sobra concentrada e altura dos olhos são termos ponderados; alfabética é apresentação.

O gerador aleatório da busca local entra **injetado** (`Gerador`), nunca `Math.random`
global — sem isso os testes não são repetíveis, e sem repetibilidade não há como afirmar
que uma mudança melhorou o resultado.

### 7.5 Escala

Para 50–300 jogos, dezenas de milhares de iterações levam milissegundos. Execução síncrona
na thread principal. Web Worker fica fora do v1; entra se a medição mostrar necessidade.

## 8. Visualização 3D e telas

Três telas: **Estantes** (largura e profundidade internas, lista de alturas de prateleira),
**Coleção** (jogos, medidas, procedência, as quatro vias de entrada) e **Arranjo**.

A cena 3D recebe o `Arranjo` pronto e desenha. Não decide nada; não há física nem colisão
em tempo real, porque a validação já ocorreu no motor.

- **Unidade da cena: metros** (mm ÷ 1000). Three.js assume escala métrica nos planos de
  corte da câmera e na atenuação de luz; montar em milímetros produz z-fighting e
  iluminação incorreta.
- **Câmera** orbital, com vista frontal reta como padrão e botão para retornar a ela.
- **Rótulos são o gargalo, não as caixas.** 300 cuboides são triviais; 300 textos 3D não.
  Portanto: nenhum texto na cena por padrão; o nome aparece em HTML sobreposto no jogo sob
  o cursor ou selecionado. Um botão "mostrar nomes" rotula apenas o que está no campo de
  visão.
- **Clique numa caixa** abre nome, medidas e procedência, com atalho para corrigir a
  medida. Correção dispara recálculo.

Três codificações visuais carregam significado:

- **Cor = família.** Tom forte para o jogo-base, tom claro para as expansões: vê-se de
  longe se o otimizador separou alguma.
- **Contorno tracejado = medida não confirmada.** Erro de dado fica visível na cena, não
  escondido num relatório.
- **Pilha no chão ao lado da estante** para o que não coube.

## 9. Integrações

### 9.1 Precedência das medidas

Medida confirmada pelo usuário vence sempre. Entre as não confirmadas:
planilha → semeada → BGG. Dado próprio supera dado curado, que supera dado remoto.

### 9.2 Rotas do proxy

O navegador nunca fala com terceiro.

| Rota | Origem | Devolve |
|---|---|---|
| `GET /api/colecao` | Ludopedia `/colecao` | jogos, `tp_jogo`, thumbs |
| `GET /api/expansoes/:idBase` | Ludopedia `/jogos?id_jogo_base=` | filhos daquele base |
| `GET /api/partidas` | Ludopedia `/partidas` | contagem por jogo |
| `GET /api/medidas` | BGG `thing?versions=1` | **lista de edições candidatas**, em mm |

`GET /api/medidas` devolve candidatas, não uma resposta. O BGG tem várias versões com
medidas diferentes e a edição nacional costuma divergir da original; o usuário escolhe a
edição. Auto-aceitar a primeira é como o app passaria a mentir sobre as caixas do usuário.

### 9.3 Importador de CSV

Genérico, com mapeamento de colunas na UI: o app lê o cabeçalho, mostra as colunas
encontradas e o usuário indica qual é nome, maior, menor, espessura e, opcionalmente,
unidade e jogo-base. Um template para download acompanha. Cobre o export da Ludopedia, o
export de coleção do BGG e planilha própria sem um parser por formato.

XLSX fica fora do v1 — entra atrás da mesma interface `LeitorDePlanilha`, carregado sob
demanda, se vier a ser pedido.

### 9.4 Tabela semeada de medidas

Arquivo JSON versionado no repositório, lido por `CatalogoSemeado`. Duas espécies de
entrada:

- **Formatos padrão** da indústria, casados por chave (`quadrada-295`, `retangular-295x220`,
  `pequena-160x160`), que cobrem a maior parte de uma coleção típica.
- **Jogos específicos**, casados por nome normalizado, quando a caixa foge do padrão.

```ts
interface EntradaSemeada {
  readonly chave: string;
  readonly nomesConhecidos: readonly string[];   // normalizados para casamento
  readonly maiorMm: Milimetros;
  readonly menorMm: Milimetros;
  readonly espessuraMm: Milimetros;
  readonly fonte: string;                        // de onde veio a medida — ver R3
}
```

O campo `fonte` é obrigatório e existe por causa de R3: cada linha declara sua origem, o
que torna auditável a restrição de não povoar a tabela com dados extraídos do BGG.

## 10. Tratamento de erros

| Falha | Comportamento |
|---|---|
| Token ausente ou inválido | integração desligada na UI com o motivo escrito; app segue com manual, CSV e semeada |
| BGG responde `202 Accepted` | retry com recuo exponencial, teto de tentativas, depois "indisponível agora" |
| BGG limita a taxa (`429`) | fila serializada no proxy, com espaçamento mínimo entre chamadas |
| Medida `0` ou ausente no BGG | tratada como **ausente**, nunca como zero; o jogo cai na lista "faltando medida" |
| Unidade ambígua no CSV | coluna de unidade explícita; sem ela, heurística (valor < 100 provavelmente cm) com confirmação do usuário |
| Linha inválida no CSV | importação parcial e relatório linha a linha; nunca aborta o arquivo inteiro |
| Jogo duplicado na importação | casamento por nome normalizado e confirmação; nunca mescla em silêncio |
| IndexedDB indisponível (aba anônima) | execução em memória, avisando que nada será salvo |

Mensagens de exceção incluem o valor ofensor e o formato esperado.

## 11. Testes

Comando único: `pnpm test`.

- `nucleo/` — unidade pura, sem I/O.
  - invariantes: nenhum compartimento excede a largura; todo jogo está posicionado ou tem
    `motivo`; nenhum jogo aparece duas vezes.
  - bordas: jogo mais alto que qualquer prateleira → `alto-demais`; coleção que não cabe →
    o que sobra é o menos jogado, não um jogo arbitrário.
  - regressão de pontuação: cenário fixo com semente fixa → pontuação conhecida.
  - sub-orientação: caixa 300×220×60 numa prateleira de 250 mm de altura deve virar para
    paisagem, não ser rejeitada.
- Adaptadores — fixtures gravadas (XML real do BGG, JSON real da Ludopedia) em
  `proxy/fixtures/`.
- Dublês — classes falsas nomeadas: `CatalogoFalso`, `RelogioFalso`, `GeradorFixo`. Nada de
  stub inline.
- Importador de CSV — tabela de casos: vírgula decimal, BOM, cabeçalho ausente, unidade
  errada, linha corrompida.
- UI — fumaça com Testing Library nas três telas. A cena 3D não é testada por pixel;
  testa-se a função pura `Arranjo → lista de transformações`.

Desenvolvimento por TDD: teste antes da implementação, e todo defeito corrigido ganha teste
de regressão.

## 12. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Tokens fora do controle do time: Ludopedia por e-mail a `api@ludopedia.com.br`, BGG por registro de aplicação. É o item de maior prazo do projeto. | Solicitar ambos imediatamente. Desenvolvimento segue contra fixtures gravadas e modo offline, então nada trava esperando resposta. |
| R2 | Cobertura de medidas irregular e às vezes errada. | Quatro vias de entrada, precedência explícita (§9.1) e "faltando medida" visível na cena. |
| R3 | Termos do BGG sobre cachear e redistribuir dados não verificados — a página de termos devolveu 403 do ambiente de desenvolvimento. | Até confirmação, a tabela semeada é povoada com medidas próprias e specs de fabricante, **não** com dados extraídos do BGG. Restrição cautelar, relaxável se os termos permitirem. |
| R4 | Ambiguidade de edição no BGG. | O proxy devolve candidatas; a escolha é do usuário (§9.2). |

## 13. Suposições explícitas

- **S1** — Sub-orientação: retrato por padrão, paisagem apenas quando retrato não cabe na
  altura (§7.2). Não foi decidida pelo usuário; é escolha de projeto.
- **S2** — "Família junta" significa **mesmo compartimento**, não adjacência garantida nem
  ordem fixa. A ordenação alfabética de §7.3 põe expansões logo após o base, o que produz
  adjacência na prática sem custo de restrição.
- **S3** — Faixa de conforto para "altura dos olhos": 1200 mm a 1650 mm do chão.
- **S4** — Coleção alvo entre 50 e 300 jogos. Acima disso, revisar §7.5.
