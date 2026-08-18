import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LimiteDeErroDaCena } from './LimiteDeErroDaCena.js'

function ComponenteQueLanca(): never {
  throw new Error('sem WebGL')
}

describe('LimiteDeErroDaCena', () => {
  it('renderiza os filhos normalmente quando nao ha erro', () => {
    render(
      <LimiteDeErroDaCena>
        <p>cena ok</p>
      </LimiteDeErroDaCena>,
    )
    expect(screen.getByText('cena ok')).toBeInTheDocument()
  })

  it('mostra mensagem de fallback quando a cena lanca', () => {
    render(
      <LimiteDeErroDaCena>
        <ComponenteQueLanca />
      </LimiteDeErroDaCena>,
    )
    expect(screen.getByText('Visualização 3D indisponível neste navegador.')).toBeInTheDocument()
  })
})
