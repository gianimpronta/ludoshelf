import { useMemo } from 'react'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarContexto } from '../../nucleo/arranjo.js'
import { CenaDoArranjo } from '../../cena/CenaDoArranjo.js'
import { LimiteDeErroDaCena } from '../../cena/LimiteDeErroDaCena.js'
import { PainelDeNaoAlocados } from './PainelDeNaoAlocados.js'

/**
 * Composição da tela de Arranjo: viewport 3D + painel de não alocados + botão
 * Recalcular. Entrar sem nunca ter calculado mostra estado vazio explícito
 * (spec §8.3) — `arranjo: null` é exatamente esse estado.
 */
export function TelaDeArranjo() {
  const arranjo = useEstadoDoApp((estado) => estado.arranjo)
  const jogos = useEstadoDoApp((estado) => estado.jogos)
  const estantes = useEstadoDoApp((estado) => estado.estantes)
  const estanteAtivaId = useEstadoDoApp((estado) => estado.estanteAtivaId)
  const calculando = useEstadoDoApp((estado) => estado.calculando)
  const recalcularArranjo = useEstadoDoApp((estado) => estado.recalcularArranjo)
  const irParaTela = useEstadoDoApp((estado) => estado.irParaTela)

  const estanteAtiva = estantes.find((estante) => estante.id === estanteAtivaId)
  // `estanteAtiva` pode ser `undefined` (nenhuma estante cadastrada ainda) — nunca
  // usar non-null assertion aqui. Sem essa checagem, `montarContexto` receberia
  // `undefined` e lançaria bem no cenário que o estado vazio deveria cobrir.
  const contexto = useMemo(
    () => (estanteAtiva === undefined ? null : montarContexto(jogos, estanteAtiva)),
    [jogos, estanteAtiva],
  )
  const nomePorId = useMemo(() => new Map(jogos.map((jogo) => [jogo.id, jogo.nome])), [jogos])

  return (
    <section>
      <h2>Arranjo</h2>
      <button type="button" onClick={recalcularArranjo} disabled={estanteAtiva === undefined}>
        Recalcular arranjo
      </button>

      {arranjo === null ? (
        <p>Nenhum arranjo calculado ainda.</p>
      ) : (
        <div style={{ opacity: calculando ? 0.4 : 1, transition: 'opacity 200ms' }}>
          {calculando && <p role="status">Calculando…</p>}
          {estanteAtiva !== undefined && contexto !== null && (
            <LimiteDeErroDaCena>
              <CenaDoArranjo
                arranjo={arranjo}
                contexto={contexto}
                estante={estanteAtiva}
                aoClicarJogo={() => irParaTela('colecao')}
              />
            </LimiteDeErroDaCena>
          )}
          <PainelDeNaoAlocados naoAlocados={arranjo.naoAlocados} nomePorId={nomePorId} />
        </div>
      )}
    </section>
  )
}
