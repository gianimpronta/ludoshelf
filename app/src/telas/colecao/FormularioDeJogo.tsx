import { useState } from 'react'
import type { CatalogoDeJogos } from '../../catalogo/CatalogoDeJogos.js'
import { CatalogoSemeado } from '../../catalogo/CatalogoSemeado.js'
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
  catalogo,
}: {
  jogosExistentes: readonly CaixaDeJogo[]
  aoSalvar: (jogo: CaixaDeJogo) => void
  catalogo?: CatalogoDeJogos
}) {
  const [nome, setNome] = useState('')
  const [ladoA, setLadoA] = useState('')
  const [ladoB, setLadoB] = useState('')
  const [espessura, setEspessura] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [idJogoBase, setIdJogoBase] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const catalogoEfetivo = catalogo ?? new CatalogoSemeado()
  const formatosPadrao = catalogoEfetivo.listarFormatosPadrao()

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
    <form onSubmit={aoSubmeter} className="formulario-estilizado">
      {erro !== null && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      <div className="campo-grupo">
        <label htmlFor="jogo-nome">Nome</label>
        <input
          id="jogo-nome"
          className="input-texto"
          placeholder="Ex: Catan, Wingspan, Ticket to Ride"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>

      <div className="campo-grupo">
        <label htmlFor="jogo-formato-padrao">Formato padrão da caixa (opcional)</label>
        <select
          id="jogo-formato-padrao"
          className="select-estilizado"
          defaultValue=""
          onChange={(e) => {
            const formato = formatosPadrao.find((f) => f.chave === e.target.value)
            if (formato) {
              setLadoA(String(formato.maiorMm))
              setLadoB(String(formato.menorMm))
              setEspessura(String(formato.espessuraMm))
            }
          }}
        >
          <option value="">Preenchimento livre ou escolha um formato...</option>
          {formatosPadrao.map((f) => (
            <option key={f.chave} value={f.chave}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo-linha-tripla">
        <div className="campo-grupo">
          <label htmlFor="jogo-lado-a">Lado A (mm)</label>
          <input
            id="jogo-lado-a"
            className="input-texto"
            placeholder="Ex: 295"
            value={ladoA}
            onChange={(e) => setLadoA(e.target.value)}
          />
        </div>

        <div className="campo-grupo">
          <label htmlFor="jogo-lado-b">Lado B (mm)</label>
          <input
            id="jogo-lado-b"
            className="input-texto"
            placeholder="Ex: 295"
            value={ladoB}
            onChange={(e) => setLadoB(e.target.value)}
          />
        </div>

        <div className="campo-grupo">
          <label htmlFor="jogo-espessura">Espessura (mm)</label>
          <input
            id="jogo-espessura"
            className="input-texto"
            placeholder="Ex: 70"
            value={espessura}
            onChange={(e) => setEspessura(e.target.value)}
          />
        </div>
      </div>

      <div className="campo-checkbox-linha">
        <input
          id="jogo-destaque"
          type="checkbox"
          checked={destaque}
          onChange={(e) => setDestaque(e.target.checked)}
        />
        <label htmlFor="jogo-destaque">Destaque</label>
      </div>

      <div className="campo-grupo">
        <label htmlFor="jogo-base">Jogo-base (se for expansão)</label>
        <select
          id="jogo-base"
          className="select-estilizado"
          value={idJogoBase}
          onChange={(e) => setIdJogoBase(e.target.value)}
        >
          <option value="">— nenhum —</option>
          {jogosExistentes.map((jogo) => (
            <option key={jogo.id} value={jogo.id}>
              {jogo.nome}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primario">
        Salvar jogo
      </button>
    </form>
  )
}
