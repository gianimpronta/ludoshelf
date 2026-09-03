import { describe, expect, it } from 'vitest'
import { CatalogoFalso } from '../catalogo/CatalogoFalso.js'
import { criarMedidas, type CaixaDeJogo } from '../nucleo/jogo.js'
import { parsearCsv } from './leitorCsv.js'
import { processarCsv } from './processarCsv.js'

describe('processarCsv', () => {
  const catalogoFalso = new CatalogoFalso()

  it('importa jogos com medidas em centimetros convertidas para milimetros inteiros', async () => {
    const csv = parsearCsv('Jogo;Comprimento;Largura;Altura;Unidade\nCatan;29,5;22;7;cm')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Jogo',
          colunaMaiorMm: 'Comprimento',
          colunaMenorMm: 'Largura',
          colunaEspessuraMm: 'Altura',
          colunaUnidade: 'Unidade',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    const catan = res.jogosProntosParaSalvar[0]!
    expect(catan.nome).toBe('Catan')
    expect(catan.medidas.maiorMm).toBe(295)
    expect(catan.medidas.menorMm).toBe(220)
    expect(catan.medidas.espessuraMm).toBe(70)
  })

  it('aplica heuristica: valores < 100 sem unidade viram centimetros', async () => {
    const csv = parsearCsv('Jogo;A;B;Espessura\nAzul;26;26;7')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Jogo',
          colunaMaiorMm: 'A',
          colunaMenorMm: 'B',
          colunaEspessuraMm: 'Espessura',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    const azul = res.jogosProntosParaSalvar[0]!
    expect(azul.medidas.maiorMm).toBe(260)
    expect(azul.medidas.espessuraMm).toBe(70)
  })

  it('vincula expansao ao jogo-base declarado em outra linha do proprio arquivo', async () => {
    const csv = parsearCsv(
      'Nome;Maior;Menor;Espessura;Base\n' +
        'Catan Cidades & Cavaleiros;295;220;50;Catan\n' +
        'Catan;295;220;70;',
    )
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
          colunaJogoBase: 'Base',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    const base = res.jogosProntosParaSalvar.find((j) => j.nome === 'Catan')!
    const expansao = res.jogosProntosParaSalvar.find((j) => j.nome.includes('Cidades'))!
    expect(expansao.idJogoBase).toBe(base.id)
  })

  it('vincula expansao ao jogo-base ja cadastrado na colecao', async () => {
    const baseExistente: CaixaDeJogo = {
      id: 'id-base-catan',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    }

    const csv = parsearCsv('Nome;Maior;Menor;Espessura;Base\nExpansao 5-6;295;150;45;Catan')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
          colunaJogoBase: 'Base',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [baseExistente],
    })

    const expansao = res.jogosProntosParaSalvar[0]!
    expect(expansao.idJogoBase).toBe('id-base-catan')
  })

  it('completa medidas ausentes via catalogo semeado com confirmadaPeloUsuario: false', async () => {
    catalogoFalso.definirMedida('Dixit', {
      maiorMm: 277,
      menorMm: 277,
      espessuraMm: 55,
      chaveDoTemplate: 'dixit',
      fonte: 'teste',
    })

    const csv = parsearCsv('Nome\nDixit')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: { colunaNome: 'Nome' },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: true,
      },
      jogosExistentes: [],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    const dixit = res.jogosProntosParaSalvar[0]!
    expect(dixit.medidas.maiorMm).toBe(277)
    expect(dixit.medidas.confirmadaPeloUsuario).toBe(false)
    expect(dixit.medidas.origem).toEqual({ tipo: 'semeada', chaveDoTemplate: 'dixit' })
  })

  it('respeita a politica de duplicatas "ignorar"', async () => {
    const catanExistente: CaixaDeJogo = {
      id: 'existente',
      nome: 'Catan',
      medidas: criarMedidas(295, 220, 70, { tipo: 'manual' }, true),
      idJogoBase: null,
      frequencia: { tipo: 'desconhecida' },
      idLudopedia: null,
      idBgg: null,
    }

    const csv = parsearCsv('Nome;Maior;Menor;Espessura\nCatan;300;200;50')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: { colunaNome: 'Nome' },
        politicaDuplicatas: 'ignorar',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [catanExistente],
    })

    expect(res.jogosProntosParaSalvar).toHaveLength(0)
    expect(res.pendencias).toContainEqual(
      expect.objectContaining({ tipo: 'duplicata-ignorada', nome: 'Catan' }),
    )
  })

  it('registra erro de linha sem abortar linhas validas', async () => {
    const csv = parsearCsv('Nome;Maior;Menor;Espessura\n;295;220;70\nAzul;260;260;70')
    const res = await processarCsv(csv, {
      catalogo: catalogoFalso,
      opcoes: {
        mapeamento: {
          colunaNome: 'Nome',
          colunaMaiorMm: 'Maior',
          colunaMenorMm: 'Menor',
          colunaEspessuraMm: 'Espessura',
        },
        politicaDuplicatas: 'substituir',
        tentarCompletarComCatalogo: false,
      },
      jogosExistentes: [],
    })

    expect(res.erros).toHaveLength(1)
    expect(res.erros[0]?.linha).toBe(2)
    expect(res.jogosProntosParaSalvar).toHaveLength(1)
    expect(res.jogosProntosParaSalvar[0]?.nome).toBe('Azul')
  })
})
