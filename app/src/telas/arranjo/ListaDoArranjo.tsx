import type { Arranjo, ContextoDeArranjo, PosicaoDeJogo } from '../../nucleo/arranjo.js'
import type { Estante } from '../../nucleo/estante.js'

export interface PropsListaDoArranjo {
  readonly arranjo: Arranjo
  readonly estante: Estante
  readonly contexto: ContextoDeArranjo
  readonly idJogoEmFoco: string | null
  readonly idJogoSelecionado: string | null
  readonly aoFocarJogo: (id: string | null) => void
  readonly aoSelecionarJogo: (id: string) => void
}

/**
 * Lista de conferência de caixas de jogos alocadas por compartimento na estante.
 * Sincronizada bidirecionalmente com o modelo 3D para foco e seleção.
 */
export function ListaDoArranjo({
  arranjo,
  estante,
  contexto,
  idJogoEmFoco,
  idJogoSelecionado,
  aoFocarJogo,
  aoSelecionarJogo,
}: PropsListaDoArranjo) {
  const posicoesPorCompartimento = new Map<string, PosicaoDeJogo[]>()

  for (const compartimento of estante.compartimentos) {
    posicoesPorCompartimento.set(compartimento.id, [])
  }

  for (const posicao of arranjo.posicoes) {
    const lista = posicoesPorCompartimento.get(posicao.idCompartimento)
    if (lista !== undefined) {
      lista.push(posicao)
    }
  }

  // Ordena cada compartimento da esquerda para a direita pelo deslocamentoXMm
  for (const lista of posicoesPorCompartimento.values()) {
    lista.sort((a, b) => a.deslocamentoXMm - b.deslocamentoXMm)
  }

  return (
    <div className="lista-do-arranjo" style={{ marginTop: '20px' }}>
      <h4 style={{ marginBottom: '12px' }}>
        Disposição na estante ({arranjo.posicoes.length} caixas alocadas)
      </h4>

      <div
        className="compartimentos-lista"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {estante.compartimentos.map((compartimento, indice) => {
          const posicoes = posicoesPorCompartimento.get(compartimento.id) ?? []

          return (
            <div
              key={compartimento.id}
              className="compartimento-card"
              style={{
                background: 'var(--card-bg, #1e293b)',
                padding: '12px 16px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                  Prateleira {indice + 1}
                </h5>
                <span style={{ fontSize: '0.8rem', color: 'var(--texto-secundario, #94a3b8)' }}>
                  {posicoes.length} {posicoes.length === 1 ? 'caixa' : 'caixas'} •{' '}
                  {compartimento.larguraUtilMm} mm
                </span>
              </div>

              {posicoes.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--texto-secundario, #94a3b8)',
                    fontStyle: 'italic',
                  }}
                >
                  Nenhum jogo nesta prateleira.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {posicoes.map((pos) => {
                    const jogo = contexto.jogosPorId.get(pos.idJogo)
                    if (!jogo) return null

                    const emFoco = idJogoEmFoco === pos.idJogo
                    const selecionado = idJogoSelecionado === pos.idJogo
                    const classes = [
                      'item-jogo-arranjo',
                      emFoco ? 'item-jogo-em-foco' : '',
                      selecionado ? 'item-jogo-selecionado' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <li key={pos.idJogo}>
                        <button
                          type="button"
                          className={classes}
                          onClick={() => aoSelecionarJogo(pos.idJogo)}
                          onMouseEnter={() => aoFocarJogo(pos.idJogo)}
                          onMouseLeave={() => aoFocarJogo(null)}
                          aria-label={`Selecionar ${jogo.nome}`}
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: selecionado
                              ? '2px solid var(--accent, #3b82f6)'
                              : emFoco
                                ? '1px solid var(--border-hover, #64748b)'
                                : '1px solid var(--border, #334155)',
                            background: selecionado
                              ? 'rgba(59, 130, 246, 0.15)'
                              : emFoco
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 500 }}>{jogo.nome}</span>
                            {jogo.frequencia.tipo === 'destaque' && (
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>⭐</span>
                            )}
                            {jogo.idJogoBase !== null && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(168, 85, 247, 0.2)',
                                  color: '#c084fc',
                                }}
                              >
                                Expansão
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--texto-secundario, #94a3b8)',
                            }}
                          >
                            x = {pos.deslocamentoXMm} mm ({jogo.medidas.espessuraMm} mm espessura)
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
