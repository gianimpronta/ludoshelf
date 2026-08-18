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
      <h2>Coleção</h2>
      <FormularioDeJogo jogosExistentes={jogos} aoSalvar={salvarJogo} />
      <TabelaDeJogos jogos={jogos} aoRemover={removerJogo} />
    </section>
  )
}
