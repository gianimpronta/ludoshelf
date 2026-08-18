import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import ResizeObserverPolyfill from 'resize-observer-polyfill'
import { afterEach } from 'vitest'

// jsdom não implementa ResizeObserver; react-three-fiber (via react-use-measure)
// exige um construtor global para medir o <canvas>. Verificado nesta sessão:
// sem isto, montar <Canvas> lança "This browser does not support ResizeObserver".
globalThis.ResizeObserver ??= ResizeObserverPolyfill as unknown as typeof ResizeObserver

// @testing-library/react só registra o cleanup automático sozinho quando
// `test.globals: true` está ligado no Vitest. Este projeto não usa globals
// (todo teste importa describe/expect/it explicitamente de 'vitest'), então
// sem isto o DOM de um teste vaza para o próximo — verificado nesta sessão:
// dois testes que usam screen.getByText passavam a achar elementos duplicados.
afterEach(() => {
  cleanup()
})
