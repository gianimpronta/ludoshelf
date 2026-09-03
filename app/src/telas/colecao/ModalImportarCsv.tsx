import { useState } from 'react'
import type { CatalogoDeJogos } from '../../catalogo/CatalogoDeJogos.js'
import { parsearCsv, type ResultadoParseCsv } from '../../importacao/leitorCsv.js'
import { interpretarNumero, processarCsv } from '../../importacao/processarCsv.js'
import { gerarTemplateCsv } from '../../importacao/templateCsv.js'
import type {
  MapeamentoDeColunas,
  PoliticaDuplicatas,
  ResultadoProcessamentoCsv,
  UnidadeDeComprimento,
} from '../../importacao/tipos.js'
import type { CaixaDeJogo } from '../../nucleo/jogo.js'
import { TabelaDeRelatorio } from './TabelaDeRelatorio.js'

type Passo = 'upload' | 'mapeamento' | 'revisao' | 'concluido'

function sugerirColuna(cabecalhos: readonly string[], palavrasChave: readonly string[]): string {
  for (const cab of cabecalhos) {
    const min = cab.toLowerCase()
    if (palavrasChave.some((p) => min.includes(p))) {
      return cab
    }
  }
  return ''
}

export function ModalImportarCsv({
  catalogo,
  jogosExistentes,
  aoSalvarJogos,
  aoFechar,
}: {
  catalogo: CatalogoDeJogos
  jogosExistentes: readonly CaixaDeJogo[]
  aoSalvarJogos: (jogos: readonly CaixaDeJogo[]) => Promise<void>
  aoFechar: () => void
}) {
  const [passo, setPasso] = useState<Passo>('upload')
  const [metodoEntrada, setMetodoEntrada] = useState<'arquivo' | 'texto'>('arquivo')
  const [textoColado, setTextoColado] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [dadosCsv, setDadosCsv] = useState<ResultadoParseCsv | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Mapeamento e Opções
  const [colunaNome, setColunaNome] = useState('')
  const [colunaMaiorMm, setColunaMaiorMm] = useState('')
  const [colunaMenorMm, setColunaMenorMm] = useState('')
  const [colunaEspessuraMm, setColunaEspessuraMm] = useState('')
  const [colunaUnidade, setColunaUnidade] = useState('')
  const [colunaJogoBase, setColunaJogoBase] = useState('')
  const [colunaPartidas, setColunaPartidas] = useState('')

  const [unidadePadrao, setUnidadePadrao] = useState<UnidadeDeComprimento | 'auto'>('auto')
  const [politicaDuplicatas, setPoliticaDuplicatas] = useState<PoliticaDuplicatas>('substituir')
  const [tentarCatalogo, setTentarCatalogo] = useState(true)

  const [resultadoProcessamento, setResultadoProcessamento] =
    useState<ResultadoProcessamentoCsv | null>(null)
  const [salvando, setSalvando] = useState(false)

  function aoBaixarTemplate(): void {
    const csv = gerarTemplateCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'template-ludoshelf.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function carregarConteudoCsv(conteudo: string, nomeOrigem: string): void {
    try {
      setErro(null)
      const parseado = parsearCsv(conteudo)

      if (parseado.cabecalhos.length === 0 || parseado.linhas.length === 0) {
        setErro('O conteúdo CSV parece vazio ou sem cabeçalhos válidos.')
        return
      }

      setNomeArquivo(nomeOrigem)
      setDadosCsv(parseado)

      // Auto-detecção de colunas
      const cabs = parseado.cabecalhos
      const sugNome = sugerirColuna(cabs, ['nome', 'jogo', 'title', 'game']) || (cabs[0] ?? '')
      const sugMaior = sugerirColuna(cabs, ['comprimento', 'maior', 'ladoa', 'lado a', 'length'])
      const sugMenor = sugerirColuna(cabs, [
        'largura',
        'ladob',
        'lado b',
        'menor',
        'width',
        'profundidade',
      ])
      const sugEsp = sugerirColuna(cabs, ['espessura', 'altura', 'height', 'depth', 'thickness'])

      setColunaNome(sugNome)
      setColunaMaiorMm(sugMaior)
      setColunaMenorMm(sugMenor)
      setColunaEspessuraMm(sugEsp)
      setColunaUnidade(sugerirColuna(cabs, ['unidade', 'unit']))
      setColunaJogoBase(sugerirColuna(cabs, ['base', 'parent', 'jogo-base']))
      setColunaPartidas(sugerirColuna(cabs, ['partida', 'play']))

      // Auto-detecção de unidade baseada nos cabeçalhos e valores numéricos
      const textoCabecalhos = cabs.join(' ').toLowerCase()
      let unidadeSugerida: UnidadeDeComprimento | 'auto' = 'auto'

      if (/\b(cm|cent[ií]metros?)\b/i.test(textoCabecalhos)) {
        unidadeSugerida = 'cm'
      } else if (/\b(in|polegadas?|inches)\b/i.test(textoCabecalhos)) {
        unidadeSugerida = 'in'
      } else {
        const colunasDimensoes = [sugMaior, sugMenor, sugEsp].filter(Boolean)
        const valoresAmostra: number[] = []

        for (const linha of parseado.linhas.slice(0, 15)) {
          for (const col of colunasDimensoes) {
            if (linha[col]) {
              const num = interpretarNumero(linha[col])
              if (num !== null) valoresAmostra.push(num)
            }
          }
        }

        if (valoresAmostra.length > 0) {
          const maximo = Math.max(...valoresAmostra)
          // Se o maior valor encontrado for < 100 (ex: 29.5, 21, 7, 40.7), trata-se de centímetros
          if (maximo < 100) {
            unidadeSugerida = 'cm'
          } else {
            unidadeSugerida = 'mm'
          }
        }
      }

      setUnidadePadrao(unidadeSugerida)

      setPasso('mapeamento')
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  async function aoSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const conteudo = await arquivo.text()
    carregarConteudoCsv(conteudo, arquivo.name)
  }

  function aoProcessarTextoColado(): void {
    if (textoColado.trim() === '') {
      setErro('Cole o texto do seu CSV antes de continuar.')
      return
    }
    carregarConteudoCsv(textoColado, 'dados-colados.csv')
  }

  function aoCarregarExemplo(): void {
    const exemplo = [
      'Nome;Comprimento;Largura;Espessura;Unidade;Jogo-Base;Partidas',
      'Catan;295;220;70;mm;;12',
      'Catan: Cidades & Cavaleiros;295;220;50;mm;Catan;5',
      'Azul;260;260;70;mm;;8',
      'Wingspan;296;296;78;mm;;15',
      'Dixit;277;277;55;mm;;20',
    ].join('\n')
    carregarConteudoCsv(exemplo, 'exemplo-ludoshelf.csv')
  }

  async function aoAvancarParaRevisao(): Promise<void> {
    if (!dadosCsv) return
    if (!colunaNome) {
      setErro('Selecione a coluna que contém o Nome do jogo.')
      return
    }

    try {
      setErro(null)
      const mapeamento: MapeamentoDeColunas = {
        colunaNome,
        colunaMaiorMm: colunaMaiorMm || undefined,
        colunaMenorMm: colunaMenorMm || undefined,
        colunaEspessuraMm: colunaEspessuraMm || undefined,
        colunaUnidade: colunaUnidade || undefined,
        colunaJogoBase: colunaJogoBase || undefined,
        colunaPartidas: colunaPartidas || undefined,
      }

      const processado = await processarCsv(dadosCsv, {
        catalogo,
        opcoes: {
          mapeamento,
          unidadePadrao: unidadePadrao === 'auto' ? undefined : unidadePadrao,
          politicaDuplicatas,
          tentarCompletarComCatalogo: tentarCatalogo,
          nomeDoArquivo: nomeArquivo,
        },
        jogosExistentes,
      })

      setResultadoProcessamento(processado)
      setPasso('revisao')
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    }
  }

  async function aoConfirmarImportacao(): Promise<void> {
    if (!resultadoProcessamento) return
    try {
      setSalvando(true)
      await aoSalvarJogos(resultadoProcessamento.jogosProntosParaSalvar)
      setPasso('concluido')
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : String(excecao))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div className="modal-conteudo card-painel">
        <div className="card-cabecalho">
          <h3 id="modal-titulo">Importar Coleção via CSV</h3>
          <button type="button" className="btn-fechar" onClick={aoFechar} aria-label="Fechar modal">
            ✕
          </button>
        </div>

        {erro !== null && (
          <p role="alert" className="mensagem-erro">
            {erro}
          </p>
        )}

        {passo === 'upload' && (
          <div className="fluxo-upload">
            <p style={{ color: 'var(--text-secondary)' }}>
              Importe sua coleção a partir de um arquivo CSV, cole os dados da sua planilha ou teste
              imediatamente com dados de exemplo.
            </p>

            <div style={{ display: 'flex', gap: '8px', margin: '16px 0 14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn-secundario ${metodoEntrada === 'arquivo' ? 'btn-ativo' : ''}`}
                onClick={() => setMetodoEntrada('arquivo')}
              >
                📁 Arquivo CSV
              </button>
              <button
                type="button"
                className={`btn-secundario ${metodoEntrada === 'texto' ? 'btn-ativo' : ''}`}
                onClick={() => setMetodoEntrada('texto')}
              >
                📋 Colar Texto CSV
              </button>
              <button
                type="button"
                className="btn-secundario"
                style={{
                  marginLeft: 'auto',
                  background: 'var(--accent-gold-bg)',
                  color: '#fbbf24',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }}
                onClick={aoCarregarExemplo}
              >
                ⚡ Usar dados de exemplo
              </button>
            </div>

            {metodoEntrada === 'arquivo' ? (
              <>
                <div className="zona-upload">
                  <label htmlFor="csv-input-file" className="label-upload">
                    📂 <strong>Clique para escolher um arquivo CSV</strong>
                  </label>
                  <input
                    id="csv-input-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={aoSelecionarArquivo}
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button type="button" className="btn-secundario" onClick={aoBaixarTemplate}>
                    📥 Baixar modelo CSV recomendado
                  </button>
                </div>
              </>
            ) : (
              <div className="campo-grupo" style={{ marginTop: '12px' }}>
                <label htmlFor="csv-textarea">
                  Cole o conteúdo CSV (com cabeçalhos na 1ª linha):
                </label>
                <textarea
                  id="csv-textarea"
                  className="input-texto"
                  rows={7}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  placeholder={
                    'Nome;Comprimento;Largura;Espessura\nCatan;295;220;70\nAzul;260;260;70'
                  }
                  value={textoColado}
                  onChange={(e) => setTextoColado(e.target.value)}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    marginTop: '12px',
                  }}
                >
                  <button type="button" className="btn-secundario" onClick={aoBaixarTemplate}>
                    📥 Baixar modelo CSV
                  </button>
                  <button type="button" className="btn-primario" onClick={aoProcessarTextoColado}>
                    Processar Texto
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {passo === 'mapeamento' && dadosCsv && (
          <div className="fluxo-mapeamento formulario-estilizado">
            <p style={{ color: 'var(--text-secondary)' }}>
              Arquivo: <strong>{nomeArquivo}</strong> ({dadosCsv.linhas.length} linhas detectadas)
            </p>

            <div className="campo-grupo">
              <label htmlFor="map-nome">Coluna do Nome do Jogo *</label>
              <select
                id="map-nome"
                className="select-estilizado"
                value={colunaNome}
                onChange={(e) => setColunaNome(e.target.value)}
              >
                <option value="">Selecione...</option>
                {dadosCsv.cabecalhos.map((cab) => (
                  <option key={cab} value={cab}>
                    {cab}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo-linha-tripla">
              <div className="campo-grupo">
                <label htmlFor="map-maior">Comprimento / Lado A</label>
                <select
                  id="map-maior"
                  className="select-estilizado"
                  value={colunaMaiorMm}
                  onChange={(e) => setColunaMaiorMm(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label htmlFor="map-menor">Largura / Lado B</label>
                <select
                  id="map-menor"
                  className="select-estilizado"
                  value={colunaMenorMm}
                  onChange={(e) => setColunaMenorMm(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label htmlFor="map-espessura">Espessura / Altura</label>
                <select
                  id="map-espessura"
                  className="select-estilizado"
                  value={colunaEspessuraMm}
                  onChange={(e) => setColunaEspessuraMm(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="campo-linha-dupla">
              <div className="campo-grupo">
                <label htmlFor="map-unidade">Coluna de Unidade</label>
                <select
                  id="map-unidade"
                  className="select-estilizado"
                  value={colunaUnidade}
                  onChange={(e) => setColunaUnidade(e.target.value)}
                >
                  <option value="">(Usar unidade padrão abaixo)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label htmlFor="unidade-padrao">Unidade padrão das medidas</label>
                <select
                  id="unidade-padrao"
                  className="select-estilizado"
                  value={unidadePadrao}
                  onChange={(e) =>
                    setUnidadePadrao(e.target.value as UnidadeDeComprimento | 'auto')
                  }
                >
                  <option value="auto">
                    Detectar automaticamente (&lt; 100 = cm, &ge; 100 = mm)
                  </option>
                  <option value="cm">Centímetros (cm)</option>
                  <option value="mm">Milímetros (mm)</option>
                  <option value="in">Polegadas (in)</option>
                </select>
              </div>
            </div>

            <div className="campo-linha-dupla">
              <div className="campo-grupo">
                <label htmlFor="map-base">Coluna do Jogo-Base (para expansões)</label>
                <select
                  id="map-base"
                  className="select-estilizado"
                  value={colunaJogoBase}
                  onChange={(e) => setColunaJogoBase(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label htmlFor="map-partidas">Coluna de Partidas</label>
                <select
                  id="map-partidas"
                  className="select-estilizado"
                  value={colunaPartidas}
                  onChange={(e) => setColunaPartidas(e.target.value)}
                >
                  <option value="">(Nenhuma)</option>
                  {dadosCsv.cabecalhos.map((cab) => (
                    <option key={cab} value={cab}>
                      {cab}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="campo-linha-dupla">
              <div className="campo-grupo">
                <label htmlFor="politica-duplicatas">Se o jogo já existir na coleção</label>
                <select
                  id="politica-duplicatas"
                  className="select-estilizado"
                  value={politicaDuplicatas}
                  onChange={(e) => setPoliticaDuplicatas(e.target.value as PoliticaDuplicatas)}
                >
                  <option value="substituir">Substituir jogo existente</option>
                  <option value="ignorar">Ignorar duplicata da planilha</option>
                </select>
              </div>

              <div className="campo-grupo" style={{ justifyContent: 'center' }}>
                <label className="campo-checkbox-linha">
                  <input
                    type="checkbox"
                    checked={tentarCatalogo}
                    onChange={(e) => setTentarCatalogo(e.target.checked)}
                  />
                  <span>Completar medidas faltantes com catálogo semeado</span>
                </label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '16px',
              }}
            >
              <button type="button" className="btn-secundario" onClick={() => setPasso('upload')}>
                Voltar
              </button>
              <button type="button" className="btn-primario" onClick={aoAvancarParaRevisao}>
                Avançar para Revisão
              </button>
            </div>
          </div>
        )}

        {passo === 'revisao' && resultadoProcessamento && (
          <div className="fluxo-revisao">
            <div
              className="card-painel"
              style={{ background: 'var(--bg-surface-elevated)', margin: '16px 0' }}
            >
              <h4>Resumo da Leitura</h4>
              <p>
                Total de linhas: <strong>{resultadoProcessamento.totalLinhasArquivo}</strong>
              </p>
              <p>
                Jogos prontos para salvar:{' '}
                <strong style={{ color: 'var(--success)' }}>
                  {resultadoProcessamento.jogosProntosParaSalvar.length}
                </strong>
              </p>
              {resultadoProcessamento.pendencias.length > 0 && (
                <p>
                  Avisos e pendências:{' '}
                  <strong style={{ color: 'var(--accent-gold)' }}>
                    {resultadoProcessamento.pendencias.length}
                  </strong>
                </p>
              )}
              {resultadoProcessamento.erros.length > 0 && (
                <p>
                  Erros de leitura:{' '}
                  <strong style={{ color: 'var(--danger)' }}>
                    {resultadoProcessamento.erros.length}
                  </strong>
                </p>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '20px',
              }}
            >
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setPasso('mapeamento')}
              >
                Voltar ao Mapeamento
              </button>
              <button
                type="button"
                className="btn-primario"
                disabled={salvando || resultadoProcessamento.jogosProntosParaSalvar.length === 0}
                onClick={aoConfirmarImportacao}
              >
                {salvando
                  ? 'Salvando...'
                  : `Confirmar Importação (${resultadoProcessamento.jogosProntosParaSalvar.length})`}
              </button>
            </div>
          </div>
        )}

        {passo === 'concluido' && resultadoProcessamento && (
          <div className="fluxo-concluido">
            <TabelaDeRelatorio
              totalSalvos={resultadoProcessamento.jogosProntosParaSalvar.length}
              pendencias={resultadoProcessamento.pendencias}
              erros={resultadoProcessamento.erros}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn-primario" onClick={aoFechar}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
