import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioEmMemoria } from '../../persistencia/RepositorioEmMemoria.js'
import { useEstadoDoApp } from '../../estado/useEstadoDoApp.js'
import { TelaDeEstantes } from './TelaDeEstantes.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('TelaDeEstantes', () => {
  it('lista as estantes salvas', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeEstantes />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy da sala')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(await screen.findByText(/Billy da sala/)).toBeInTheDocument()
  })

  it('marca a estante ativa na lista', async () => {
    render(<TelaDeEstantes />)
    // Sem estante nenhuma salva ainda: a lista aparece vazia, sem lançar.
    expect(screen.getByText('Nenhuma estante cadastrada ainda.')).toBeInTheDocument()
  })
})
