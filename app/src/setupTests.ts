import '@testing-library/jest-dom/vitest'
import ResizeObserverPolyfill from 'resize-observer-polyfill'

// jsdom não implementa ResizeObserver; react-three-fiber (via react-use-measure)
// exige um construtor global para medir o <canvas>. Verificado nesta sessão:
// sem isto, montar <Canvas> lança "This browser does not support ResizeObserver".
globalThis.ResizeObserver ??= ResizeObserverPolyfill as unknown as typeof ResizeObserver
