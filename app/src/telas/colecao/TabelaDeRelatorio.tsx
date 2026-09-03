import type { ItemDeErroLinha, ItemDePendencia } from '../../importacao/tipos.js'

export function TabelaDeRelatorio({
  pendencias,
  erros,
  totalSalvos,
}: {
  pendencias: readonly ItemDePendencia[]
  erros: readonly ItemDeErroLinha[]
  totalSalvos: number
}) {
  return (
    <div className="relatorio-importacao">
      <div className="relatorio-resumo-sucesso">
        <span className="icone-sucesso">✓</span>
        <strong>{totalSalvos} jogo(s) importado(s) com sucesso na coleção!</strong>
      </div>

      {pendencias.length > 0 && (
        <div className="relatorio-secao-pendencias" style={{ marginTop: '16px' }}>
          <h4>Avisos e Pendências ({pendencias.length})</h4>
          <ul className="relatorio-lista">
            {pendencias.map((p, idx) => (
              <li key={idx} className="relatorio-item-pendencia">
                <span className="badge-linha">Linha {p.linha}</span>
                <strong>{p.nome}:</strong> {p.detalhe}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erros.length > 0 && (
        <div className="relatorio-secao-erros" style={{ marginTop: '16px' }}>
          <h4 style={{ color: 'var(--danger)' }}>Erros de Leitura ({erros.length})</h4>
          <ul className="relatorio-lista">
            {erros.map((e, idx) => (
              <li key={idx} className="relatorio-item-erro">
                <span className="badge-linha">Linha {e.linha}</span>
                <span>{e.motivo}</span>
                {e.dadoBruto && <code style={{ marginLeft: '6px' }}>({e.dadoBruto})</code>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
