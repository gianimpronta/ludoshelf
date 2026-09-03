# LudoShelf — importação de CSV e catálogo semeado (plano 3)

- **Data:** 2026-09-03
- **Status:** aguardando aprovação
- **Repositório:** https://github.com/gianimpronta/ludoshelf
- **Depende de:**
  - `docs/superpowers/specs/2026-08-16-ludoshelf-design.md` (spec geral do v1)
  - `docs/superpowers/specs/2026-08-17-app-minimo-design.md` (plano 2: app mínimo ponta a ponta)

---

## 1. Objetivo

Permitir que o usuário popule e enriqueça sua coleção em lote sem a necessidade de cadastrar manualmente jogo por jogo:
1. **Importação flexível de CSV**: ler arquivos de qualquer origem (exportação da Ludopedia, exportação do BoardGameGeek ou planilha pessoal), mapeando colunas de forma interativa na interface.
2. **Catálogo semeado de medidas**: banco de dados versionado em JSON com formatos padrão da indústria (ex.: caixa quadrada 295×295×70 mm) e jogos populares fora do padrão, autocompletando dimensões ausentes com precedência controlada e identificação de procedência auditável.
3. **Resolução de relações e sinais**: vinculação de expansões aos jogos-base (`idJogoBase`) e importação de contagem de partidas para alimentar os critérios "família junta" e "altura dos olhos" sem depender de integrações de rede ou tokens de API.

---

## 2. Escopo

### Dentro:
- **Parser de CSV (`app/src/importacao/`)**:
  - Parser puro em TypeScript, resiliente e sem dependências de pacotes externos pesados.
  - Suporte a RFC 4180: campos entre aspas, quebras de linha internas, delimitadores por vírgula (`,`) ou ponto-e-vírgula (`;`) com detecção automática.
  - Suporte a UTF-8 com ou sem BOM.
  - Interpretação de números com vírgula ou ponto decimal (`29,5` vs `29.5`).
- **Mapeador e processador de importação**:
  - Mapeamento interativo de colunas na interface: `nome` (obrigatório), dimensões (`maior`, `menor`, `espessura`), `unidade` (mm, cm, pol/in), `jogo-base` e `partidas`.
  - Heurística de unidade quando a coluna de unidade for omitida: valores menores que 100 assumem `cm` (com aviso visual para confirmação).
  - Resolução de parentesco em dois níveis: resolve `jogo-base` procurando por nome normalizado entre os jogos já existentes no banco local e entre os outros jogos do próprio lote CSV. Caso não encontre, importa com `idJogoBase: null` e registra pendência.
  - Tratamento de duplicatas contra a coleção existente (política por item ou em lote: substituir dados, ignorar ou manter existente).
  - Sanitização de nomes: remoção de símbolos de marca como `™` (U+2122 / `\p{So}`) antes da normalização (resolvendo o item deixado anotado no Plano 1) e rejeição explícita de nomes que resultem em string vazia.
  - Relatório linha a linha com importação parcial: linhas válidas são importadas e linhas com falhas geram mensagens claras com o número da linha.
  - Download de template/modelo CSV pronto para uso (`template-ludoshelf.csv`).
- **Catálogo semeado (`app/src/catalogo/`)**:
  - Interface assíncrona `CatalogoDeJogos` (preparando o contrato para o futuro `CatalogoHttp` do Plano 4).
  - Tabela versionada `tabela-semeada.json` contendo:
    1. Formatos padrão de caixas (ex: `quadrada-295`, `retangular-295x220`, `pequena-160x160`, etc.).
    2. Títulos populares fora de padrão com medidas físicas confirmadas e campo `fonte` obrigatório e auditável (em cumprimento estrito ao risco R3: sem extração direta do BGG).
  - Classe `CatalogoSemeado` implementando `CatalogoDeJogos` via busca por nome normalizado.
  - Dublê de teste nomeado `CatalogoFalso`.
  - Atalho no formulário manual de jogo para aplicar rapidamente um formato padrão.
- **Persistência em lote**:
  - Adição do método `salvarJogos(jogos: readonly CaixaDeJogo[])` na interface `RepositorioDeColecao`, com implementação via `bulkPut` no Dexie e array em memória no teste.
- **Integração na interface (Tela de Coleção)**:
  - Fluxo de importação modal/em etapas: Seleção do arquivo → Mapeamento de colunas → Pré-visualização & Conflitos → Relatório de importação.
  - Botão de download do modelo CSV.

