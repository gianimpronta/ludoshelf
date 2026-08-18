import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Abas } from './Abas.js'

describe('Abas', () => {
  it('destaca a aba ativa', () => {
    render(<Abas telaAtiva="colecao" aoTrocar={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Coleção', selected: true })).toBeInTheDocument()
  })

  it('chama aoTrocar com a tela clicada', async () => {
    const aoTrocar = vi.fn()
    const usuario = userEvent.setup()
    render(<Abas telaAtiva="estantes" aoTrocar={aoTrocar} />)

    await usuario.click(screen.getByRole('tab', { name: 'Arranjo' }))

    expect(aoTrocar).toHaveBeenCalledWith('arranjo')
  })
})
