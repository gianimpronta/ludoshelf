import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'
import { FormularioDeJogo } from './FormularioDeJogo.js'

describe('FormularioDeJogo', () => {
  it('cadastra um jogo com as medidas ordenadas pelo nucleo', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '220')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(aoSalvar).toHaveBeenCalledTimes(1)
    const jogoSalvo = aoSalvar.mock.calls[0]?.[0] as CaixaDeJogo
    expect(jogoSalvo.nome).toBe('Catan')
    expect(jogoSalvo.medidas.maiorMm).toBe(295)
    expect(jogoSalvo.medidas.menorMm).toBe(220)
    expect(jogoSalvo.medidas.espessuraMm).toBe(70)
    expect(jogoSalvo.idJogoBase).toBeNull()
    expect(jogoSalvo.frequencia).toEqual({ tipo: 'desconhecida' })
  })

  it('marca destaque quando o checkbox esta marcado', async () => {
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={aoSalvar} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Azul')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '72')
    await usuario.click(screen.getByLabelText('Destaque'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    const jogoSalvo = aoSalvar.mock.calls[0]?.[0] as CaixaDeJogo
    expect(jogoSalvo.frequencia).toEqual({ tipo: 'destaque', marcadoPeloUsuario: true })
  })

  it('mostra o erro do validador do nucleo', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '220.5')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '295')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))

    expect(screen.getByRole('alert')).toHaveTextContent('ladoA')
  })

  it('lista jogos existentes como opcoes de jogo-base', () => {
    const existentes: readonly CaixaDeJogo[] = [
      {
        id: 'catan',
        nome: 'Catan',
        medidas: {
          maiorMm: 295,
          menorMm: 295,
          espessuraMm: 70,
          origem: { tipo: 'manual' },
          confirmadaPeloUsuario: true,
        },
        idJogoBase: null,
        frequencia: { tipo: 'desconhecida' },
        idLudopedia: null,
        idBgg: null,
      },
    ]
    render(<FormularioDeJogo jogosExistentes={existentes} aoSalvar={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'Catan' })).toBeInTheDocument()
  })
})
