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
  const [carregandoLote, setCarregandoLote] = useState(false)
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
    executarBuscaInicial(estadoInicial)
  }, [jogosPendentes])

  async function executarBuscaInicial(lista: ResolucaoJogo[]): Promise<void> {
    setCarregandoLote(true)
    try {
      if ('resolverLote' in catalogo && typeof (catalogo as any).resolverLote === 'function') {
        const payload = lista.map((item, idx) => ({
          linha: idx,
          nome: item.jogoOriginal.nome,
          idBgg: item.jogoOriginal.idBgg ?? undefined,
          idLudopedia: item.jogoOriginal.idLudopedia ?? undefined,
        }))

        const respostas = await (catalogo as any).resolverLote(payload)
        setItens((atuais) =>
          atuais.map((item, idx) => {
            const resp = respostas.find((r: any) => r.linha === idx)?.resultado
            if (!resp) return item

            const versoes = resp.versoes ?? []
            const primeiraVersao = versoes[0]
            if (primeiraVersao) {
              return {
                ...item,
                versoes,
                versaoSelecionadaId: primeiraVersao.id,
                ladoA: String(primeiraVersao.maiorMm),
                ladoB: String(primeiraVersao.menorMm),
                espessura: String(primeiraVersao.espessuraMm),
                confirmado: versoes.length === 1, // Se só tem 1 versão, já pré-confirma
              }
            }
            return item
          }),
        )
      } else {
        // Fallback: busca um a um
        for (let i = 0; i < lista.length; i++) {
          const item = lista[i]!
          const achado = catalogo.buscar
            ? await catalogo.buscar({
                nome: item.jogoOriginal.nome,
                idBgg: item.jogoOriginal.idBgg ?? undefined,
                idLudopedia: item.jogoOriginal.idLudopedia ?? undefined,
              })
            : await catalogo.buscarPorNome(item.jogoOriginal.nome)

          if (achado) {
            setItens((atuais) =>
              atuais.map((it, idx) =>
                idx === i
                  ? {
                      ...it,
                      versoes: achado.versoes ?? [],
                      ladoA: String(achado.maiorMm),
                      ladoB: String(achado.menorMm),
                      espessura: String(achado.espessuraMm),
                      confirmado: (achado.versoes ?? []).length <= 1,
                    }
                  : it,
              ),
            )
          }
        }
      }
    } catch {
      // Falha silenciosa na carga inicial em lote
    } finally {
      setCarregandoLote(false)
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

          {carregandoLote && (
            <p style={{ color: 'var(--accent)', fontStyle: 'italic', marginBottom: '12px' }}>
              🔍 Consultando banco PostgreSQL e BGG em lote...
            </p>
          )}

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
                  {item.confirmado ? (
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
