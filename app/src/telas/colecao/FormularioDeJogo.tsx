import { useEffect, useState } from 'react'
import type { CatalogoDeJogos, VersaoDoJogo } from '../../catalogo/CatalogoDeJogos.js'
import { CatalogoSemeado } from '../../catalogo/CatalogoSemeado.js'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'

/**
 * Cadastro e edição de jogo, com suporte a busca e seleção de versões físicas do catálogo central e BGG.
 */
export function FormularioDeJogo({
  jogosExistentes,
  aoSalvar,
  jogoEmEdicao,
  aoCancelarEdicao,
  catalogo,
}: {
  jogosExistentes: readonly CaixaDeJogo[]
  aoSalvar: (jogo: CaixaDeJogo) => void
  jogoEmEdicao?: CaixaDeJogo | null
  aoCancelarEdicao?: () => void
  catalogo?: CatalogoDeJogos
}) {
  const [nome, setNome] = useState('')
  const [ladoA, setLadoA] = useState('')
  const [ladoB, setLadoB] = useState('')
  const [espessura, setEspessura] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [idJogoBase, setIdJogoBase] = useState('')
  const [idBgg, setIdBgg] = useState('')
  const [idLudopedia, setIdLudopedia] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const [buscandoVersoes, setBuscandoVersoes] = useState(false)
  const [versoesEncontradas, setVersoesEncontradas] = useState<readonly VersaoDoJogo[] | null>(null)

  const catalogoEfetivo = catalogo ?? new CatalogoSemeado()
  const formatosPadrao = catalogoEfetivo.listarFormatosPadrao()

  useEffect(() => {
    if (jogoEmEdicao) {
      setNome(jogoEmEdicao.nome)
      setLadoA(String(jogoEmEdicao.medidas.maiorMm))
      setLadoB(String(jogoEmEdicao.medidas.menorMm))
      setEspessura(String(jogoEmEdicao.medidas.espessuraMm))
      setDestaque(jogoEmEdicao.frequencia.tipo === 'destaque')
      setIdJogoBase(jogoEmEdicao.idJogoBase ?? '')
      setIdBgg(jogoEmEdicao.idBgg !== null ? String(jogoEmEdicao.idBgg) : '')
      setIdLudopedia(jogoEmEdicao.idLudopedia !== null ? String(jogoEmEdicao.idLudopedia) : '')
      setVersoesEncontradas(null)
      setErro(null)
      setSucesso(null)
    } else {
      limparFormulario()
    }
  }, [jogoEmEdicao])

  function limparFormulario(): void {
    setNome('')
    setLadoA('')
    setLadoB('')
    setEspessura('')
    setDestaque(false)
    setIdJogoBase('')
    setIdBgg('')
    setIdLudopedia('')
    setVersoesEncontradas(null)
    setErro(null)
    setSucesso(null)
  }

  async function aoBuscarVersoes(): Promise<void> {
    if (!nome.trim() && !idBgg.trim() && !idLudopedia.trim()) {
      setErro('Informe ao menos o Nome ou ID BGG para buscar versões.')
      return
    }

    try {
      setBuscandoVersoes(true)
      setErro(null)
      setSucesso(null)

      const idBggNum = idBgg ? parseInt(idBgg, 10) : undefined
      const idLudoNum = idLudopedia ? parseInt(idLudopedia, 10) : undefined

      const resultado = catalogoEfetivo.buscar
        ? await catalogoEfetivo.buscar({
            nome: nome.trim() || undefined,
            idBgg: Number.isNaN(idBggNum) ? undefined : idBggNum,
            idLudopedia: Number.isNaN(idLudoNum) ? undefined : idLudoNum,
          })
        : await catalogoEfetivo.buscarPorNome(nome.trim())

      if (!resultado) {
        setErro('Nenhum dado ou versão encontrada para este jogo.')
        setVersoesEncontradas(null)
        return
      }

      if (resultado.versoes && resultado.versoes.length > 0) {
        setVersoesEncontradas(resultado.versoes)
        if (resultado.versoes.length === 1) {
          selecionarVersao(resultado.versoes[0]!)
        }
      } else {
        // Preenche com resultado direto
        setLadoA(String(resultado.maiorMm))
        setLadoB(String(resultado.menorMm))
        setEspessura(String(resultado.espessuraMm))
        setSucesso(
          `Dimensões encontradas (${resultado.fonte}): ${resultado.maiorMm}×${resultado.menorMm}×${resultado.espessuraMm} mm.`,
        )
      }
    } catch (e) {
      setErro('Falha ao consultar catálogo: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBuscandoVersoes(false)
    }
  }

  function selecionarVersao(v: VersaoDoJogo): void {
    setLadoA(String(v.maiorMm))
    setLadoB(String(v.menorMm))
    setEspessura(String(v.espessuraMm))
    if (v.idBggVersao && !idBgg) {
      setIdBgg(String(v.idBggVersao))
    }
    setSucesso(
      `Versão "${v.nomeVersao}" selecionada (${v.maiorMm}×${v.menorMm}×${v.espessuraMm} mm).`,
    )
  }

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

      const idBggNum = idBgg ? parseInt(idBgg, 10) : null
      const idLudoNum = idLudopedia ? parseInt(idLudopedia, 10) : null

      aoSalvar({
        id: jogoEmEdicao ? jogoEmEdicao.id : crypto.randomUUID(),
        nome: nome.trim(),
        medidas,
        idJogoBase: idJogoBase === '' ? null : idJogoBase,
        frequencia: destaque
          ? { tipo: 'destaque', marcadoPeloUsuario: true }
          : { tipo: 'desconhecida' },
        idLudopedia: Number.isNaN(idLudoNum) ? null : idLudoNum,
        idBgg: Number.isNaN(idBggNum) ? null : idBggNum,
      })

      limparFormulario()
      if (aoCancelarEdicao) aoCancelarEdicao()
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="formulario-estilizado">
      {jogoEmEdicao && (
        <div
          className="alerta-edicao"
          style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: '6px',
          }}
        >
          <span>
            ✏️ Editando: <strong>{jogoEmEdicao.nome}</strong>
          </span>
        </div>
      )}

      {erro !== null && (
        <p role="alert" className="mensagem-erro">
          {erro}
        </p>
      )}

      {sucesso !== null && (
        <p
          role="status"
          className="mensagem-sucesso"
          style={{ color: 'var(--success, #4ade80)', fontSize: '0.9rem', margin: '4px 0' }}
        >
          ✓ {sucesso}
        </p>
      )}

      <div className="campo-grupo">
        <label htmlFor="jogo-nome">Nome</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="jogo-nome"
            className="input-texto"
            placeholder="Ex: Catan, Wingspan, Ticket to Ride"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn-secundario"
            onClick={aoBuscarVersoes}
            disabled={buscandoVersoes}
            title="Buscar versões com dimensões no Catálogo PostgreSQL / BGG"
          >
            {buscandoVersoes ? '🔍 Buscando...' : '🔍 Buscar no Catálogo'}
          </button>
        </div>
      </div>

      {versoesEncontradas && versoesEncontradas.length > 0 && (
        <div
          className="painel-versoes"
          style={{
            margin: '12px 0',
            padding: '10px',
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
          }}
        >
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Selecione a versão que você possui ({versoesEncontradas.length} edições):
          </label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {versoesEncontradas.map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--surface)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
                onClick={() => selecionarVersao(v)}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{v.nomeVersao}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {v.editora ? `${v.editora} • ` : ''}
                    {v.ano ? `${v.ano} • ` : ''}
                    {v.idioma ? `${v.idioma} • ` : ''}
                    <span>
                      {v.maiorMm} × {v.menorMm} × {v.espessuraMm} mm
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secundario"
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  aria-label={`Usar medidas de ${v.nomeVersao}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    selecionarVersao(v)
                  }}
                >
                  Usar medidas
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="campo-linha-dupla">
        <div className="campo-grupo">
          <label htmlFor="jogo-id-bgg">ID BGG (opcional)</label>
          <input
            id="jogo-id-bgg"
            className="input-texto"
            placeholder="Ex: 13"
            value={idBgg}
            onChange={(e) => setIdBgg(e.target.value)}
          />
        </div>

        <div className="campo-grupo">
          <label htmlFor="jogo-id-ludo">ID Ludopedia (opcional)</label>
          <input
            id="jogo-id-ludo"
            className="input-texto"
            placeholder="Ex: 1"
            value={idLudopedia}
            onChange={(e) => setIdLudopedia(e.target.value)}
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
          {jogosExistentes
            .filter((j) => !jogoEmEdicao || j.id !== jogoEmEdicao.id)
            .map((jogo) => (
              <option key={jogo.id} value={jogo.id}>
                {jogo.nome}
              </option>
            ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button type="submit" className="btn-primario" style={{ flex: 1 }}>
          {jogoEmEdicao ? 'Salvar alterações' : 'Salvar jogo'}
        </button>
        {jogoEmEdicao && (
          <button
            type="button"
            className="btn-secundario"
            onClick={() => {
              limparFormulario()
              if (aoCancelarEdicao) aoCancelarEdicao()
            }}
          >
            Cancelar edição
          </button>
        )}
      </div>
    </form>
  )
}
