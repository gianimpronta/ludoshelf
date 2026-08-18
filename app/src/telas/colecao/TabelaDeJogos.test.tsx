import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'
import { TabelaDeJogos } from './TabelaDeJogos.js'

const jogo = (id: string, nome: string): CaixaDeJogo => ({
  id,
  nome,
  medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
  idJogoBase: null,
  frequencia: { tipo: 'desconhecida' },
  idLudopedia: null,
  idBgg: null,
})

describe('TabelaDeJogos', () => {
  it('lista nome, medidas e procedencia de cada jogo', () => {
    render(<TabelaDeJogos jogos={[jogo('a', 'Catan')]} aoRemover={vi.fn()} />)
    expect(screen.getByText('Catan')).toBeInTheDocument()
    expect(screen.getByText('295 × 220 × 70 mm')).toBeInTheDocument()
    expect(screen.getByText('manual')).toBeInTheDocument()
  })

  it('chama aoRemover com o id certo', async () => {
    const aoRemover = vi.fn()
    const usuario = userEvent.setup()
    render(<TabelaDeJogos jogos={[jogo('a', 'Catan')]} aoRemover={aoRemover} />)

    await usuario.click(screen.getByRole('button', { name: 'Remover Catan' }))

    expect(aoRemover).toHaveBeenCalledWith('a')
  })

  it('mostra mensagem quando a colecao esta vazia', () => {
    render(<TabelaDeJogos jogos={[]} aoRemover={vi.fn()} />)
    expect(screen.getByText('Nenhum jogo cadastrado ainda.')).toBeInTheDocument()
  })
})
