import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/config-service', () => {
  return {
    ConfigService: {
      get: vi.fn(),
    },
  }
})

import { ConfigService } from '../lib/config-service'
import { ConfigEnforcer } from '../lib/config-enforcer'

describe('ConfigEnforcer exchange flags', () => {
  it('returns global value when no overrides', async () => {
    vi.mocked(ConfigService.get)
      .mockResolvedValueOnce('true') // exchange_enabled
      .mockResolvedValueOnce('') // exchange_enabled_user_ids
      .mockResolvedValueOnce('') // exchange_disabled_user_ids

    await expect(ConfigEnforcer.isExchangeEnabledForUser('u1')).resolves.toBe(true)
  })

  it('disables user when in disabled list', async () => {
    vi.mocked(ConfigService.get)
      .mockResolvedValueOnce('true') // exchange_enabled
      .mockResolvedValueOnce('') // enabled list
      .mockResolvedValueOnce('u1,u2') // disabled list

    await expect(ConfigEnforcer.isExchangeEnabledForUser('u1')).resolves.toBe(false)
  })

  it('enables user when in enabled list even if global disabled', async () => {
    vi.mocked(ConfigService.get)
      .mockResolvedValueOnce('false') // exchange_enabled
      .mockResolvedValueOnce('u1,u2') // enabled list
      .mockResolvedValueOnce('') // disabled list

    await expect(ConfigEnforcer.isExchangeEnabledForUser('u1')).resolves.toBe(true)
  })

  it('reads free_trial_includes_exchange', async () => {
    vi.mocked(ConfigService.get).mockResolvedValueOnce('true')
    await expect(ConfigEnforcer.isExchangeIncludedInFreeTrial()).resolves.toBe(true)
  })
})

