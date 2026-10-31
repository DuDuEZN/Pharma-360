import { beforeEach, describe, expect, it } from 'vitest'
import { api } from '../src/services/api.js'

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses /api as the base URL', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('adds the bearer token from localStorage on requests', () => {
    localStorage.setItem('token', 'abc123')

    const requestConfig = { headers: {} }
    const interceptor = api.interceptors.request.handlers.find((handler) => handler.fulfilled)

    expect(interceptor).toBeTruthy()
    expect(interceptor.fulfilled(requestConfig).headers.Authorization).toBe('Bearer abc123')
  })
})
