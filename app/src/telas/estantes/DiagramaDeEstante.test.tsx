import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DefinicaoDeEstante } from '../../nucleo/estante.js'
import { DiagramaDeEstante } from './DiagramaDeEstante.js'

const definicao: DefinicaoDeEstante = {
  nome: 'Billy da sala',
  larguraUtilMm: 760,
  profundidadeUtilMm: 280,
  alturaDoRodapeMm: 80,
  espessuraDaPrateleiraMm: 18,
  alturasLivresMm: [350, 300],
}

describe('DiagramaDeEstante', () => {
  it('desenha um <svg>', () => {
    const { container } = render(<DiagramaDeEstante definicao={definicao} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('desenha uma linha de prateleira a mais que o numero de vaos', () => {
    // N alturas livres => N+1 traços horizontais (topo/rodapé contam como bordas
    // do retângulo, não como "linha de prateleira" — só as internas contam).
    const { container } = render(<DiagramaDeEstante definicao={definicao} />)
    const linhas = container.querySelectorAll('[data-papel="linha-de-prateleira"]')
    expect(linhas).toHaveLength(definicao.alturasLivresMm.length - 1)
  })

  it('anota cada altura livre em milimetros', () => {
    render(<DiagramaDeEstante definicao={definicao} />)
    expect(screen.getByText('350mm')).toBeInTheDocument()
    expect(screen.getByText('300mm')).toBeInTheDocument()
  })

  it('anota a largura total', () => {
    render(<DiagramaDeEstante definicao={definicao} />)
    expect(screen.getByText('760mm')).toBeInTheDocument()
  })

  it('nao lanca com uma unica prateleira', () => {
    const umaSo: DefinicaoDeEstante = { ...definicao, alturasLivresMm: [350] }
    const { container } = render(<DiagramaDeEstante definicao={umaSo} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
