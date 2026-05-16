import { describe, expect, it } from 'vitest'
import { ApiResponse } from '@/lib/api-response'

describe('ApiResponse', () => {
  it('ok() returns success=true and merges payload', async () => {
    const res = ApiResponse.ok({ hello: 'world' })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true, hello: 'world' })
  })

  it('error() returns success=false and error string', async () => {
    const res = ApiResponse.error('Bad request', 400, 'BAD_REQUEST')
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: 'Bad request',
      code: 'BAD_REQUEST',
    })
  })
})

