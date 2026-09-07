import { useEffect, useState } from 'react'
import type { CatalogoDeJogos, VersaoDoJogo } from '../../catalogo/CatalogoDeJogos.js'
import { criarMedidas, type CaixaDeJogo } from '../../nucleo/jogo.js'

interface ResolucaoJogo {
  readonly jogoOriginal: CaixaDeJogo
  versoes: readonly VersaoDoJogo[]
  versaoSelecionadaId: string | null
  ladoA: string
  ladoB: string
  espessura: string
  confirmado: boolean
  buscando: boolean
}

export function ModalEnriquecerPendencias({
  jogosPendentes,
  catalogo,
  aoSalvarJogos,
  aoFechar,
}: {
  jogosPendentes: readonly CaixaDeJogo[]
  catalogo: CatalogoDeJogos
  aoSalvarJogos: (jogos: readonly CaixaDeJogo[]) => Promise<void>
  aoFechar: () => void
}) {
  const [itens, setItens] = useState<ResolucaoJogo[]>([])
  const [consultando, setConsultando] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const estadoInicial = jogosPendentes.map((j) => ({
      jogoOriginal: j,
      versoes: [] as readonly VersaoDoJogo[],
      versaoSelecionadaId: null as string | null,
      ladoA: String(j.medidas.maiorMm),
      ladoB: String(j.medidas.menorMm),
      espessura: String(j.medidas.espessuraMm),
      confirmado: false,
      buscando: false,
    }))
    setItens(estadoInicial)
    setProgresso(null)
  }, [jogosPendentes])

  async function iniciarConsulta(): Promise<void> {
    if (itens.length === 0 || consultando) return
    setConsultando(true)

    try {
      for (let i = 0; i < itens.length; i++) {
        setProgresso({ atual: i + 1, total: itens.length })
        setItens((atuais) => atuais.map((it, idx) => (idx === i ? { ...it, buscando: true } : it)))

        const item = itens[i]!
        try {
          const achado = catalogo.buscar
            ? await catalogo.buscar({
                nome: item.jogoOriginal.nome,
                idBgg: item.jogoOriginal.idBgg ?? undefined,
                idLudopedia: item.jogoOriginal.idLudopedia ?? undefined,
              })
            : await catalogo.buscarPorNome(item.jogoOriginal.nome)

          if (achado) {
            const versoes = achado.versoes ?? []
            const primeiraVersao = versoes[0]
            setItens((atuais) =>
              atuais.map((it, idx) => {
                if (idx !== i) return it
                if (primeiraVersao) {
                  return {
                    ...it,
                    versoes,
                    versaoSelecionadaId: primeiraVersao.id,
                    ladoA: String(primeiraVersao.maiorMm),
                    ladoB: String(primeiraVersao.menorMm),
                    espessura: String(primeiraVersao.espessuraMm),
                    confirmado: versoes.length === 1,
                    buscando: false,
                  }
                }
                return { ...it, buscando: false }
              }),
            )
          } else {
            setItens((atuais) =>
              atuais.map((it, idx) => (idx === i ? { ...it, buscando: false } : it)),
            )
          }
        } catch {
          setItens((atuais) =>
            atuais.map((it, idx) => (idx === i ? { ...it, buscando: false } : it)),
          )
        }
      }
    } finally {
      setConsultando(false)
    }
  }

  function selecionarVersao(idx: number, v: VersaoDoJogo): void {
    setItens((atuais) =>
      atuais.map((it, i) =>
        i === idx
          ? {
              ...it,
              versaoSelecionadaId: v.id,
              ladoA: String(v.maiorMm),
              ladoB: String(v.menorMm),
              espessura: String(v.espessuraMm),
              confirmado: true,
            }
          : it,
      ),
    )
  }

  async function aoSalvarConfirmados(): Promise<void> {
    setSalvando(true)
    try {
      const atualizados: CaixaDeJogo[] = []
      for (const item of itens) {
        if (!item.confirmado) continue
        const medidas = criarMedidas(
          Number(item.ladoA),
          Number(item.ladoB),
          Number(item.espessura),
          { tipo: 'manual' },
          true,
        )
        atualizados.push({
          ...item.jogoOriginal,
          medidas,
        })
      }

      if (atualizados.length > 0) {
        await aoSalvarJogos(atualizados)
      }
      aoFechar()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={aoFechar}>
      <div
        className="modal-conteudo modal-largo"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-cabecalho">
          <h2>⚡ Enriquecer Medidas Pendentes</h2>
          <button type="button" className="btn-fechar" onClick={aoFechar}>
            ✕
          </button>
        </div>

        <div className="modal-corpo" style={{ overflowY: 'auto', flex: 1, padding: '16px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Identificamos <strong>{itens.length} jogos</strong> com medidas não confirmadas ou
            provisórias. Selecione a versão correta da caixa física que você possui:
          </p>

          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {progresso
                  ? `Consultando no catálogo/BGG: ${progresso.atual} de ${progresso.total} jogos (${Math.round((progresso.atual / progresso.total) * 100)}%)...`
                  : 'Busque edições e medidas físicas oficiais no catálogo central e BGG.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-secundario"
              disabled={consultando || itens.length === 0}
              onClick={iniciarConsulta}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {consultando ? '⏳ Consultando BGG...' : '🔍 Consultar Versões no BGG'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {itens.map((item, idx) => (
              <div
                key={item.jogoOriginal.id}
                style={{
                  padding: '12px 16px',
                  background: 'var(--surface-sunken)',
                  border: item.confirmado
                    ? '1px solid var(--success, #4ade80)'
                    : '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1.05rem' }}>{item.jogoOriginal.nome}</strong>
                    {item.jogoOriginal.idBgg && (
                      <span
                        className="badge-procedencia"
                        style={{ marginLeft: '8px', fontSize: '0.75rem' }}
                      >
                        BGG #{item.jogoOriginal.idBgg}
                      </span>
                    )}
                  </div>
                  {item.buscando ? (
                    <span style={{ color: 'var(--accent, #6366f1)', fontSize: '0.85rem' }}>
                      ⏳ Consultando BGG...
                    </span>
                  ) : item.confirmado ? (
                    <span
                      style={{
                        color: 'var(--success, #4ade80)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      ✓ Confirmado ({item.ladoA}×{item.ladoB}×{item.espessura} mm)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.85rem' }}>
                      ⚠️ Pendente de escolha
                    </span>
                  )}
                </div>

                {item.versoes.length > 0 ? (
                  <div style={{ marginTop: '8px' }}>
                    <small
                      style={{
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: '6px',
                      }}
                    >
                      Escolha a edição que você tem na estante:
                    </small>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.versoes.map((v) => {
                        const selecionada = item.versaoSelecionadaId === v.id
                        return (
                          <div
                            key={v.id}
                            onClick={() => selecionarVersao(idx, v)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: selecionada ? 'var(--accent-dim)' : 'var(--surface)',
                              border: selecionada
                                ? '1px solid var(--accent)'
                                : '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: selecionada ? 600 : 400 }}>
                                {v.nomeVersao}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {v.editora ? `${v.editora} • ` : ''}
                                {v.idioma ? `${v.idioma} • ` : ''}
                                {v.ano ? `${v.ano}` : ''}
                              </div>
                            </div>
                            <span className="pill-medida" style={{ fontWeight: 600 }}>
                              {v.maiorMm} × {v.menorMm} × {v.espessuraMm} mm
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Nenhuma versão física cadastrada no catálogo central. Medidas atuais:{' '}
                    {item.ladoA}×{item.ladoB}×{item.espessura} mm.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="modal-rodape"
          style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}
        >
          <button type="button" className="btn-secundario" onClick={aoFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="btn-primario"
            onClick={aoSalvarConfirmados}
            disabled={salvando || itens.filter((i) => i.confirmado).length === 0}
          >
            {salvando
              ? 'Salvando...'
              : `Salvar ${itens.filter((i) => i.confirmado).length} alterações confirmadas`}
          </button>
        </div>
      </div>
    </div>
  )
}
