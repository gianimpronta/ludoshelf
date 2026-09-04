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

  it('permite editar um jogo existente na tabela', async () => {
    const usuario = userEvent.setup()
    render(<TelaDeColecao />)

    await usuario.type(screen.getByLabelText('Nome'), 'Catan')
    await usuario.type(screen.getByLabelText('Lado A (mm)'), '295')
    await usuario.type(screen.getByLabelText('Lado B (mm)'), '220')
    await usuario.type(screen.getByLabelText('Espessura (mm)'), '70')
    await usuario.click(screen.getByRole('button', { name: 'Salvar jogo' }))
    expect(await screen.findByRole('cell', { name: 'Catan' })).toBeInTheDocument()

    // Clica em Editar
    await usuario.click(screen.getByRole('button', { name: 'Editar Catan' }))
    expect(screen.getByText(/Editando:/)).toBeInTheDocument()

    // Atualiza o Lado A para 300
    const inputLadoA = screen.getByLabelText('Lado A (mm)')
    await usuario.clear(inputLadoA)
    await usuario.type(inputLadoA, '300')

    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('300 × 220 × 70 mm')).toBeInTheDocument()
    expect(screen.queryByText(/Editando:/)).not.toBeInTheDocument()
  })

  it('exibe botao de pendencias quando ha jogos com medidas nao confirmadas', async () => {
    const usuario = userEvent.setup()
    const { salvarJogo } = useEstadoDoApp.getState()

    // Adiciona jogo com medidas pendentes (confirmadaPeloUsuario: false)
    await salvarJogo({
      id: 'jogo-pendente-1',
      nome: 'Dixit Sem Medidas',
      medidas: {
        maiorMm: 280,
        menorMm: 280,
        espessuraMm: 60,
        confirmadaPeloUsuario: false,
        origem: { tipo: 'manual' },
      },
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idBgg: null,
      idLudopedia: null,
    })

    render(<TelaDeColecao />)
    const btnPendencias = screen.getByRole('button', { name: /Pendências \(1\)/ })
    expect(btnPendencias).toBeInTheDocument()

    await usuario.click(btnPendencias)
    expect(
      screen.getByRole('heading', { name: /Enriquecer Medidas Pendentes/ }),
    ).toBeInTheDocument()
  })
})
