import { describe, expect, it } from 'vitest'

describe('Frontend smoke tests', () => {
  it('runs Vitest in the frontend project', () => {
    expect(true).toBe(true)
  })

  it('handles product naming correctly', () => {
    expect('Pharmacie 360'.includes('360')).toBe(true)
  })
})