### Fora (fica para o Plano 4 e fases posteriores):
- Proxy HTTP em Node/Hono e cofre de tokens em `.env`.
- Chamadas de rede remotas à API da Ludopedia e ao XML do BGG.
- Leitura direta de arquivos binários `.xlsx` (fora do v1 conforme spec original §9.3).
- Arrastar e soltar caixas na cena 3D (fase 2 da spec original).

---

## 3. Decisões Arquiteturais

| # | Decisão | Motivo |
|---|---|---|
| **D1** | Parser de CSV próprio e minimalista em TypeScript puro | Evita adicionar bibliotecas pesadas (como PapaParse). Um parser RFC 4180 em ~80 linhas atende 100% dos requisitos de delimitador, aspas, quebra de linha e BOM com cobertura total de testes. |
| **D2** | Interface `CatalogoDeJogos` assíncrona (`Promise`) | Permite que o `CatalogoSemeado` (dados locais) e o futuro `CatalogoHttp` (Plano 4, chamadas ao proxy) compartilhem o mesmo contrato sem exigir refatorações no estado ou na UI. |
| **D3** | Precedência estrita de medidas (§9.1 da spec base) | `manual/confirmada` > `planilha` > `semeada` > `bgg`. Medidas preenchidas pela tabela semeada entram com `confirmadaPeloUsuario: false` e aparecem com contorno tracejado na cena 3D. |
| **D4** | Importação parcial e resiliente com relatório estruturado | Planilhas reais frequentemente contêm cabeçalhos adicionais, linhas em branco ou comentários. Abortar o arquivo inteiro prejudica a experiência; importar as linhas válidas e reportar os erros linha a linha é muito superior. |
| **D5** | Resolução de expansões em dois passos | Um CSV pode conter o jogo-base na linha 5 e a expansão na linha 2. Ao indexar os nomes normalizados de todos os itens do lote antes de vincular os `idJogoBase`, garantimos que a ordem das linhas no arquivo não afete a montagem das famílias. |
| **D6** | Template CSV gerado dinamicamente em memória | O botão "Baixar modelo CSV" gera um `Blob` com `\uFEFF` (BOM UTF-8) e cria URL de download no cliente. Dispensa servir arquivos estáticos extras no Vite e garante abertura correta no Microsoft Excel em português. |
| **D7** | `bulkPut` no repositório de persistência | Importar centenas de jogos com chamadas individuais de `put` no IndexedDB geraria sobrecarga desnecessária de transações; `bulkPut` resolve a persistência de 300 jogos em poucos milissegundos. |

---

## 4. Arquitetura e Fronteiras de Módulo

```
app/src/
├─ nucleo/              (intocado — funções de validação e medidas reutilizadas)
├─ importacao/          (novo)
│  ├─ leitorCsv.ts      parser RFC 4180 puro (delimitadores, aspas, BOM, decimais)
│  ├─ sanitizarNome.ts  remoção de \p{So} (™) e validação de nome não-vazio
│  ├─ tipos.ts          interfaces de mapeamento, linhas e relatório
│  ├─ processarCsv.ts   orquestrador de conversão: linhas -> CaixaDeJogo[] + pendências
│  └─ templateCsv.ts    gerador de conteúdo do template CSV para download
├─ catalogo/            (novo)
│  ├─ CatalogoDeJogos.ts interface assíncrona e tipos de busca/formato
│  ├─ CatalogoSemeado.ts implementação baseada no JSON embutido
│  ├─ CatalogoFalso.ts   dublê nomeado para testes de unidade e UI
│  └─ dados/
│     └─ tabela-semeada.json dados auditados com campo "fonte"
├─ persistencia/
│  ├─ RepositorioDeColecao.ts  (+ salvarJogos em lote)
│  ├─ RepositorioDexie.ts      (implementação com bulkPut)
│  └─ RepositorioEmMemoria.ts  (implementação em memória)
├─ estado/
│  └─ useEstadoDoApp.ts        (+ action importarJogos, injeção de catalogo)
├─ telas/
│  └─ colecao/
│     ├─ ModalImportarCsv.tsx  fluxo em 4 passos de importação
│     ├─ TabelaDeRelatorio.tsx apresentação visual de pendências/erros
│     ├─ FormularioDeJogo.tsx  (+ seletor de formatos padrão da indústria)
│     └─ TelaDeColecao.tsx     (+ botão Importar CSV e Baixar Modelo)
```

