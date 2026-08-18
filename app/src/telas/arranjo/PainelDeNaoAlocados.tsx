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
