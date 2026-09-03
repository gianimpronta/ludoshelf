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

  it('abre o modal de importacao ao clicar no botao Importar CSV', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)

    await usuario.click(screen.getByRole('button', { name: '📥 Importar CSV' }))
    expect(screen.getByRole('heading', { name: 'Importar Coleção via CSV' })).toBeInTheDocument()
  })

  it('limpa toda a colecao com o botao de limpar colecao e confirmacao', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))
    await screen.findByRole('cell', { name: 'Catan' })

    await usuario.click(screen.getByRole('button', { name: '🗑️ Limpar coleção' }))
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar limpeza/ })
    expect(btnConfirmar).toBeInTheDocument()

    await usuario.click(btnConfirmar)

    expect(await screen.findByText('Nenhum jogo cadastrado ainda.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '🗑️ Limpar coleção' })).not.toBeInTheDocument()
  })
})
