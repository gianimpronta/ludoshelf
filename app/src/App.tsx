import { Abas } from './componentes/Abas.js'
import { Banner } from './componentes/Banner.js'
import { useEstadoDoApp } from './estado/useEstadoDoApp.js'
import { TelaDeArranjo } from './telas/arranjo/TelaDeArranjo.js'
import { TelaDeColecao } from './telas/colecao/TelaDeColecao.js'
import { TelaDeEstantes } from './telas/estantes/TelaDeEstantes.js'

/** Composição raiz: abas + tela ativa (spec D2 — sem URL, sem React Router). */
export function App() {
  const telaAtiva = useEstadoDoApp((estado) => estado.telaAtiva)
  const irParaTela = useEstadoDoApp((estado) => estado.irParaTela)
  const erroDePersistencia = useEstadoDoApp((estado) => estado.erroDePersistencia)

  return (
    <main className="app-container">
      <header className="cabecalho-app">
        <div className="cabecalho-marca">
          <span className="logo-icone" aria-hidden="true">
            🎲
          </span>
          <div>
            <h1>LudoShelf</h1>
            <p className="subtitulo-app">Organizador 3D para estantes de jogos de tabuleiro</p>
          </div>
        </div>
        <span className="badge-versao">v1.0</span>
      </header>

      <Banner mensagem={erroDePersistencia} />
      <Abas telaAtiva={telaAtiva} aoTrocar={irParaTela} />
      <div className="conteudo-tela">
        {telaAtiva === 'estantes' && <TelaDeEstantes />}
        {telaAtiva === 'colecao' && <TelaDeColecao />}
        {telaAtiva === 'arranjo' && <TelaDeArranjo />}
      </div>
    </main>
  )
}