### Regras de fronteira:
- `importacao/` e `catalogo/` importam apenas tipos e validadores de `nucleo/` (`Milimetros`, `criarMedidas`, `normalizarNome`, `exigirMilimetroValido`). Não importam React, Three.js ou Dexie.
- `estado/` consome `CatalogoDeJogos` por injeção e aciona `salvarJogos` no repositório.
- Telas React não fazem parse direto nem acessam o repositório diretamente: disparam ações do store.

---

## 5. Modelo de Dados da Importação e do Catálogo

### 5.1 Configuração de Mapeamento do CSV
```ts
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

export interface OpcoesDeImportacao {
  readonly mapeamento: MapeamentoDeColunas
  readonly unidadePadrao?: UnidadeDeComprimento // se colunaUnidade for omitida
  readonly politicaDuplicatas: 'substituir' | 'ignorar' | 'manter-existente'
  readonly tentarCompletarComCatalogo: boolean
}
```

### 5.2 Relatório de Importação
```ts
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

export interface RelatorioDeImportacao {
  readonly totalLinhasArquivo: number
  readonly totalProcessadosSucesso: number
  readonly totalJogosSalvos: number
  readonly pendencias: readonly ItemDePendencia[]
  readonly erros: readonly ItemDeErroLinha[]
}
```

### 5.3 Catálogo Semeado e Formatos Padrão
```ts
export interface FormatoPadrao {
  readonly chave: string
  readonly rotulo: string
  readonly maiorMm: Milimetros
  readonly menorMm: Milimetros
  readonly espessuraMm: Milimetros
  readonly fonte: string
}

export interface EntradaSemeada extends FormatoPadrao {
  readonly nomesConhecidos: readonly string[] // nomes normalizados para casamento
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

---

## 6. Fluxo de Importação na Interface

```
[Tela de Coleção]
  │
  ├─▶ Botão "Baixar modelo CSV" ──▶ Gera e baixa template-ludoshelf.csv
  │
  └─▶ Botão "Importar CSV"
        │
        ▼
   [Passo 1: Selecionar Arquivo]
   Arrastar ou selecionar arquivo .csv
        │
        ▼
   [Passo 2: Mapear Colunas]
   Tabela com as primeiras 3-5 linhas detectadas.
   Selects para indicar qual coluna do CSV corresponde a:
   - Nome (obrigatório)
   - Maior dimensão / Comprimento
   - Menor dimensão / Largura
   - Espessura / Altura da caixa
   - Unidade (opcional) ou seletor de unidade padrão
   - Jogo-base (opcional)
   - Partidas (opcional)
   Checkbox: "Completar medidas ausentes usando o catálogo semeado"
        │
        ▼
   [Passo 3: Prévia & Conflitos]
   Exibição do total a importar, contagem de jogos-base vinculados,
   e seleção da política para duplicatas encontradas na coleção.
        │
        ▼
   [Passo 4: Conclusão & Relatório]
   Resumo dos jogos importados com sucesso.
   Lista expansível com pendências (ex.: expansões cujo base não foi achado)
   e erros de linhas descartadas (com número da linha e motivo).
   Botão "Concluir" que atualiza a tabela da coleção e fecha o modal.
