import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { montarEstante } from '../../nucleo/estante.js'
import { criarMedidas } from '../../nucleo/jogo.js'
import { TelaDeArranjo } from './TelaDeArranjo.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('TelaDeArranjo', () => {
  it('mostra estado vazio quando nao ha arranjo calculado', () => {
    render(<TelaDeArranjo />)
    expect(screen.getByText('Nenhum arranjo calculado ainda.')).toBeInTheDocument()
  })

  it('calcula ao clicar em Recalcular e mostra a cena', async () => {
    // Timers reais de propósito: `CenaDoArranjo` monta um <Canvas> do
    // react-three-fiber, cujo loop de render usa requestAnimationFrame.
    // vi.useFakeTimers() também substitui o RAF, e o RAF do r3f reagenda a si
    // mesmo a cada frame — com timers falsos isso vira uma recursão que nunca
    // se esgota, e `userEvent.click` (que espera os timers avançarem) trava
    // para sempre. O setTimeout(0) real de `recalcularArranjo` (Task 5) é
    // rápido o bastante para o polling padrão do `findByText` pegá-lo.
    const usuario = userEvent.setup()
    await useEstadoDoApp.getState().salvarEstante(
      montarEstante('e1', {
        nome: 'Billy',
        larguraUtilMm: 760,
        profundidadeUtilMm: 280,
        alturaDoRodapeMm: 80,
        espessuraDaPrateleiraMm: 18,
        alturasLivresMm: [350],
      }),
    )
    await useEstadoDoApp.getState().salvarJogo({
      id: 'a',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    })

    render(<TelaDeArranjo />)
    await usuario.click(screen.getByRole('button', { name: 'Recalcular arranjo' }))

    expect(await screen.findByText(/Toda a coleção coube/)).toBeInTheDocument()
  })

  it('mostra o status de calculando mesmo no primeiro calculo, antes de haver arranjo', () => {
    // Regressao: o <p role="status"> vivia dentro do ramo `arranjo !== null`.
    // No primeiro clique em Recalcular, `arranjo` ainda é `null` quando
    // `calculando` já é `true` — o status nunca aparecia (CodeRabbit, PR #2).
    useEstadoDoApp.setState({ calculando: true, arranjo: null })
    render(<TelaDeArranjo />)
    expect(screen.getByRole('status')).toHaveTextContent('Calculando…')
  })
})
