import { useState } from 'react'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'
import { ModalEnriquecerPendencias } from './ModalEnriquecerPendencias.js'
import { ModalImportarCsv } from './ModalImportarCsv.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

/** Composição da tela de Coleção: formulário + tabela + modais de importação e enriquecimento. */
export function TelaDeColecao() {
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false)
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)
  const [jogoEmEdicao, setJogoEmEdicao] = useState<CaixaDeJogo | null>(null)

  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const salvarJogo = useEstadoDoApp((estado) => estado.salvarJogo)
  const salvarJogos = useEstadoDoApp((estado) => estado.salvarJogos)
  const removerJogo = useEstadoDoApp((estado) => estado.removerJogo)
  const limparColecao = useEstadoDoApp((estado) => estado.limparColecao)
  const catalogo = useEstadoDoApp((estado) => estado.catalogo)

  const pendentes = jogos.filter((j) => !j.medidas.confirmadaPeloUsuario)

  return (
    <section>
      <div className="tela-grid-duplo">
        <div className="card-painel">
          <div className="card-cabecalho">
            <h2>Coleção</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {pendentes.length > 0 && (
                <button
                  type="button"
                  className="btn-secundario"
                  style={{ color: 'var(--warning, #f59e0b)' }}
                  onClick={() => setModalPendenciasAberto(true)}
                  title="Resolver versões de caixas para jogos com medidas pendentes"
                >
                  ⚡ Pendências ({pendentes.length})
                </button>
              )}
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setModalImportarAberto(true)}
              >
                📥 Importar CSV
              </button>
            </div>
          </div>
          <FormularioDeJogo
            jogosExistentes={jogos}
            aoSalvar={async (j) => {
              await salvarJogo(j)
              setJogoEmEdicao(null)
            }}
            jogoEmEdicao={jogoEmEdicao}
            aoCancelarEdicao={() => setJogoEmEdicao(null)}
            catalogo={catalogo}
          />
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
          <TabelaDeJogos
            jogos={jogos}
            aoRemover={removerJogo}
            aoEditar={(jogo) => setJogoEmEdicao(jogo)}
          />
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

      {modalPendenciasAberto && (
        <ModalEnriquecerPendencias
          jogosPendentes={pendentes}
          catalogo={catalogo}
          aoSalvarJogos={salvarJogos}
          aoFechar={() => setModalPendenciasAberto(false)}
        />
      )}
    </section>
  )
}
