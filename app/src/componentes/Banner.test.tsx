import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Banner } from './Banner.js'

describe('Banner', () => {
  it('nao renderiza nada quando a mensagem e nula', () => {
    const { container } = render(<Banner mensagem={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra a mensagem quando presente', () => {
    render(<Banner mensagem="Nada será salvo nesta sessão." />)
    expect(screen.getByRole('status')).toHaveTextContent('Nada será salvo nesta sessão.')
  })
})
