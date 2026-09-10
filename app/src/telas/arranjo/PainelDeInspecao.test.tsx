import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'
import type { PosicaoDeJogo } from '../../nucleo/arranjo.js'
import type { Estante } from '../../nucleo/estante.js'
import { PainelDeInspecao } from './PainelDeInspecao.js'

const estanteFixture: Estante = {
  id: 'e1',
  nome: 'Kallax Principal',
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 16,
  compartimentos: [
    {
      id: 'e1-p0',
      larguraUtilMm: 800,
      alturaUtilMm: 350,
      profundidadeUtilMm: 300,
      alturaDaBaseMm: 80,
    },
  ],
}

const jogoFixture: CaixaDeJogo = {
  id: 'catan',
  nome: 'Catan',
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'destaque', marcadoPeloUsuario: true },
  idLudopedia: 1,
  idBgg: 13,
}

describe('PainelDeInspecao', () => {
  it('exibe dados completos de um jogo alocado', () => {
    const posicao: PosicaoDeJogo = {
      idJogo: 'catan',
      idCompartimento: 'e1-p0',
      deslocamentoXMm: 120,
      apoio: 'retrato',
    }

    render(
      <PainelDeInspecao
        jogo={jogoFixture}
        posicao={posicao}
        estante={estanteFixture}
        aoFechar={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Catan' })).toBeInTheDocument()
    expect(screen.getByText(/295 × 220 × 70 mm/)).toBeInTheDocument()
    expect(screen.getByText(/Espessura na prateleira/i)).toBeInTheDocument()
    expect(screen.getByText(/Retrato/i)).toBeInTheDocument()
    expect(screen.getByText(/120 mm/)).toBeInTheDocument()
    expect(screen.getByText(/Manual/i)).toBeInTheDocument()
    expect(screen.getByText(/Confirmada/i)).toBeInTheDocument()
    expect(screen.getByText(/Destaque/i)).toBeInTheDocument()
  })

  it('exibe detalhes de um jogo não alocado com motivo', () => {
    render(
      <PainelDeInspecao
        jogo={jogoFixture}
        naoAlocado={{ idJogo: 'catan', motivo: 'alto-demais', faltaMm: 45 }}
        aoFechar={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Catan' })).toBeInTheDocument()
    expect(screen.getByText(/Não coube/i)).toBeInTheDocument()
    expect(screen.getByText(/alto-demais/i)).toBeInTheDocument()
    expect(screen.getByText(/45 mm/i)).toBeInTheDocument()
  })

  it('chama aoFechar ao clicar no botão fechar', async () => {
    const aoFechar = vi.fn()
    const usuario = userEvent.setup()

    render(<PainelDeInspecao jogo={jogoFixture} aoFechar={aoFechar} />)

    await usuario.click(screen.getByRole('button', { name: /Fechar inspeção/i }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })
})
