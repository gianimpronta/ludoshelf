# LudoShelf

Organiza caixas de jogos de tabuleiro em estantes: o usuário informa as medidas da
estante, o motor calcula o arranjo, o navegador mostra em 3D.
Spec em `docs/superpowers/specs/`, planos em `docs/superpowers/plans/`.

## Comandos

- `pnpm test` — Vitest, roda tudo. Comando único de teste.
- `pnpm typecheck` — confira `$LASTEXITCODE`, não a saída (PowerShell polui stderr).
- `pnpm format` / `pnpm format:check` — Prettier.

## Restrições do stack (verificadas, não presumidas)

- TypeScript 7 e `typescript-eslint@8` são incompatíveis (`typescript: ">=4.8.4 <6.1.0"`).
  **Não há ESLint no projeto — não adicione.**
- A fronteira do núcleo é garantida por `app/tests/fronteira.test.ts`, não por lint.
- Vitest 4: `test.projects` no config da raiz; só `app/` roda testes. Import quebrado diz
  "Cannot find module", não "Failed to resolve import".
- Imports relativos terminam em `.js` (ESM puro).
- `app/tsconfig.json` precisa de `types: ["node"]` por causa do teste de fronteira.

## GitHub / CodeRabbit

- Ao implementar "direta" (sem subagentes), crie a branch **antes** do primeiro
  commit — nada no modo "direta" isenta da regra de nunca commitar em `main`.
  Esquecer isso custou um `reset --hard` + branch + `push --force-with-lease` depois.
- O CodeRabbit pode empurrar um commit `fix: apply CodeRabbit auto-fixes` direto na
  branch da PR enquanto você trabalha localmente — `git fetch`/rebase antes de dar
  push de novo. Trate esses auto-fixes como sugestão, não verdade: já teve um com
  erro de sinal (`+ alturaLivreMm/2` em vez de `-`) que trocava um bug por outro.
- `gh pr comment N --body "@coderabbitai review"` não força nada se ele já revisou o
  push automaticamente — responde "Already reviewed". A revisão roda sozinha a cada push.
  Mas se o check aparecer "rate limited" (não "completed"), o comentário força uma
  passada nova.
- Comentários inline: `gh api repos/<owner>/<repo>/pulls/N/comments`. Responder a um:
  `gh api repos/<owner>/<repo>/pulls/N/comments/<id>/replies -f body="..."` — o número
  da PR é obrigatório no path; `pulls/comments/<id>/replies` sem ele dá 404.
- Resolver threads via GraphQL quando o bot não consegue sozinho ("retry or resolve
  manually"): `gh api graphql -f query='mutation { resolveReviewThread(input:
  {threadId: "PRRT_..."}) { thread { isResolved } } }'`. IDs de thread saem de uma
  query `reviewThreads` separada, não do REST de comentários.
- O GitHub não remapeia automaticamente a linha de um comentário antigo quando o
  código muda por baixo — um achado já corrigido pode aparecer `isResolved: false`
  mesmo devidamente tratado. Confira o código antes de assumir que é pendente.

## Convenções de domínio

- Identificadores em português. Milímetro inteiro é a unidade interna única; converta só na borda.
- Medidas nomeadas pela caixa (`maiorMm`/`menorMm`/`espessuraMm`), nunca pela pose —
  a pose é decisão do motor, não propriedade do objeto.
- Validadores `exigirX(valor, campo)` lançam `RangeError` citando campo e `JSON.stringify(valor)`.
  Três camadas em `medidas.ts`: `exigirMedidaValida` (borda, aceita fração — cm/polegada
  antes de arredondar), `exigirMilimetroValido` (domínio interno, positivo + inteiro),
  `exigirDistanciaValida` (domínio interno, inteiro mas aceita zero). Não misture.
- `app/src/nucleo/` é TypeScript puro: sem React, Three.js, `fetch`, DOM ou `Math.random`.
  Aleatoriedade entra pela interface `Gerador`.

## Armadilhas de teste que já morderam aqui

- Função de casamento/normalização: teste `f(a) === f(b)`, não a saída de uma entrada só.
  Foi assim que o bug do `ª`/`º` passou.
- Fixture sensível a ordem: ponha o item importante **por último**, senão o teste passa por
  sorte da ordenação do first-fit.
- Negar zero produz `-0`, que reprova em `toBe(0)`.
- Depois de corrigir um bug, prove que o teste morde: reverta a correção e confirme o vermelho.
- Mapeamento 1:1 (todo item de entrada aparece exatamente uma vez na saída): não some só
  `posicoes.length + naoAlocados.length` contra o total — um ID duplicado mais um ID
  ausente se cancelam. Confira `Set.size === array.length` em cada lado, e compare a
  união dos IDs de saída com o conjunto esperado de entrada.
- `<Canvas>` do react-three-fiber precisa de um pai com altura explícita (`height` em
  px) — sem isso ele colapsa para o padrão 300x150. jsdom não faz layout de verdade,
  então só aparece em verificação manual no navegador.
- `vi.useFakeTimers()` quebra qualquer teste que monte um `<Canvas>` do r3f: o loop de
  render usa `requestAnimationFrame`, que fica fake também, e como o r3f reagenda a si
  mesmo a cada frame isso vira recursão infinita — `userEvent.click` trava para sempre.
  Use timers reais nesses testes.

## PowerShell

- `git commit -m @'...'@` quebra se a mensagem tiver aspas duplas. Use `git commit -F <arquivo>`.

## APIs externas (verificado em 2026-08-16)

- Ludopedia: OAuth2, **não expõe medidas de caixa**. `GET /jogos?id_jogo_base=` dá as expansões.
- BGG: exige `Authorization: Bearer` de aplicação. Medidas só nos itens de versão, em
  polegadas, frequentemente ausentes ou zeradas.
- Tokens vivem só em `.env` do proxy, nunca no bundle do navegador.

- 
