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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{jogo.nome}</span>
                  {jogo.frequencia.tipo === 'destaque' && (
                    <span className="badge-destaque-item">★ destaque</span>
                  )}
                  {jogo.idJogoBase !== null && <span className="badge-versao">expansão</span>}
                </div>
              </td>
              <td>
                <span className="pill-medida">
                  {jogo.medidas.maiorMm} × {jogo.medidas.menorMm} × {jogo.medidas.espessuraMm} mm
                </span>
              </td>
              <td>
                <span className="badge-procedencia">{jogo.medidas.origem.tipo}</span>
              </td>
              <td style={{ textAlign: 'right' }}>
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
