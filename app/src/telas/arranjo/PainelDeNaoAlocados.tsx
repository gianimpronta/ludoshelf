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
    return (
      <div style={{ marginTop: '16px', color: 'var(--success)' }}>
        <p>Toda a coleção coube na estante.</p>
      </div>
    )
  }

  return (
    <div className="painel-nao-alocados">
      <h4>Caixas não alocadas ({naoAlocados.length})</h4>
      <ul className="lista-nao-alocados">
        {naoAlocados.map((item) => (
          <li key={item.idJogo}>
            <strong>{nomePorId.get(item.idJogo) ?? item.idJogo}</strong> — motivo:{' '}
            <span style={{ color: '#fb7185' }}>{item.motivo}</span> ({item.faltaMm}mm)
          </li>
        ))}
      </ul>
    </div>
  )
}
