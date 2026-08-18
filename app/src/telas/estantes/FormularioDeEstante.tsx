import { useState } from 'react'
import type { DefinicaoDeEstante } from '../../nucleo/estante.js'
import { montarEstante } from '../../nucleo/estante.js'
import { DiagramaDeEstante } from './DiagramaDeEstante.js'

interface CamposDoFormulario {
  readonly nome: string
  readonly larguraUtilMm: string
  readonly profundidadeUtilMm: string
  readonly alturaDoRodapeMm: string
  readonly espessuraDaPrateleiraMm: string
  readonly alturasLivresMm: readonly string[]
}

const CAMPOS_VAZIOS: CamposDoFormulario = {
  nome: '',
  larguraUtilMm: '',
  profundidadeUtilMm: '',
  alturaDoRodapeMm: '',
  espessuraDaPrateleiraMm: '',
  alturasLivresMm: [''],
}

/**
 * Cadastro de estante. A validação é a mesma do núcleo: monta uma
 * `DefinicaoDeEstante` e tenta `montarEstante` só para capturar o erro — nenhuma
 * regra de validação é reescrita aqui (spec §7).
 *
 * @example <FormularioDeEstante aoSalvar={(def) => estado.salvarEstante(...)} />
 */
export function FormularioDeEstante({
  aoSalvar,
}: {
  aoSalvar: (definicao: DefinicaoDeEstante) => void
}) {
  const [campos, setCampos] = useState(CAMPOS_VAZIOS)
  const [erro, setErro] = useState<string | null>(null)

  const definicaoParaDiagrama: DefinicaoDeEstante = paraDefinicaoOuZero(campos)

  function aoSubmeter(evento: React.FormEvent): void {
    evento.preventDefault()
    try {
      const definicao = paraDefinicao(campos)
      montarEstante('previa', definicao) // só para validar; o id real vem do estado
      setErro(null)
      aoSalvar(definicao)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  function aoAdicionarPrateleira(): void {
    setCampos((atual) => ({
      ...atual,
      alturasLivresMm: [...atual.alturasLivresMm, ''],
    }))
  }

  function aoMudarAlturaLivre(indice: number, valor: string): void {
    setCampos((atual) => ({
      ...atual,
      alturasLivresMm: atual.alturasLivresMm.map((v, i) => (i === indice ? valor : v)),
    }))
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro !== null && <p role="alert">{erro}</p>}

      <label htmlFor="campo-nome">Nome</label>
      <input
        id="campo-nome"
        value={campos.nome}
        onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
      />

      <label htmlFor="campo-largura">Largura útil (mm)</label>
      <input
        id="campo-largura"
        value={campos.larguraUtilMm}
        onChange={(e) => setCampos({ ...campos, larguraUtilMm: e.target.value })}
      />

      <label htmlFor="campo-profundidade">Profundidade útil (mm)</label>
      <input
        id="campo-profundidade"
        value={campos.profundidadeUtilMm}
        onChange={(e) => setCampos({ ...campos, profundidadeUtilMm: e.target.value })}
      />

      <label htmlFor="campo-rodape">Altura do rodapé (mm)</label>
      <input
        id="campo-rodape"
        value={campos.alturaDoRodapeMm}
        onChange={(e) => setCampos({ ...campos, alturaDoRodapeMm: e.target.value })}
      />

      <label htmlFor="campo-espessura">Espessura da prateleira (mm)</label>
      <input
        id="campo-espessura"
        value={campos.espessuraDaPrateleiraMm}
        onChange={(e) => setCampos({ ...campos, espessuraDaPrateleiraMm: e.target.value })}
      />

      {campos.alturasLivresMm.map((valor, indice) => (
        <div key={indice}>
          <label htmlFor={`campo-altura-${indice}`}>
            Altura livre da prateleira {indice + 1} (mm)
          </label>
          <input
            id={`campo-altura-${indice}`}
            value={valor}
            onChange={(e) => aoMudarAlturaLivre(indice, e.target.value)}
          />
        </div>
      ))}
      <button type="button" onClick={aoAdicionarPrateleira}>
        + prateleira
      </button>

      <DiagramaDeEstante definicao={definicaoParaDiagrama} />

      <button type="submit">Salvar estante</button>
    </form>
  )
}

function paraNumero(valor: string): number {
  return valor.trim() === '' ? 0 : Number(valor)
}

function paraDefinicao(campos: CamposDoFormulario): DefinicaoDeEstante {
  return {
    nome: campos.nome,
    larguraUtilMm: paraNumero(campos.larguraUtilMm),
    profundidadeUtilMm: paraNumero(campos.profundidadeUtilMm),
    alturaDoRodapeMm: paraNumero(campos.alturaDoRodapeMm),
    espessuraDaPrateleiraMm: paraNumero(campos.espessuraDaPrateleiraMm),
    alturasLivresMm: campos.alturasLivresMm.map(paraNumero),
  }
}

/** Versão tolerante a campo vazio, só para o diagrama nunca lançar enquanto digita. */
function paraDefinicaoOuZero(campos: CamposDoFormulario): DefinicaoDeEstante {
  const definicao = paraDefinicao(campos)
  return {
    ...definicao,
    alturasLivresMm: definicao.alturasLivresMm.map((altura) => Math.max(altura, 1)),
  }
}
