import { useState } from 'react'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'
import { ModalImportarCsv } from './ModalImportarCsv.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

/** Composição da tela de Coleção: formulário + tabela + modal de importação. */
export function TelaDeColecao() {
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)

  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const salvarJogo = useEstadoDoApp((estado) => estado.salvarJogo)
  const salvarJogos = useEstadoDoApp((estado) => estado.salvarJogos)
  const removerJogo = useEstadoDoApp((estado) => estado.removerJogo)
  const limparColecao = useEstadoDoApp((estado) => estado.limparColecao)
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
            {jogos.length > 0 &&
              (confirmandoLimpeza ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-remover"
                    style={{ fontWeight: 600 }}
                    onClick={async () => {
                      await limparColecao()
                      setConfirmandoLimpeza(false)
                    }}
                  >
                    Confirmar limpeza ({jogos.length})
                  </button>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => setConfirmandoLimpeza(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-remover"
                  onClick={() => setConfirmandoLimpeza(true)}
                >
                  🗑️ Limpar coleção
                </button>
              ))}
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
