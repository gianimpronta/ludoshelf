import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogoDeJogos, VersaoDoJogo } from '../../catalogo/CatalogoDeJogos.js'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'
import { ModalEnriquecerPendencias } from './ModalEnriquecerPendencias.js'

describe('ModalEnriquecerPendencias', () => {
  const jogoPendente: CaixaDeJogo = {
    id: 'jogo-1',
    nome: 'Catan',
    medidas: {
      maiorMm: 200,
      menorMm: 200,
      espessuraMm: 50,
      confirmadaPeloUsuario: false,
      origem: { tipo: 'manual' },
    },
    idJogoBase: null,
    frequencia: { tipo: 'desconhecida' },
    idBgg: 13,
    idLudopedia: null,
  }

  const versaoA: VersaoDoJogo = {
    id: 'v1',
    nomeVersao: 'Edição Internacional (Kosmos)',
    editora: 'Kosmos',
    idioma: 'Inglês',
    ano: 2015,
    maiorMm: 295,
    menorMm: 240,
    espessuraMm: 75,
    confirmada: true,
    fonte: 'bgg',
  }

  const versaoB: VersaoDoJogo = {
    id: 'v2',
    nomeVersao: 'Edição Galápagos',
    editora: 'Galápagos Jogos',
    idioma: 'Português',
    ano: 2018,
    maiorMm: 298,
    menorMm: 242,
    espessuraMm: 78,
    confirmada: true,
    fonte: 'bgg',
  }

  it('permite escolher entre múltiplas versões e salvar as alterações confirmadas', async () => {
    const usuario = userEvent.setup()
    const aoSalvarJogos = vi.fn().mockResolvedValue(undefined)
    const aoFechar = vi.fn()

    const catalogoMock: CatalogoDeJogos = {
      buscar: vi.fn().mockResolvedValue({
        maiorMm: 295,
        menorMm: 240,
        espessuraMm: 75,
        fonte: 'bgg',
        idBgg: 13,
        idLudopedia: null,
        versoes: [versaoA, versaoB],
      }),
      buscarPorNome: vi.fn(),
      listarFormatosPadrao: vi.fn().mockReturnValue([]),
    }

    render(
      <ModalEnriquecerPendencias
        jogosPendentes={[jogoPendente]}
        catalogo={catalogoMock}
        aoSalvarJogos={aoSalvarJogos}
        aoFechar={aoFechar}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /Enriquecer Medidas Pendentes/ }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Edição Internacional (Kosmos)')).toBeInTheDocument()
    expect(screen.getByText('Edição Galápagos')).toBeInTheDocument()

    // Clica na Edição Galápagos
    await usuario.click(screen.getByText('Edição Galápagos'))

    // Botão de salvar agora deve estar habilitado para 1 alteração
    const btnSalvar = screen.getByRole('button', { name: /Salvar 1 alterações confirmadas/ })
    expect(btnSalvar).not.toBeDisabled()

    await usuario.click(btnSalvar)

    expect(aoSalvarJogos).toHaveBeenCalledTimes(1)
    const jogosSalvos: CaixaDeJogo[] = aoSalvarJogos.mock.calls[0]![0]
    expect(jogosSalvos).toHaveLength(1)
    expect(jogosSalvos[0]!.medidas.maiorMm).toBe(298)
    expect(jogosSalvos[0]!.medidas.menorMm).toBe(242)
    expect(jogosSalvos[0]!.medidas.espessuraMm).toBe(78)
    expect(jogosSalvos[0]!.medidas.confirmadaPeloUsuario).toBe(true)
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('chama aoFechar ao clicar em Fechar', async () => {
    const usuario = userEvent.setup()
    const aoSalvarJogos = vi.fn()
    const aoFechar = vi.fn()

    const catalogoMock: CatalogoDeJogos = {
      buscar: vi.fn().mockResolvedValue(null),
      buscarPorNome: vi.fn().mockResolvedValue(null),
      listarFormatosPadrao: vi.fn().mockReturnValue([]),
    }

    render(
      <ModalEnriquecerPendencias
        jogosPendentes={[jogoPendente]}
        catalogo={catalogoMock}
        aoSalvarJogos={aoSalvarJogos}
        aoFechar={aoFechar}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })
})
