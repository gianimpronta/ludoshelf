import type { Tela } from '../estado/useEstadoDoApp.js'

const ROTULOS: Record<Tela, string> = {
  estantes: 'Estantes',
  colecao: 'Coleção',
  arranjo: 'Arranjo',
}

/** Navegação por abas sem URL (spec D2). */
export function Abas({ telaAtiva, aoTrocar }: { telaAtiva: Tela; aoTrocar: (tela: Tela) => void }) {
  return (
    <nav role="tablist">
      {(Object.keys(ROTULOS) as Tela[]).map((tela) => (
        <button
          key={tela}
          type="button"
          role="tab"
          aria-selected={tela === telaAtiva}
          onClick={() => aoTrocar(tela)}
        >
          {ROTULOS[tela]}
        </button>
      ))}
    </nav>
  )
}
