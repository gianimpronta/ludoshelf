import type { PosicaoDeJogo, JogoNaoAlocado } from '../../nucleo/arranjo.js'
import type { Estante } from '../../nucleo/estante.js'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'

export interface PropsPainelDeInspecao {
  readonly jogo: CaixaDeJogo
  readonly posicao?: PosicaoDeJogo | undefined
  readonly estante?: Estante | undefined
  readonly nomeJogoBase?: string | null | undefined
  readonly naoAlocado?: JogoNaoAlocado | undefined
  readonly aoFechar: () => void
}

/**
 * Painel de inspeção de detalhes de uma caixa de jogo selecionada na estante ou na lista.
 */
export function PainelDeInspecao({
  jogo,
  posicao,
  estante,
  nomeJogoBase,
  naoAlocado,
  aoFechar,
}: PropsPainelDeInspecao) {
  const { medidas } = jogo
  const ehDestaque = jogo.frequencia.tipo === 'destaque'
  const ehExpansao = jogo.idJogoBase !== null

  const indiceCompartimento =
    posicao !== undefined && estante !== undefined
      ? estante.compartimentos.findIndex((c) => c.id === posicao.idCompartimento)
      : -1

  const descricaoOrigem = (() => {
    switch (medidas.origem.tipo) {
      case 'manual':
        return 'Manual'
      case 'semeada':
        return `Semeada (${medidas.origem.chaveDoTemplate})`
      case 'planilha':
        return `Planilha (${medidas.origem.arquivo}, linha ${medidas.origem.linha})`
      case 'bgg':
        return `BGG (versão ${medidas.origem.idVersao})`
    }
  })()

  return (
    <div className="card-painel painel-inspecao" data-testid="painel-inspecao">
      <div className="painel-inspecao-cabecalho">
        <div style={{ flex: 1 }}>
          <div className="painel-inspecao-badges">
            {ehDestaque && <span className="badge badge-destaque">⭐ Destaque</span>}
            {ehExpansao ? (
              <span className="badge badge-expansao">
                Expansão {nomeJogoBase ? `de ${nomeJogoBase}` : ''}
              </span>
            ) : (
              <span className="badge badge-base">Jogo Base</span>
            )}
          </div>
          <h3 style={{ margin: '6px 0 0 0' }}>{jogo.nome}</h3>
        </div>
        <button
          type="button"
          className="btn-secundario btn-fechar-inspecao"
          onClick={aoFechar}
          aria-label="Fechar inspeção"
          style={{ padding: '4px 8px', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {naoAlocado && (
        <div className="alerta-nao-alocado" style={{ marginTop: '12px' }}>
          <strong>⚠️ Não coube na estante</strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Motivo: <code>{naoAlocado.motivo}</code> (faltou {naoAlocado.faltaMm} mm)
          </p>
        </div>
      )}

      <div className="painel-inspecao-grid" style={{ marginTop: '16px' }}>
        <div className="campo-inspecao">
          <span className="rotulo-campo">Dimensões reais (C × L × A)</span>
          <span className="valor-campo">
            {medidas.maiorMm} × {medidas.menorMm} × {medidas.espessuraMm} mm
          </span>
        </div>

        <div className="campo-inspecao">
          <span className="rotulo-campo">Espessura na prateleira</span>
          <span className="valor-campo">{medidas.espessuraMm} mm</span>
        </div>

        {posicao && (
          <>
            <div className="campo-inspecao">
              <span className="rotulo-campo">Pose na estante</span>
              <span className="valor-campo">
                {posicao.apoio === 'retrato' ? 'Retrato (em pé)' : 'Paisagem (deitado)'}
              </span>
            </div>

            <div className="campo-inspecao">
              <span className="rotulo-campo">Localização</span>
              <span className="valor-campo">
                {indiceCompartimento >= 0
                  ? `Prateleira ${indiceCompartimento + 1}`
                  : 'Compartimento'}
                {' • '}x = {posicao.deslocamentoXMm} mm da esquerda
              </span>
            </div>
          </>
        )}

        <div className="campo-inspecao">
          <span className="rotulo-campo">Procedência da medida</span>
          <span className="valor-campo">{descricaoOrigem}</span>
        </div>

        <div className="campo-inspecao">
          <span className="rotulo-campo">Status da medida</span>
          <span className="valor-campo">
            {medidas.confirmadaPeloUsuario ? '✓ Confirmada pelo usuário' : '⚠️ Estimada / Pendente'}
          </span>
        </div>
      </div>
    </div>
  )
}
