import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JogoNaoAlocado } from '../../nucleo/arranjo.js'
import { PainelDeNaoAlocados } from './PainelDeNaoAlocados.js'

describe('PainelDeNaoAlocados', () => {
  it('lista motivo e falta de cada jogo nao alocado', () => {
    const naoAlocados: readonly JogoNaoAlocado[] = [
      { idJogo: 'x', motivo: 'alto-demais', faltaMm: 30 },
    ]
    render(
      <PainelDeNaoAlocados naoAlocados={naoAlocados} nomePorId={new Map([['x', 'Gloomhaven']])} />,
    )
    expect(screen.getByText(/Gloomhaven/)).toBeInTheDocument()
    expect(screen.getByText(/alto-demais/)).toBeInTheDocument()
    expect(screen.getByText(/30mm/)).toBeInTheDocument()
  })

  it('mostra mensagem quando tudo coube', () => {
    render(<PainelDeNaoAlocados naoAlocados={[]} nomePorId={new Map()} />)
    expect(screen.getByText('Toda a coleção coube na estante.')).toBeInTheDocument()
  })
})
