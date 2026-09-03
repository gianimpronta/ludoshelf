import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

/** Composição da tela de Coleção: formulário + tabela. */
export function TelaDeColecao() {
  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const salvarJogo = useEstadoDoApp((estado) => estado.salvarJogo)
  const removerJogo = useEstadoDoApp((estado) => estado.removerJogo)

  return (
    <section>
      <div className="tela-grid-duplo">
        <div className="card-painel">
          <div className="card-cabecalho">
            <h2>Coleção</h2>
          </div>
          <FormularioDeJogo jogosExistentes={jogos} aoSalvar={salvarJogo} />
        </div>

        <div className="card-painel">
          <div className="card-cabecalho">
            <h3>Seus jogos ({jogos.length})</h3>
          </div>
          <TabelaDeJogos jogos={jogos} aoRemover={removerJogo} />
        </div>
      </div>
    </section>
  )
}
