import { describe, expect, it } from 'vitest'
import { CatalogoFalso } from './CatalogoFalso.js'
import { CatalogoSemeado } from './CatalogoSemeado.js'

describe('CatalogoSemeado', () => {
  const catalogo = new CatalogoSemeado()

  it('lista formatos padrao com dimensoes positivas inteiras', () => {
    const formatos = catalogo.listarFormatosPadrao()
    expect(formatos.length).toBeGreaterThan(0)
    for (const f of formatos) {
      expect(f.maiorMm).toBeGreaterThan(0)
      expect(f.menorMm).toBeGreaterThan(0)
      expect(f.espessuraMm).toBeGreaterThan(0)
      expect(f.fonte).toBeTruthy()
      expect(f.fonte.toLowerCase()).not.toContain('bgg')
    }
  })

  it('localiza jogo conhecido por nome exato e normalizado', async () => {
    const catan = await catalogo.buscarPorNome('Catan')
    expect(catan).not.toBeNull()
    expect(catan?.maiorMm).toBe(295)

    const catanNormalizado = await catalogo.buscarPorNome('  catan™  ')
    expect(catanNormalizado).toEqual(catan)
  })

  it('devolve null quando o jogo nao esta na base semeada', async () => {
    const desconhecido = await catalogo.buscarPorNome('Jogo Totalmente Inexistente 1234')
    expect(desconhecido).toBeNull()
  })

  it('garante auditoria de fonte em todos os itens (risco R3)', () => {
    const dados = (catalogo as any).carregarDados()
    for (const j of dados.jogosConhecidos) {
      expect(j.fonte).toBeTruthy()
      expect(j.fonte.toLowerCase()).not.toContain('bgg')
    }
  })
})

describe('CatalogoFalso', () => {
  it('permite registrar e buscar jogos em memoria para testes', async () => {
    const falso = new CatalogoFalso()
    falso.definirMedida('Terra Mystica', {
      maiorMm: 315,
      menorMm: 225,
      espessuraMm: 90,
      chaveDoTemplate: 'terra-mystica',
      fonte: 'teste',
    })

    const achado = await falso.buscarPorNome('terra mystica')
    expect(achado?.maiorMm).toBe(315)
  })
})
