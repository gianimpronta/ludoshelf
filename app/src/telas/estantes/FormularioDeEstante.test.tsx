import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioDeEstante } from './FormularioDeEstante.js'

describe('FormularioDeEstante', () => {
  it('envia a definicao preenchida', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy da sala')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(aoSalvar).toHaveBeenCalledWith({
      nome: 'Billy da sala',
      larguraUtilMm: 760,
      profundidadeUtilMm: 280,
      alturaDoRodapeMm: 80,
      espessuraDaPrateleiraMm: 18,
      alturasLivresMm: [350],
    })
  })

  it('adiciona um campo de prateleira ao clicar em + prateleira', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: '+ prateleira' }))

    expect(screen.getByLabelText('Altura livre da prateleira 2 (mm)')).toBeInTheDocument()
  })

  it('mostra o erro do validador do nucleo em vez de duplicar a regra', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Billy')
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760.5')
    await usuario.type(screen.getByLabelText('Profundidade útil (mm)'), '280')
    await usuario.type(screen.getByLabelText('Altura do rodapé (mm)'), '80')
    await usuario.type(screen.getByLabelText('Espessura da prateleira (mm)'), '18')
    await usuario.type(screen.getByLabelText('Altura livre da prateleira 1 (mm)'), '350')
    await usuario.click(screen.getByRole('button', { name: 'Salvar estante' }))

    expect(screen.getByRole('alert')).toHaveTextContent('larguraUtilMm')
  })

  it('renderiza o diagrama ao vivo com os valores digitados', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeEstante aoSalvar={vi.fn()} />)
    await usuario.type(screen.getByLabelText('Largura útil (mm)'), '760')
    expect(screen.getByRole('img', { name: /Diagrama da estante/ })).toBeInTheDocument()
  })
})
