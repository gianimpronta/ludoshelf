import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Arranjo, ContextoDeArranjo } from '../../nucleo/arranjo.js'
import type { Estante } from '../../nucleo/estante.js'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'
import { ListaDoArranjo } from './ListaDoArranjo.js'

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
    {
      id: 'e1-p1',
      larguraUtilMm: 800,
      alturaUtilMm: 350,
      profundidadeUtilMm: 300,
      alturaDaBaseMm: 446,
    },
  ],
}

const jogoA: CaixaDeJogo = {
  id: 'catan',
  nome: 'Catan',
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
}

const jogoB: CaixaDeJogo = {
  id: 'carcassonne',
  nome: 'Carcassonne',
  medidas: criarMedidas(275, 190, 68, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'destaque', marcadoPeloUsuario: true },
  idLudopedia: null,
  idBgg: null,
}

import { montarContexto, PONTUACAO_ZERADA } from '../../nucleo/arranjo.js'

const contextoFixture: ContextoDeArranjo = montarContexto([jogoA, jogoB], estanteFixture)

const arranjoFixture: Arranjo = {
  posicoes: [
    { idJogo: 'carcassonne', idCompartimento: 'e1-p0', deslocamentoXMm: 100, apoio: 'retrato' },
    { idJogo: 'catan', idCompartimento: 'e1-p0', deslocamentoXMm: 10, apoio: 'retrato' },
  ],
  naoAlocados: [],
  pontuacao: PONTUACAO_ZERADA,
}

describe('ListaDoArranjo', () => {
  it('agrupa jogos por compartimento e ordena da esquerda para a direita', () => {
    render(
      <ListaDoArranjo
        arranjo={arranjoFixture}
        estante={estanteFixture}
        contexto={contextoFixture}
        idJogoEmFoco={null}
        idJogoSelecionado={null}
        aoFocarJogo={vi.fn()}
        aoSelecionarJogo={vi.fn()}
      />,
    )

    expect(screen.getByText(/Prateleira 1/i)).toBeInTheDocument()
    const itens = screen.getAllByRole('button', { name: /selecionar/i })
    expect(itens).toHaveLength(2)
    // Catan tem x=10 e Carcassonne tem x=100, então Catan vem antes
    expect(itens[0]).toHaveTextContent('Catan')
    expect(itens[1]).toHaveTextContent('Carcassonne')
  })

  it('indica visualmente foco e seleção ativa nos itens da lista', () => {
    render(
      <ListaDoArranjo
        arranjo={arranjoFixture}
        estante={estanteFixture}
        contexto={contextoFixture}
        idJogoEmFoco="catan"
        idJogoSelecionado="carcassonne"
        aoFocarJogo={vi.fn()}
        aoSelecionarJogo={vi.fn()}
      />,
    )

    const itemCatan = screen.getByRole('button', { name: /selecionar catan/i })
    const itemCarcassonne = screen.getByRole('button', { name: /selecionar carcassonne/i })

    expect(itemCatan).toHaveClass('item-jogo-em-foco')
    expect(itemCarcassonne).toHaveClass('item-jogo-selecionado')
  })

  it('dispara aoFocarJogo no hover e aoSair', () => {
    const aoFocarJogo = vi.fn()
    render(
      <ListaDoArranjo
        arranjo={arranjoFixture}
        estante={estanteFixture}
        contexto={contextoFixture}
        idJogoEmFoco={null}
        idJogoSelecionado={null}
        aoFocarJogo={aoFocarJogo}
        aoSelecionarJogo={vi.fn()}
      />,
    )

    const itemCatan = screen.getByRole('button', { name: /selecionar catan/i })
    fireEvent.mouseEnter(itemCatan)
    expect(aoFocarJogo).toHaveBeenCalledWith('catan')

    fireEvent.mouseLeave(itemCatan)
    expect(aoFocarJogo).toHaveBeenCalledWith(null)
  })

  it('dispara aoSelecionarJogo no clique', async () => {
    const aoSelecionarJogo = vi.fn()
    const usuario = userEvent.setup()
    render(
      <ListaDoArranjo
        arranjo={arranjoFixture}
        estante={estanteFixture}
        contexto={contextoFixture}
        idJogoEmFoco={null}
        idJogoSelecionado={null}
        aoFocarJogo={vi.fn()}
        aoSelecionarJogo={aoSelecionarJogo}
      />,
    )

    const itemCatan = screen.getByRole('button', { name: /selecionar catan/i })
    await usuario.click(itemCatan)
    expect(aoSelecionarJogo).toHaveBeenCalledWith('catan')
  })
})
