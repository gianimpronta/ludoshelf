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
      <h2>Estantes</h2>
      <FormularioDeEstante
        aoSalvar={(definicao) => {
          const id = crypto.randomUUID()
          salvarEstante(montarEstante(id, definicao))
        }}
      />

      <h3>Suas estantes</h3>
      {estantes.length === 0 ? (
        <p>Nenhuma estante cadastrada ainda.</p>
      ) : (
        <ul>
          {estantes.map((estante) => (
            <li key={estante.id}>
              <button type="button" onClick={() => selecionarEstante(estante.id)}>
                {estante.nome}
                {estante.id === estanteAtivaId ? ' (ativa)' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
