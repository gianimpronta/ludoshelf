import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CatalogoFalso } from '../../catalogo/CatalogoFalso.js'
import { ModalImportarCsv } from './ModalImportarCsv.js'

describe('ModalImportarCsv', () => {
  const catalogoFalso = new CatalogoFalso()

  it('inicia no passo de upload com botao para baixar modelo', () => {
    render(
      <ModalImportarCsv
        catalogo={catalogoFalso}
        jogosExistentes={[]}
        aoSalvarJogos={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Importar Coleção via CSV' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Baixar modelo CSV/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/Clique para escolher um arquivo CSV/)).toBeInTheDocument()
  })

  it('avanca pelos passos de mapeamento, revisao e conclusao', async () => {
    const usuario = userEvent.setup()
    const aoSalvarJogos = vi.fn().mockResolvedValue(undefined)
    const aoFechar = vi.fn()

    render(
      <ModalImportarCsv
        catalogo={catalogoFalso}
        jogosExistentes={[]}
        aoSalvarJogos={aoSalvarJogos}
        aoFechar={aoFechar}
      />,
    )

    const conteudoCsv = 'Nome;Comprimento;Largura;Espessura\nCatan;295;220;70\nAzul;260;260;70'
    const arquivo = new File([conteudoCsv], 'meus-jogos.csv', { type: 'text/csv' })

    const inputArquivo = screen.getByLabelText(/Clique para escolher um arquivo CSV/)
    await usuario.upload(inputArquivo, arquivo)

    // Passo 2: Mapeamento
    expect(await screen.findByLabelText(/Coluna do Nome do Jogo/)).toBeInTheDocument()
    expect(screen.getByText(/2 linhas detectadas/)).toBeInTheDocument()

    // Clica em avancar para revisao
    await usuario.click(screen.getByRole('button', { name: 'Avançar para Revisão' }))

    // Passo 3: Revisão
    expect(await screen.findByText(/Jogos prontos para salvar:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar Importação/ })).toBeInTheDocument()

    // Confirma importação
    await usuario.click(screen.getByRole('button', { name: /Confirmar Importação/ }))

    // Passo 4: Concluído
    expect(aoSalvarJogos).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(/2 jogo\(s\) importado\(s\) com sucesso na coleção!/),
    ).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('permite carregar dados de exemplo com 1 clique para testes no navegador', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalImportarCsv
        catalogo={catalogoFalso}
        jogosExistentes={[]}
        aoSalvarJogos={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /Usar dados de exemplo/ }))

    expect(await screen.findByLabelText(/Coluna do Nome do Jogo/)).toBeInTheDocument()
    expect(screen.getByText(/exemplo-ludoshelf.csv/)).toBeInTheDocument()
  })

  it('permite colar texto CSV manualmente em uma caixa de texto', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalImportarCsv
        catalogo={catalogoFalso}
        jogosExistentes={[]}
        aoSalvarJogos={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /Colar Texto CSV/ }))
    const textarea = screen.getByLabelText(/Cole o conteúdo CSV/)
    await usuario.type(textarea, 'Nome;Maior;Menor;Espessura\nCatan;295;220;70')
    await usuario.click(screen.getByRole('button', { name: 'Processar Texto' }))

    expect(await screen.findByLabelText(/Coluna do Nome do Jogo/)).toBeInTheDocument()
  })

  it('auto-detecta unidade centimetros quando as dimensoes sao menores que 100', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalImportarCsv
        catalogo={catalogoFalso}
        jogosExistentes={[]}
        aoSalvarJogos={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /Colar Texto CSV/ }))
    const textarea = screen.getByLabelText(/Cole o conteúdo CSV/)
    await usuario.type(textarea, 'Nome;Altura;Largura;Comprimento\nHarmonies;21,00;21,00;7,00')
    await usuario.click(screen.getByRole('button', { name: 'Processar Texto' }))

    const selectUnidade = (await screen.findByLabelText(
      /Unidade padrão das medidas/,
    )) as HTMLSelectElement
    expect(selectUnidade.value).toBe('cm')
  })

  it('exibe indicador de progresso ao avancar para revisao quando consulta o catalogo', async () => {
    const usuario = userEvent.setup()
    let resolveBusca: (() => void) | null = null
    const catalogoComEspera = {
      ...catalogoFalso,
      buscar: vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveBusca = () => resolve(null)
        })
      }),
    }

    render(
      <ModalImportarCsv
        catalogo={catalogoComEspera as any}
        jogosExistentes={[]}
        aoSalvarJogos={vi.fn()}
        aoFechar={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /Colar Texto CSV/ }))
    const textarea = screen.getByLabelText(/Cole o conteúdo CSV/)
    await usuario.type(textarea, 'Nome\nJogoSemMedida')
    await usuario.click(screen.getByRole('button', { name: 'Processar Texto' }))

    expect(await screen.findByLabelText(/Coluna do Nome do Jogo/)).toBeInTheDocument()

    // Clica em avancar para revisao
    await usuario.click(screen.getByRole('button', { name: 'Avançar para Revisão' }))

    // Durante o processamento, deve exibir feedback de progresso / processamento
    expect(screen.getByText(/Processando/i)).toBeInTheDocument()

    // Resolve a busca pendente
    if (typeof resolveBusca === 'function') {
      ;(resolveBusca as () => void)()
    }

    // Apos resolver, chega no passo de revisao
    expect(await screen.findByText(/Jogos prontos para salvar:/)).toBeInTheDocument()
  })
})
