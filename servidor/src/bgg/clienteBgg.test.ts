import { describe, expect, it, vi } from 'vitest'
import { ClienteBgg } from './clienteBgg.js'

const xmlValido = `
<items>
  <item type="boardgame" id="13">
    <name type="primary" value="Catan" />
    <yearpublished value="1995" />
    <item type="boardgameversion" id="101">
      <name type="primary" value="Edição Base" />
      <length value="11.6" />
      <width value="8.7" />
      <depth value="2.8" />
    </item>
  </item>
</items>
`

describe('ClienteBgg - Throttling e Rate Limiting', () => {
  it('enfileira requisições consecutivas respeitando o intervaloMinimoMs entre elas', async () => {
    const delaysExecutados: number[] = []
    const delayFn = vi.fn(async (ms: number) => {
      delaysExecutados.push(ms)
    })

    const mockFetch = vi.fn(async (_url: string | URL | Request) => {
      return new Response(xmlValido, { status: 200 })
    })

    const cliente = new ClienteBgg({
      intervaloMinimoMs: 1000,
      delayFn,
      fetcher: mockFetch as any,
    })

    // Dispara duas requisições consecutivas quase simultâneas
    const [res1, res2] = await Promise.all([
      cliente.buscarJogoComVersoes(13),
      cliente.buscarJogoComVersoes(14),
    ])

    expect(res1).not.toBeNull()
    expect(res2).not.toBeNull()
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // A segunda requisição deve ter invocado delayFn para respeitar o intervalo mínimo de 1000ms
    expect(delayFn).toHaveBeenCalled()
    expect(delaysExecutados.length).toBeGreaterThanOrEqual(1)
    expect(delaysExecutados[0]).toBeGreaterThanOrEqual(500)
    expect(delaysExecutados[0]).toBeLessThanOrEqual(1000)
  })
})

it('quando recebe HTTP 429 com Retry-After, aguarda o tempo indicado e retenta com sucesso', async () => {
  const delaysExecutados: number[] = []
  const delayFn = vi.fn(async (ms: number) => {
    delaysExecutados.push(ms)
  })

  let chamadas = 0
  const mockFetch = vi.fn(async () => {
    chamadas++
    if (chamadas === 1) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '5' },
      })
    }
    return new Response(xmlValido, { status: 200 })
  })

  const cliente = new ClienteBgg({
    intervaloMinimoMs: 0,
    delayFn,
    fetcher: mockFetch as any,
  })

  const res = await cliente.buscarJogoComVersoes(13)

  expect(res).not.toBeNull()
  expect(res?.nome).toBe('Catan')
  expect(mockFetch).toHaveBeenCalledTimes(2)
  // Retry-After de 5s = 5000ms
  expect(delaysExecutados).toContain(5000)
})

it('quando recebe HTTP 429 sem Retry-After, aplica backoff exponencial com base configurada e retenta', async () => {
  const delaysExecutados: number[] = []
  const delayFn = vi.fn(async (ms: number) => {
    delaysExecutados.push(ms)
  })

  let chamadas = 0
  const mockFetch = vi.fn(async () => {
    chamadas++
    if (chamadas <= 2) {
      return new Response('Too Many Requests', { status: 429 })
    }
    return new Response(xmlValido, { status: 200 })
  })

  const cliente = new ClienteBgg({
    intervaloMinimoMs: 0,
    backoffBaseMs: 1000,
    maxTentativas: 3,
    delayFn,
    fetcher: mockFetch as any,
  })

  const res = await cliente.buscarJogoComVersoes(13)

  expect(res).not.toBeNull()
  expect(mockFetch).toHaveBeenCalledTimes(3)
  // 2 retentativas: delay 1 >= 1000ms, delay 2 >= 2000ms
  expect(delaysExecutados.length).toBe(2)
  expect(delaysExecutados[0]).toBeGreaterThanOrEqual(1000)
  expect(delaysExecutados[1]).toBeGreaterThanOrEqual(2000)
})

it('desiste e retorna null se esgotar o maxTentativas em caso contínuo de 429', async () => {
  const delayFn = vi.fn(async () => {})
  const mockFetch = vi.fn(async () => {
    return new Response('Too Many Requests', { status: 429 })
  })

  const cliente = new ClienteBgg({
    intervaloMinimoMs: 0,
    maxTentativas: 2,
    delayFn,
    fetcher: mockFetch as any,
  })

  const res = await cliente.buscarJogoComVersoes(13)

  expect(res).toBeNull()
  // 1 chamada inicial + 2 retentativas = 3 chamadas no total
  expect(mockFetch).toHaveBeenCalledTimes(3)
})
