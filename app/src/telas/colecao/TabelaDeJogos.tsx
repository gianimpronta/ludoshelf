import type { CaixaDeJogo } from '../../nucleo/jogo.js'

export function TabelaDeJogos({
  jogos,
  aoRemover,
  aoEditar,
}: {
  jogos: readonly CaixaDeJogo[]
  aoRemover: (id: string) => void
  aoEditar?: (jogo: CaixaDeJogo) => void
}) {
  if (jogos.length === 0) {
    return (
      <div className="estado-vazio">
        <p>Nenhum jogo cadastrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="tabela-container">
      <table className="tabela-jogos">
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
              <td>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                >
                  <span style={{ fontWeight: 500 }}>{jogo.nome}</span>
                  {jogo.frequencia.tipo === 'destaque' && (
                    <span className="badge-destaque-item">★ destaque</span>
                  )}
                  {jogo.idJogoBase !== null && <span className="badge-versao">expansão</span>}
                  {jogo.idBgg !== null && (
                    <span
                      className="badge-procedencia"
                      style={{ fontSize: '0.75rem', opacity: 0.8 }}
                    >
                      BGG #{jogo.idBgg}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pill-medida">
                    {jogo.medidas.maiorMm} × {jogo.medidas.menorMm} × {jogo.medidas.espessuraMm} mm
                  </span>
                  {!jogo.medidas.confirmadaPeloUsuario && (
                    <span
                      className="badge-aviso"
                      style={{ fontSize: '0.75rem', color: 'var(--warning, #f59e0b)' }}
                      title="Dimensão provisória / não confirmada"
                    >
                      ⚠️ Pendente
                    </span>
                  )}
                </div>
              </td>
              <td>
                <span className="badge-procedencia">{jogo.medidas.origem.tipo}</span>
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {aoEditar && (
                  <button
                    type="button"
                    className="btn-secundario"
                    style={{ marginRight: '8px', padding: '4px 8px', fontSize: '0.85rem' }}
                    aria-label={`Editar ${jogo.nome}`}
                    onClick={() => aoEditar(jogo)}
                  >
                    ✏️ Editar
                  </button>
                )}
                <button type="button" className="btn-remover" onClick={() => aoRemover(jogo.id)}>
                  Remover {jogo.nome}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
