import { Component, type ReactNode } from 'react'

interface Estado {
  readonly comErro: boolean
}

/** Fallback amigável quando o WebGL não está disponível (spec §7). */
export class LimiteDeErroDaCena extends Component<{ children: ReactNode }, Estado> {
  override state: Estado = { comErro: false }

  static getDerivedStateFromError(): Estado {
    return { comErro: true }
  }

  override render() {
    if (this.state.comErro) {
      return <p>Visualização 3D indisponível neste navegador.</p>
    }
    return this.props.children
  }
}
