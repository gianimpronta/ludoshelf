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
