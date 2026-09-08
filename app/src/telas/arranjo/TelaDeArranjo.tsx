import { useEffect, useMemo, useRef, useState } from 'react'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarContexto } from '../../nucleo/arranjo.js'
import { CenaDoArranjo } from '../../cena/CenaDoArranjo.js'
import { LimiteDeErroDaCena } from '../../cena/LimiteDeErroDaCena.js'
import { PainelDeNaoAlocados } from './PainelDeNaoAlocados.js'
import { ListaDoArranjo } from './ListaDoArranjo.js'
import { PainelDeInspecao } from './PainelDeInspecao.js'

/**
 * Composição da tela de Arranjo: viewport 3D interativo com foco/seleção bidirecional,
 * painel de inspeção lateral, lista do arranjo por compartimento e exportação PNG.
 */
export function TelaDeArranjo() {
  const arranjo = useEstadoDoApp((estado) => estado.arranjo)
  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const estantes = useEstadoDoApp((estado) => estado.estantes)
  const estanteAtivaId = useEstadoDoApp((estado) => estado.estanteAtivaId)
  const calculando = useEstadoDoApp((estado) => estado.calculando)
  const recalcularArranjo = useEstadoDoApp((estado) => estado.recalcularArranjo)

  const [idJogoEmFoco, setIdJogoEmFoco] = useState<string | null>(null)
  const [idJogoSelecionado, setIdJogoSelecionado] = useState<string | null>(null)
  const [menuExportarAberto, setMenuExportarAberto] = useState(false)

  const containerCanvasRef = useRef<HTMLDivElement>(null)

  const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
  const contexto = useMemo(
    () => (estanteAtiva === undefined ? null : montarContexto(jogos, estanteAtiva)),
    [jogos, estanteAtiva],
  )
  const nomePorId = useMemo(() => new Map(jogos.map((jogo) => [jogo.id, jogo.nome])), [jogos])

  // Desmarca se o jogo selecionado não existir mais na coleção
  useEffect(() => {
    if (idJogoSelecionado && !jogos.some((j) => j.id === idJogoSelecionado)) {
      setIdJogoSelecionado(null)
    }
  }, [jogos, idJogoSelecionado])

  // Fecha painel e menu ao pressionar Escape
  useEffect(() => {
    const tratarKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setIdJogoSelecionado(null)
        setMenuExportarAberto(false)
      }
    }
    window.addEventListener('keydown', tratarKeyDown)
    return () => window.removeEventListener('keydown', tratarKeyDown)
  }, [])

  const selecionarJogo = (id: string) => {
    setIdJogoSelecionado((atual) => (atual === id ? null : id))
  }

  const jogoSelecionado = useMemo(
    () => (idJogoSelecionado ? (jogos.find((j) => j.id === idJogoSelecionado) ?? null) : null),
    [jogos, idJogoSelecionado],
  )

  const posicaoSelecionada = useMemo(
    () => arranjo?.posicoes.find((p) => p.idJogo === idJogoSelecionado),
    [arranjo, idJogoSelecionado],
  )

  const naoAlocadoSelecionado = useMemo(
    () => arranjo?.naoAlocados.find((na) => na.idJogo === idJogoSelecionado),
    [arranjo, idJogoSelecionado],
  )

  const nomeJogoBase = useMemo(() => {
    if (!jogoSelecionado || !jogoSelecionado.idJogoBase) return null
    return jogos.find((j) => j.id === jogoSelecionado.idJogoBase)?.nome ?? null
  }, [jogos, jogoSelecionado])

  const exportarSnapshot = (escala: 1 | 2) => {
    setMenuExportarAberto(false)
    const canvas = containerCanvasRef.current?.querySelector('canvas')
    if (!canvas) return

    const nomeArquivo = escala === 2 ? 'ludoshelf-arranjo-hd.png' : 'ludoshelf-arranjo.png'

    if (escala === 1) {
      const dataUrl = canvas.toDataURL('image/png')
      baixarImagem(dataUrl, nomeArquivo)
    } else {
      const canvasHd = document.createElement('canvas')
      canvasHd.width = canvas.width * 2
      canvasHd.height = canvas.height * 2
      const ctx = canvasHd.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(canvas, 0, 0, canvasHd.width, canvasHd.height)
        baixarImagem(canvasHd.toDataURL('image/png'), nomeArquivo)
      } else {
        baixarImagem(canvas.toDataURL('image/png'), nomeArquivo)
      }
    }
  }

  return (
    <section>
      <div className="card-painel">
        <div className="painel-arranjo-controles">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2>Arranjo</h2>
            {calculando && (
              <p role="status" className="status-calculando">
                Calculando…
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="menu-exportar-container">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setMenuExportarAberto((aberto) => !aberto)}
                disabled={arranjo === null || calculando}
                aria-haspopup="true"
                aria-expanded={menuExportarAberto}
              >
                📸 Exportar PNG ▾
              </button>
              {menuExportarAberto && (
                <div className="dropdown-exportar" role="menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => exportarSnapshot(1)}
                  >
                    <strong>Padrão (1x)</strong>
                    <span className="dropdown-item-subtexto">ludoshelf-arranjo.png</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => exportarSnapshot(2)}
                  >
                    <strong>Alta definição (2x)</strong>
                    <span className="dropdown-item-subtexto">ludoshelf-arranjo-hd.png</span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-primario"
              onClick={recalcularArranjo}
              disabled={estanteAtiva === undefined}
            >
              Recalcular arranjo
            </button>
          </div>
        </div>

        {arranjo === null ? (
          calculando ? null : (
            <div className="estado-vazio">
              <p>Nenhum arranjo calculado ainda.</p>
            </div>
          )
        ) : (
          <div style={{ opacity: calculando ? 0.4 : 1, transition: 'opacity 200ms' }}>
            <div className="layout-arranjo-grid">
              <div className="coluna-arranjo-principal">
                {estanteAtiva !== undefined && contexto !== null && (
                  <div
                    ref={containerCanvasRef}
                    className="canvas-container-3d"
                    style={{ width: '100%', height: '520px' }}
                  >
                    <LimiteDeErroDaCena>
                      <CenaDoArranjo
                        arranjo={arranjo}
                        contexto={contexto}
                        estante={estanteAtiva}
                        idJogoEmFoco={idJogoEmFoco}
                        idJogoSelecionado={idJogoSelecionado}
                        aoFocarJogo={setIdJogoEmFoco}
                        aoClicarJogo={selecionarJogo}
                        aoClicarFundo={() => setIdJogoSelecionado(null)}
                      />
                    </LimiteDeErroDaCena>
                  </div>
                )}

                <ListaDoArranjo
                  arranjo={arranjo}
                  estante={estanteAtiva!}
                  contexto={contexto!}
                  idJogoEmFoco={idJogoEmFoco}
                  idJogoSelecionado={idJogoSelecionado}
                  aoFocarJogo={setIdJogoEmFoco}
                  aoSelecionarJogo={selecionarJogo}
                />

                <PainelDeNaoAlocados
                  naoAlocados={arranjo.naoAlocados}
                  nomePorId={nomePorId}
                  idJogoEmFoco={idJogoEmFoco}
                  idJogoSelecionado={idJogoSelecionado}
                  aoFocarJogo={setIdJogoEmFoco}
                  aoSelecionarJogo={selecionarJogo}
                />
              </div>

              <div className="coluna-arranjo-lateral">
                {jogoSelecionado ? (
                  <PainelDeInspecao
                    jogo={jogoSelecionado}
                    posicao={posicaoSelecionada}
                    estante={estanteAtiva}
                    nomeJogoBase={nomeJogoBase}
                    naoAlocado={naoAlocadoSelecionado}
                    aoFechar={() => setIdJogoSelecionado(null)}
                  />
                ) : (
                  <div
                    className="card-painel painel-inspecao-vazio"
                    style={{
                      padding: '24px 18px',
                      textAlign: 'center',
                      color: 'var(--text-muted, #94a3b8)',
                      background: 'var(--bg-surface-elevated, #1c283c)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                      💡 Selecione uma caixa na estante 3D ou na lista para inspecionar dimensões,
                      pose e procedência.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function baixarImagem(url: string, nomeArquivo: string) {
  const link = document.createElement('a')
  link.download = nomeArquivo
  link.href = url
  link.click()
}
