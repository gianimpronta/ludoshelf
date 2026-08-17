import type { Compartimento } from './estante.js'
import type { MedidasDaCaixa } from './jogo.js'
import type { Milimetros } from './medidas.js'

/** Como a caixa fica em pé: `maiorMm` na vertical ou `menorMm` na vertical. */
export type Apoio = 'retrato' | 'paisagem'

export type MotivoDeRecusa = 'alto-demais' | 'fundo-demais' | 'largo-demais'

export type ResultadoDeEncaixe =
  | { readonly cabe: true; readonly apoio: Apoio }
  | { readonly cabe: false; readonly motivo: MotivoDeRecusa; readonly faltaMm: Milimetros }

/**
 * Decide se a caixa cabe no compartimento e em que pose, ou por que não cabe.
 * O `faltaMm` da recusa é o que permite a UI dizer "faltam 41 mm" em vez de "não coube".
 *
 * @example encaixar(criarMedidas(300, 220, 60, origem, true), prateleira250)
 *          // { cabe: true, apoio: 'paisagem' }
 */
export function encaixar(
  medidas: MedidasDaCaixa,
  compartimento: Compartimento,
): ResultadoDeEncaixe {
  if (medidas.espessuraMm > compartimento.larguraUtilMm) {
    return recusa('largo-demais', medidas.espessuraMm - compartimento.larguraUtilMm)
  }
  if (cabeEmRetrato(medidas, compartimento)) {
    return { cabe: true, apoio: 'retrato' }
  }
  if (cabeEmPaisagem(medidas, compartimento)) {
    return { cabe: true, apoio: 'paisagem' }
  }
  return diagnosticarRecusa(medidas, compartimento)
}

function cabeEmRetrato(medidas: MedidasDaCaixa, compartimento: Compartimento): boolean {
  return (
    medidas.maiorMm <= compartimento.alturaUtilMm &&
    medidas.menorMm <= compartimento.profundidadeUtilMm
  )
}

function cabeEmPaisagem(medidas: MedidasDaCaixa, compartimento: Compartimento): boolean {
  return (
    medidas.menorMm <= compartimento.alturaUtilMm &&
    medidas.maiorMm <= compartimento.profundidadeUtilMm
  )
}

/**
 * Chega aqui só quando nenhuma pose serve. Se nem a menor dimensão cabe na altura,
 * o problema é altura. Caso contrário sobrou profundidade, e o que falta é a
 * dimensão que teria de entrar no fundo na única pose viável em altura.
 */
function diagnosticarRecusa(
  medidas: MedidasDaCaixa,
  compartimento: Compartimento,
): ResultadoDeEncaixe {
  if (medidas.menorMm > compartimento.alturaUtilMm) {
    return recusa('alto-demais', medidas.menorMm - compartimento.alturaUtilMm)
  }
  const fundoNecessarioMm =
    medidas.maiorMm <= compartimento.alturaUtilMm ? medidas.menorMm : medidas.maiorMm
  return recusa('fundo-demais', fundoNecessarioMm - compartimento.profundidadeUtilMm)
}

function recusa(motivo: MotivoDeRecusa, faltaMm: Milimetros): ResultadoDeEncaixe {
  return { cabe: false, motivo, faltaMm }
}
