import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

// --- Mocks : authentification et toasts (le hook ne dépend que de ces deux contextes) ---
let authValue = { token: 'tok-1', user: { id: 1, role: 'admin' } }
const addToast = vi.fn()

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authValue }))
vi.mock('@/components/common/Toast', () => ({
  // Nouvelle fonction à chaque rendu : reproduit un contexte de toasts non mémoïsé
  useToast: () => ({ addToast: (...a) => addToast(...a) }),
}))

// --- Faux WebSocket qui trace les ouvertures / fermetures ---
let sockets = []
class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  constructor(url) {
    this.url = url
    this.readyState = 0
    this.sent = []
    sockets.push(this)
  }
  send(data) { this.sent.push(data) }
  close(code) {
    this.readyState = 3
    this.closedWith = code
    this.onclose?.({ code: code ?? 1005 })
  }
  open() { this.readyState = 1; this.onopen?.() }
}

import { WebSocketProvider, useWebSocket } from '@/hooks/useWebSocket'

let ctx
function Probe() {
  ctx = useWebSocket()
  return null
}
const mount = (role = 'cashier') =>
  render(<WebSocketProvider role={role}><Probe /></WebSocketProvider>)

describe('WebSocketProvider', () => {
  beforeEach(() => {
    sockets = []
    addToast.mockClear()
    authValue = { token: 'tok-1', user: { id: 1, role: 'admin' } }
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("n'ouvre qu'une seule connexion, même après plusieurs rendus et toasts", () => {
    const { rerender } = mount()
    expect(sockets).toHaveLength(1)

    act(() => sockets[0].open())          // déclenche setState + toast + rendu
    rerender(<WebSocketProvider role="cashier"><Probe /></WebSocketProvider>)
    rerender(<WebSocketProvider role="cashier"><Probe /></WebSocketProvider>)

    expect(sockets).toHaveLength(1)
    expect(sockets[0].closedWith).toBeUndefined()
    expect(ctx.isConnected).toBe(true)
  })

  it("utilise l'URL /ws/cashier avec le token", () => {
    mount('cashier')
    expect(sockets[0].url).toContain('/ws/cashier')
    expect(sockets[0].url).toContain('token=tok-1')
  })

  it('envoie le ping initial dès que la connexion est ouverte', () => {
    mount()
    act(() => sockets[0].open())
    expect(sockets[0].sent.map((m) => JSON.parse(m).type)).toContain('ping')
  })

  it('se reconnecte avec un délai après une coupure anormale, une seule fois', () => {
    mount()
    act(() => sockets[0].open())
    act(() => sockets[0].onclose({ code: 1006 }))
    expect(sockets).toHaveLength(1)       // pas de reconnexion immédiate
    act(() => { vi.advanceTimersByTime(1100) })
    expect(sockets).toHaveLength(2)
  })

  it('ne se reconnecte pas après un refus (code 1008)', () => {
    mount()
    act(() => sockets[0].onclose({ code: 1008 }))
    act(() => { vi.advanceTimersByTime(30000) })
    expect(sockets).toHaveLength(1)
  })

  it('ferme proprement la connexion au démontage, sans reconnexion', () => {
    const { unmount } = mount()
    act(() => sockets[0].open())
    unmount()
    expect(sockets[0].closedWith).toBe(1000)
    act(() => { vi.advanceTimersByTime(30000) })
    expect(sockets).toHaveLength(1)
  })

  it("ne se connecte pas sans token", () => {
    authValue = { token: null, user: null }
    mount()
    expect(sockets).toHaveLength(0)
  })
})
