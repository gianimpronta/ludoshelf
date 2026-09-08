import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { montarContexto, PONTUACAO_ZERADA, type Arranjo } from '../nucleo/arranjo.js'
import { montarEstante } from '../nucleo/estante.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { CenaDoArranjo } from './CenaDoArranjo.js'

const jogos: readonly CaixaDeJogo[] = [
  {
    id: 'a',
    nome: 'Catan',
    medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
    idJogoBase: null,
    frequencia: { tipo: 'desconhecida' },
    idLudopedia: null,
    idBgg: null,
  },
  {
    id: 'b',
    nome: 'Carcassonne',
    medidas: criarMedidas(275, 190, 68, { tipo: 'manual' }, true),
    idJogoBase: null,
    frequencia: { tipo: 'destaque', marcadoPeloUsuario: true },
    idLudopedia: null,
    idBgg: null,
  },
]

const estante = montarEstante('e1', {
  nome: 'Billy',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350],
})

const arranjo: Arranjo = {
  posicoes: [
    { idJogo: 'a', idCompartimento: 'e1-p0', deslocamentoXMm: 0, apoio: 'retrato' },
    { idJogo: 'b', idCompartimento: 'e1-p0', deslocamentoXMm: 100, apoio: 'retrato' },
  ],
  naoAlocados: [],
  pontuacao: PONTUACAO_ZERADA,
}

describe('CenaDoArranjo', () => {
  it('monta um <canvas> sem lancar', () => {
    const contexto = montarContexto(jogos, estante)
    const { container } = render(
      <CenaDoArranjo
        arranjo={arranjo}
        contexto={contexto}
        estante={estante}
        aoClicarJogo={() => {}}
      />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('monta mesmo com arranjo vazio', () => {
    const contexto = montarContexto([], estante)
    const arranjoVazio: Arranjo = {
      posicoes: [],
      naoAlocados: [],
      pontuacao: PONTUACAO_ZERADA,
    }
    const { container } = render(
      <CenaDoArranjo
        arranjo={arranjoVazio}
        contexto={contexto}
        estante={estante}
        aoClicarJogo={() => {}}
      />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('aceita props de foco, seleção e callbacks bidirecionais', () => {
    const contexto = montarContexto(jogos, estante)
    const aoFocarJogo = vi.fn()
    const aoClicarJogo = vi.fn()
    const aoClicarFundo = vi.fn()

    const { container } = render(
      <CenaDoArranjo
        arranjo={arranjo}
        contexto={contexto}
        estante={estante}
        idJogoEmFoco="a"
        idJogoSelecionado="b"
        aoFocarJogo={aoFocarJogo}
        aoClicarJogo={aoClicarJogo}
        aoClicarFundo={aoClicarFundo}
      />,
    )

    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
