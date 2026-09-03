import { useState } from 'react'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'
import { ModalImportarCsv } from './ModalImportarCsv.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

/** Composição da tela de Coleção: formulário + tabela + modal de importação. */
export function TelaDeColecao() {
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const salvarJogo = useEstadoDoApp((estado) => estado.salvarJogo)
  const salvarJogos = useEstadoDoApp((estado) => estado.salvarJogos)
  const removerJogo = useEstadoDoApp((estado) => estado.removerJogo)
  const catalogo = useEstadoDoApp((estado) => estado.catalogo)

  return (
    <section>
      <div className="tela-grid-duplo">
        <div className="card-painel">
          <div className="card-cabecalho">
            <h2>Coleção</h2>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => setModalImportarAberto(true)}
            >
              📥 Importar CSV
            </button>
          </div>
          <FormularioDeJogo jogosExistentes={jogos} aoSalvar={salvarJogo} catalogo={catalogo} />
        </div>

        <div className="card-painel">
          <div className="card-cabecalho">
            <h3>Seus jogos ({jogos.length})</h3>
          </div>
          <TabelaDeJogos jogos={jogos} aoRemover={removerJogo} />
        </div>
      </div>

      {modalImportarAberto && (
        <ModalImportarCsv
          catalogo={catalogo}
          jogosExistentes={jogos}
          aoSalvarJogos={salvarJogos}
          aoFechar={() => setModalImportarAberto(false)}
        />
      )}
    </section>
  )
}
