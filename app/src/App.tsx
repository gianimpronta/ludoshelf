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
    <main>
      <h1>LudoShelf</h1>
      <Banner mensagem={erroDePersistencia} />
      <Abas telaAtiva={telaAtiva} aoTrocar={irParaTela} />
      {telaAtiva === 'estantes' && <TelaDeEstantes />}
      {telaAtiva === 'colecao' && <TelaDeColecao />}
      {telaAtiva === 'arranjo' && <TelaDeArranjo />}
    </main>
  )
}
