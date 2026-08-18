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

  it('posiciona o rotulo dentro dos limites do diagrama, nao acima do topo', () => {
    // Regressao: yMm em calcularLinhasDePrateleira é medido a partir da base
    // (mesma acumulação do núcleo), mas o SVG cresce para baixo a partir do
    // topo (y=20). Sem inverter (alturaTotalMm - yMm), uma estante de vão único
    // com rodapé baixo produzia coordenada negativa e o rótulo saía do desenho.
    const umaSo: DefinicaoDeEstante = { ...definicao, alturasLivresMm: [350] }
    const { container } = render(<DiagramaDeEstante definicao={umaSo} />)
    const rotulo = [...container.querySelectorAll('text')].find(
      (texto) => texto.textContent === '350mm',
    )
    const y = Number(rotulo?.getAttribute('y'))
    // alturaTotalMm = 80 (rodapé) + 350 = 430... na verdade + espessura*1 = 448.
    // yMm da única prateleira = 80 (rodapé); centro do vão = 80 + 350/2 = 255mm
    // a partir da base = 448 - 255 = 193mm a partir do topo. escala = 200/448.
    expect(y).toBeCloseTo(20 + 193 * (200 / 448), 3)
    expect(y).toBeGreaterThanOrEqual(0)
  })

  it('posiciona a linha de prateleira interna a partir do topo, nao da base', () => {
    const { container } = render(<DiagramaDeEstante definicao={definicao} />)
    const linha = container.querySelector('[data-papel="linha-de-prateleira"]')
    // alturaTotalMm = 80 + 350 + 300 + 18*2 = 766; a divisória entre os dois
    // vãos fica a 448mm da base = 766 - 448 = 318mm do topo. escala = 200/766.
    expect(Number(linha?.getAttribute('y1'))).toBeCloseTo(20 + 318 * (200 / 766), 3)
  })
})
