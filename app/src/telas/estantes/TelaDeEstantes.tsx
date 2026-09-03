import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarEstante } from '../../nucleo/estante.js'
import { FormularioDeEstante } from './FormularioDeEstante.js'

/** Composição da tela de Estantes: formulário + lista das já salvas. */
export function TelaDeEstantes() {
  const estantes = useEstadoDoApp((estado) => estado.estantes)
  const estanteAtivaId = useEstadoDoApp((estado) => estado.estanteAtivaId)
  const salvarEstante = useEstadoDoApp((estado) => estado.salvarEstante)
  const selecionarEstante = useEstadoDoApp((estado) => estado.selecionarEstante)

  return (
    <section>
      <div className="tela-grid-duplo">
        <div className="card-painel">
          <div className="card-cabecalho">
            <h2>Estantes</h2>
          </div>
          <FormularioDeEstante
            aoSalvar={(definicao) => {
              const id = crypto.randomUUID()
              salvarEstante(montarEstante(id, definicao))
            }}
          />
        </div>

        <div className="card-painel">
          <div className="card-cabecalho">
            <h3>Suas estantes</h3>
          </div>
          {estantes.length === 0 ? (
            <div className="estado-vazio">
              <p>Nenhuma estante cadastrada ainda.</p>
            </div>
          ) : (
            <ul className="lista-estantes">
              {estantes.map((estante) => (
                <li key={estante.id}>
                  <button
                    type="button"
                    className={`item-estante-botao ${estante.id === estanteAtivaId ? 'item-estante-ativa' : ''}`}
                    onClick={() => selecionarEstante(estante.id)}
                  >
                    <span>{estante.nome}</span>
                    {estante.id === estanteAtivaId ? (
                      <span className="badge-ativa">✓ ativa</span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        clique para ativar
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
