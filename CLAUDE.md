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

## Convenções de domínio

- Identificadores em português. Milímetro inteiro é a unidade interna única; converta só na borda.
- Medidas nomeadas pela caixa (`maiorMm`/`menorMm`/`espessuraMm`), nunca pela pose —
  a pose é decisão do motor, não propriedade do objeto.
- Validadores `exigirX(valor, campo)` lançam `RangeError` citando campo e `JSON.stringify(valor)`.
- `app/src/nucleo/` é TypeScript puro: sem React, Three.js, `fetch`, DOM ou `Math.random`.
  Aleatoriedade entra pela interface `Gerador`.

## Armadilhas de teste que já morderam aqui

- Função de casamento/normalização: teste `f(a) === f(b)`, não a saída de uma entrada só.
  Foi assim que o bug do `ª`/`º` passou.
- Fixture sensível a ordem: ponha o item importante **por último**, senão o teste passa por
  sorte da ordenação do first-fit.
- Negar zero produz `-0`, que reprova em `toBe(0)`.
- Depois de corrigir um bug, prove que o teste morde: reverta a correção e confirme o vermelho.

## PowerShell

- `git commit -m @'...'@` quebra se a mensagem tiver aspas duplas. Use `git commit -F <arquivo>`.

## APIs externas (verificado em 2026-08-16)

- Ludopedia: OAuth2, **não expõe medidas de caixa**. `GET /jogos?id_jogo_base=` dá as expansões.
- BGG: exige `Authorization: Bearer` de aplicação. Medidas só nos itens de versão, em
  polegadas, frequentemente ausentes ou zeradas.
- Tokens vivem só em `.env` do proxy, nunca no bundle do navegador.
