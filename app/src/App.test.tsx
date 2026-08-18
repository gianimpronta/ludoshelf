import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App.js'

it('renderiza o título do app', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'LudoShelf' })).toBeInTheDocument()
})