```

---

## 7. Tratamento de Erros e Casos de Borda

| Cenário / Erro | Tratamento e Comportamento |
|---|---|
| Nome com `™` (ex: `Catan™`) | O caractere Unicode `™` (U+2122 / `\p{So}`) é removido antes da normalização, produzindo `'catan'` e casando corretamente com jogos da coleção ou tabela semeada. |
| Nome vazio ou apenas pontuação (ex: `---` ou `   `) | Linha rejeitada com erro no relatório (`ItemDeErroLinha` indicando linha e motivo), sem quebrar o processamento das demais linhas. |
| Delimitador vírgula vs ponto-e-vírgula | O leitor analisa as primeiras linhas para contar ocorrências de `;` vs `,` fora de aspas e seleciona o delimitador dominante automaticamente. |
| Quebras de linha e vírgulas dentro de aspas | Suporte total a campos entre aspas (`"Nome, O Jogo"`, `"Texto com\nquebra"`). |
| Números decimais com vírgula (`29,5`) | Substituição de vírgula por ponto antes da conversão para `Number`. |
| Unidade ambígua / omitida | Heurística: se valor < 100, assume-se `cm` e converte-se multiplicando por 10 (`29.5 cm` → `295 mm`). Se >= 100, assume-se `mm`. A UI exibe a suposição para confirmação. |
| Medida ausente na linha do CSV | Se a opção de completar com catálogo semeado estiver ativa e houver casamento por nome, preenche com `origem: { tipo: 'semeada' }` e `confirmadaPeloUsuario: false`. Se não casar, importa o jogo com medidas padrão provisórias marcadas como pendência no relatório. |
| Jogo-base do CSV não encontrado | O jogo é importado com `idJogoBase: null` e uma pendência do tipo `jogo-base-nao-encontrado` é registrada no relatório citando o nome buscado. |
| Jogo duplicado | Verificação por nome normalizado. Usuário pode optar por sobrescrever dados, ignorar o item do CSV ou manter o existente. |

---

## 8. Estratégia de Testes (TDD)

1. **Testes de Unidade (`app/src/importacao/`)**:
   - `leitorCsv.test.ts`:
     - Separação por vírgula e ponto-e-vírgula.
     - Preservação de espaços ou trims de cabeçalho.
     - Campos entre aspas duplas contendo delimitadores e quebras de linha.
     - Escape de aspas duplas (`""`).
     - Remoção de UTF-8 BOM (`\uFEFF`).
   - `sanitizarNome.test.ts`:
     - Remoção de `™` mantendo casamento com `normalizarNome`.
     - Rejeição de string vazia ou apenas símbolos.
   - `processarCsv.test.ts`:
     - Resolução de medidas com unidades (`mm`, `cm`, `in`).
     - Resolução de `jogo-base` contido no próprio lote CSV.
     - Resolução de `jogo-base` existente previamente na coleção.
     - Detecção de duplicatas e aplicação de políticas de resolução.
     - Geração correta de relatório com erros de linha e pendências.
2. **Testes de Unidade (`app/src/catalogo/`)**:
   - `CatalogoSemeado.test.ts`:
     - Busca de jogo existente por nome exato e normalizado (sem acento, case-insensitive).
     - Lista de formatos padrão da indústria retornando medidas válidas.
     - Integridade da base JSON: todos os itens possuem campo `fonte` preenchido e medidas positivas inteiras.
3. **Testes de Persistência (`app/src/persistencia/`)**:
   - `salvarJogos` no `RepositorioDexie.test.ts` e `RepositorioEmMemoria.test.ts` persistindo listas em massa com preservação de integridade.
4. **Testes de Interface com React Testing Library**:
   - `ModalImportarCsv.test.tsx`:
     - Renderização das etapas do fluxo.
     - Mapeamento de colunas e acionamento da ação de salvar no store.
     - Exibição adequada do relatório de pendências.
   - `FormularioDeJogo.test.tsx`:
     - Preenchimento rápido via atalho de formato padrão de caixa.
5. **Teste de Fronteira**:
   - Atualização de `app/tests/fronteira.test.ts` para validar que `importacao/` e `catalogo/` não importam bibliotecas proibidas nem violam o isolamento do núcleo.

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| **R3 (Spec v1): Termos do BGG sobre dados extraídos** | Nenhuma medida da tabela semeada provém de raspagem ou extração do BGG. Toda entrada possui o campo `fonte` preenchido com fontes próprias ou fabricantes/editoras nacionais. |
| **Codificação do arquivo CSV (ANSI / Windows-1252)** | O leitor utilizará `FileReader` com fallback e a interface exibirá aviso explícito recomendando salvar como UTF-8 caso encontre sequências malformadas. |
| **Desempenho com arquivos grandes (> 500 linhas)** | Processamento assíncrono em chunk ou web micro-task se necessário, e inserção em lote (`bulkPut`) no IndexedDB. |

---

## 10. Suposições Explícitas

- **S1**: Medidas vindas de CSV são tratadas como `origem: { tipo: 'planilha', arquivo: string, linha: number }` e entram como `confirmadaPeloUsuario: false` se derivadas de heurística, ou `true` se fornecidas explicitamente pelo usuário na confirmação do mapeamento.
- **S2**: Medidas aplicadas via tabela semeada entram sempre com `confirmadaPeloUsuario: false`, gerando contorno tracejado na cena 3D até que o usuário as confirme manualmente.
- **S3**: O template CSV padrão usa ponto-e-vírgula como delimitador padrão acompanhado de UTF-8 BOM, que é o padrão nativo com maior compatibilidade para versões brasileiras do Microsoft Excel.
