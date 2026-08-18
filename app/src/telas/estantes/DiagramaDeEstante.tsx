import type { DefinicaoDeEstante } from '../../nucleo/estante.js'

const LARGURA_DO_SVG = 200
const ALTURA_MAX_DO_SVG = 200

/**
 * Corte lateral em SVG puro, redesenhado a cada mudança na definição — a
 * "opção A" da spec §8.1 (diagrama 2D ao vivo, sem arraste). Componente puro
 * (props in, SVG out), testável sem montar o formulário que o envolve.
 *
 * @example <DiagramaDeEstante definicao={definicaoAtual} />
 */
export function DiagramaDeEstante({ definicao }: { definicao: DefinicaoDeEstante }) {
  const alturaTotalMm =
    definicao.alturaDoRodapeMm +
    definicao.alturasLivresMm.reduce((soma, altura) => soma + altura, 0) +
    definicao.espessuraDaPrateleiraMm * definicao.alturasLivresMm.length

  const escala = ALTURA_MAX_DO_SVG / Math.max(alturaTotalMm, 1)
  const larguraDesenhada = Math.min(LARGURA_DO_SVG, definicao.larguraUtilMm * escala)

  const linhasDePrateleira = calcularLinhasDePrateleira(definicao)

  return (
    <svg
      role="img"
      aria-label={`Diagrama da estante ${definicao.nome}`}
      viewBox={`0 0 ${LARGURA_DO_SVG + 60} ${ALTURA_MAX_DO_SVG + 20}`}
      width={LARGURA_DO_SVG + 60}
      height={ALTURA_MAX_DO_SVG + 20}
    >
      <text x={larguraDesenhada / 2} y="12" fontSize="11" textAnchor="middle">
        {definicao.larguraUtilMm}mm
      </text>
      <rect
        x="0"
        y="20"
        width={larguraDesenhada}
        height={alturaTotalMm * escala}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
      {linhasDePrateleira.map(({ yMm, alturaLivreMm }, indice) => (
        <g key={yMm}>
          {indice > 0 && (
            <line
              data-papel="linha-de-prateleira"
              x1="0"
              y1={20 + (alturaTotalMm - yMm) * escala}
              x2={larguraDesenhada}
              y2={20 + (alturaTotalMm - yMm) * escala}
              stroke="#333"
              strokeWidth="2"
            />
          )}
          <text
            x={larguraDesenhada + 8}
            y={20 + (alturaTotalMm - yMm - alturaLivreMm / 2) * escala}
            fontSize="10"
          >
            {alturaLivreMm}mm
          </text>
        </g>
      ))}
      <rect
        x="0"
        y={20 + alturaTotalMm * escala - definicao.alturaDoRodapeMm * escala}
        width={larguraDesenhada}
        height={Math.max(definicao.alturaDoRodapeMm * escala, 2)}
        fill="#c9a84f"
      />
    </svg>
  )
}

interface LinhaDePrateleira {
  readonly yMm: number
  readonly alturaLivreMm: number
}

/** De baixo para cima, mesma acumulação de `montarEstante` no núcleo. */
function calcularLinhasDePrateleira(definicao: DefinicaoDeEstante): readonly LinhaDePrateleira[] {
  const alturaTotalMm =
    definicao.alturaDoRodapeMm +
    definicao.alturasLivresMm.reduce((soma, altura) => soma + altura, 0) +
    definicao.espessuraDaPrateleiraMm * definicao.alturasLivresMm.length

  let alturaAcumuladaDoTopoMm = alturaTotalMm - definicao.alturaDoRodapeMm
  return definicao.alturasLivresMm.map((alturaLivreMm) => {
    const yMm = alturaTotalMm - alturaAcumuladaDoTopoMm
    alturaAcumuladaDoTopoMm -= alturaLivreMm + definicao.espessuraDaPrateleiraMm
    return { yMm, alturaLivreMm }
  })
}
