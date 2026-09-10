import type { JogoNaoAlocado } from '../../nucleo/arranjo.js'

/**
 * Motivo + `faltaMm` de cada jogo que não coube (spec §8.3).
 * Suporta foco e clique para abrir no Painel de Inspeção.
 */
export function PainelDeNaoAlocados({
  naoAlocados,
  nomePorId,
  idJogoEmFoco,
  idJogoSelecionado,
  aoFocarJogo,
  aoSelecionarJogo,
}: {
  naoAlocados: readonly JogoNaoAlocado[]
  nomePorId: ReadonlyMap<string, string>
  idJogoEmFoco?: string | null
  idJogoSelecionado?: string | null
  aoFocarJogo?: (id: string | null) => void
  aoSelecionarJogo?: (id: string) => void
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
      <ul className="lista-nao-alocados" style={{ listStyle: 'none', padding: 0 }}>
        {naoAlocados.map((item) => {
          const emFoco = idJogoEmFoco === item.idJogo
          const selecionado = idJogoSelecionado === item.idJogo

          return (
            <li key={item.idJogo} style={{ marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => aoSelecionarJogo?.(item.idJogo)}
                onMouseEnter={() => aoFocarJogo?.(item.idJogo)}
                onMouseLeave={() => aoFocarJogo?.(null)}
                style={{
                  background: selecionado
                    ? 'rgba(244, 63, 94, 0.2)'
                    : emFoco
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'transparent',
                  border: selecionado ? '1px solid #fb7185' : '1px solid transparent',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: aoSelecionarJogo ? 'pointer' : 'default',
                  display: 'inline-block',
                  width: '100%',
                }}
              >
                <strong>{nomePorId.get(item.idJogo) ?? item.idJogo}</strong> — motivo:{' '}
                <span style={{ color: '#fb7185' }}>{item.motivo}</span> ({item.faltaMm}mm)
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
