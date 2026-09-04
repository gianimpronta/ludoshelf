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

  it('preenche as dimensoes ao selecionar um formato padrao', async () => {
    const usuario = userEvent.setup()
    render(<FormularioDeJogo jogosExistentes={[]} aoSalvar={vi.fn()} />)

    const seletor = screen.getByLabelText('Formato padrão da caixa (opcional)')
    await usuario.selectOptions(seletor, 'quadrada-grande-295')

    expect(screen.getByLabelText('Lado A (mm)')).toHaveValue('295')
    expect(screen.getByLabelText('Lado B (mm)')).toHaveValue('295')
    expect(screen.getByLabelText('Espessura (mm)')).toHaveValue('70')
  })

  it('preenche os campos no modo de edicao e preserva o id ao salvar', async () => {
    const usuario = userEvent.setup()
    const aoSalvar = vi.fn()
    const jogoOriginal: CaixaDeJogo = {
      id: 'jogo-existente-1',
      nome: '7 Wonders',
      medidas: {
        maiorMm: 297,
        menorMm: 297,
        espessuraMm: 78,
        origem: { tipo: 'manual' },
        confirmadaPeloUsuario: true,
      },
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idBgg: 68448,
      idLudopedia: null,
    }

    render(
      <FormularioDeJogo
        jogosExistentes={[jogoOriginal]}
        aoSalvar={aoSalvar}
        jogoEmEdicao={jogoOriginal}
      />,
    )

    expect(screen.getByText(/Editando:/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('7 Wonders')
    expect(screen.getByLabelText('Lado A (mm)')).toHaveValue('297')
    expect(screen.getByLabelText('ID BGG (opcional)')).toHaveValue('68448')

    // Altera espessura
    const inputEsp = screen.getByLabelText('Espessura (mm)')
    await usuario.clear(inputEsp)
    await usuario.type(inputEsp, '80')

    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(aoSalvar).toHaveBeenCalledTimes(1)
    const jogoSalvo = aoSalvar.mock.calls[0]![0] as CaixaDeJogo
    expect(jogoSalvo.id).toBe('jogo-existente-1')
    expect(jogoSalvo.medidas.espessuraMm).toBe(80)
  })

  it('busca versoes no catalogo e permite selecionar edicao especifica', async () => {
    const usuario = userEvent.setup()
    const catalogoMock = {
      buscar: vi.fn().mockResolvedValue({
        maiorMm: 295,
        menorMm: 240,
        espessuraMm: 75,
        fonte: 'bgg',
        idBgg: 13,
        idLudopedia: null,
        versoes: [
          {
            id: 'v-bgg-1',
            idBggVersao: 101,
            nomeVersao: 'Edição Internacional',
            editora: 'Kosmos',
            maiorMm: 295,
            menorMm: 240,
            espessuraMm: 75,
            confirmada: true,
            fonte: 'bgg',
          },
          {
            id: 'v-bgg-2',
            idBggVersao: 102,
            nomeVersao: 'Edição Brasil (Devir)',
            editora: 'Devir',
            maiorMm: 300,
            menorMm: 240,
            espessuraMm: 80,
            confirmada: true,
            fonte: 'bgg',
          },
        ],
      }),
      buscarPorNome: vi.fn(),
      listarFormatosPadrao: vi.fn().mockReturnValue([]),
    }

    render(
      <FormularioDeJogo jogosExistentes={[]} aoSalvar={vi.fn()} catalogo={catalogoMock as any} />,
    )

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.click(screen.getByRole('button', { name: '🔍 Buscar no Catálogo' }))

    expect(await screen.findByText('Edição Brasil (Devir)')).toBeInTheDocument()

    // Clica no botão de usar medidas da Edição Brasil
    await usuario.click(
      screen.getByRole('button', { name: 'Usar medidas de Edição Brasil (Devir)' }),
    )

    expect(screen.getByLabelText('Lado A (mm)')).toHaveValue('300')
    expect(screen.getByLabelText('Espessura (mm)')).toHaveValue('80')
    expect(screen.getByLabelText('ID BGG (opcional)')).toHaveValue('102')
  })
})
