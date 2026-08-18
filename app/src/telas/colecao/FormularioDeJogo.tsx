import { useState } from 'react'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'

/**
 * Cadastro/edição manual de jogo. `criarMedidas` do núcleo resolve maior/menor
 * — o formulário nunca decide isso (spec §8.2).
 *
 * @example <FormularioDeJogo jogosExistentes={jogos} aoSalvar={estado.salvarJogo} />
 */
export function FormularioDeJogo({
  jogosExistentes,
  aoSalvar,
}: {
  jogosExistentes: readonly CaixaDeJogo[]
  aoSalvar: (jogo: CaixaDeJogo) => void
}) {
  const [nome, setNome] = useState('')
  const [ladoA, setLadoA] = useState('')
  const [ladoB, setLadoB] = useState('')
  const [espessura, setEspessura] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [idJogoBase, setIdJogoBase] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function aoSubmeter(evento: React.FormEvent): void {
    evento.preventDefault()
    try {
      if (nome.trim() === '') {
        setErro('O nome do jogo não pode estar vazio.')
        return
      }
      const medidas = criarMedidas(
        Number(ladoA),
        Number(ladoB),
        Number(espessura),
        { tipo: 'manual' },
        true,
      )
      setErro(null)
      aoSalvar({
        id: crypto.randomUUID(),
        nome,
        medidas,
        idJogoBase: idJogoBase === '' ? null : idJogoBase,
        frequencia: destaque
          ? { tipo: 'destaque', marcadoPeloUsuario: true }
          : { tipo: 'desconhecida' },
        idLudopedia: null,
        idBgg: null,
      })
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  return (
    <form onSubmit={aoSubmeter}>
      {erro !== null && <p role="alert">{erro}</p>}

      <label htmlFor="jogo-nome">Nome</label>
      <input id="jogo-nome" value={nome} onChange={(e) => setNome(e.target.value)} />

      <label htmlFor="jogo-lado-a">Lado A (mm)</label>
      <input id="jogo-lado-a" value={ladoA} onChange={(e) => setLadoA(e.target.value)} />

      <label htmlFor="jogo-lado-b">Lado B (mm)</label>
      <input id="jogo-lado-b" value={ladoB} onChange={(e) => setLadoB(e.target.value)} />

      <label htmlFor="jogo-espessura">Espessura (mm)</label>
      <input id="jogo-espessura" value={espessura} onChange={(e) => setEspessura(e.target.value)} />

      <label htmlFor="jogo-destaque">Destaque</label>
      <input
        id="jogo-destaque"
        type="checkbox"
        checked={destaque}
        onChange={(e) => setDestaque(e.target.checked)}
      />

      <label htmlFor="jogo-base">Jogo-base (se for expansão)</label>
      <select id="jogo-base" value={idJogoBase} onChange={(e) => setIdJogoBase(e.target.value)}>
        <option value="">— nenhum —</option>
        {jogosExistentes.map((jogo) => (
          <option key={jogo.id} value={jogo.id}>
            {jogo.nome}
          </option>
        ))}
      </select>

      <button type="submit">Salvar jogo</button>
    </form>
  )
}
