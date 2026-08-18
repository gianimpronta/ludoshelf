import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { TelaDeColecao } from './TelaDeColecao.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('TelaDeColecao', () => {
  it('cadastra e lista um jogo', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    // Depois de cadastrado, "Catan" aparece duas vezes: na célula da tabela e
    // como opção de jogo-base no próprio formulário (comportamento correto —
    // um jogo cadastrado passa a poder ser base de uma expansão). Mira a
    // célula especificamente.
    expect(await screen.findByRole('cell', { name: 'Catan' })).toBeInTheDocument()
  })

  it('remove um jogo cadastrado', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)
    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))
    await screen.findByRole('cell', { name: 'Catan' })

    await usuario.click(screen.getByRole('button', { name: 'Remover Catan' }))

    expect(screen.queryByRole('cell', { name: 'Catan' })).not.toBeInTheDocument()
  })
})
