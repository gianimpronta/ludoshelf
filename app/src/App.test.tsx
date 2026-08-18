import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { RepositorioEmMemoria } from './persistencia/RepositorioEmMemoria.js'
import { App } from './App.js'

beforeEach(async () => {
  useEstadoDoApp.setState(useEstadoDoApp.getInitialState())
  await useEstadoDoApp.getState().inicializar(new RepositorioEmMemoria())
})

describe('App', () => {
  it('comeca na tela de Estantes', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Estantes' })).toBeInTheDocument()
  })

  it('troca de tela ao clicar numa aba', async () => {
    const usuario = userEvent.setup()
    render(<App />)

    await usuario.click(screen.getByRole('tab', { name: 'Coleção' }))

    expect(screen.getByRole('heading', { name: 'Coleção' })).toBeInTheDocument()
  })

  it('mostra o banner quando ha erro de persistencia', () => {
    useEstadoDoApp.setState({ erroDePersistencia: 'Nada será salvo nesta sessão.' })
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Nada será salvo nesta sessão.')
  })
})
