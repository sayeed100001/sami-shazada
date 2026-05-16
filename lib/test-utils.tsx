import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RealTimeProvider } from '@/contexts/RealTimeContext'
import { ToastContainer } from '@/components/ui/use-toast'
import { vi } from 'vitest'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => ({ get: vi.fn(), getAll: vi.fn(), has: vi.fn(), forEach: vi.fn() })),
  useParams: vi.fn(() => ({})),
}))

// Create a fresh query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

// Mock session data
export const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN',
    image: 'https://example.com/avatar.jpg',
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock admin stats data
export const mockAdminStats = {
  users: {
    total: 100,
    active: 80,
    pending: 5,
    blocked: 15,
    growth: {
      daily: 2.5,
      weekly: 10.2,
      monthly: 25.8
    },
    breakdown: {
      byRole: {
        admin: 5,
        user: 85,
        saraf: 10
      },
      byStatus: {
        active: 80,
        pending: 5,
        blocked: 15
      }
    }
  },
  sarafs: {
    total: 50,
    active: 40,
    pending: 8,
    blocked: 2,
    growth: {
      daily: 1.2,
      weekly: 5.5,
      monthly: 15.3
    },
    breakdown: {
      byType: {
        individual: 30,
        business: 20
      },
      byLocation: {
        kabul: 25,
        herat: 10,
        mazar: 8,
        other: 7
      }
    }
  },
  transactions: {
    total: 1000,
    pending: 20,
    completed: 950,
    failed: 30,
    totalVolume: 500000,
    averageValue: 500,
    growth: {
      daily: 3.2,
      weekly: 12.5,
      monthly: 35.8
    },
    breakdown: {
      byType: {
        deposit: 400,
        withdrawal: 350,
        transfer: 250
      },
      byStatus: {
        pending: 20,
        completed: 950,
        failed: 30
      }
    }
  },
  education: {
    totalCourses: 30,
    activeCourses: 25,
    totalStudents: 500,
    completionRate: 75,
    growth: {
      daily: 0.8,
      weekly: 3.5,
      monthly: 12.2
    },
    breakdown: {
      byCategory: {
        finance: 12,
        trading: 8,
        compliance: 10
      },
      byProgress: {
        notStarted: 100,
        inProgress: 300,
        completed: 100
      }
    }
  },
  systemHealth: {
    status: 'good',
    metrics: {
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 55,
      responseTime: 120,
      uptime: 99.98
    },
    alerts: {
      critical: 0,
      warning: 2,
      info: 5
    }
  },
  marketData: {
    conversionRate: 1.2,
    lastUpdate: new Date().toISOString(),
    trends: {
      daily: 0.5,
      weekly: -1.2,
      monthly: 2.8
    },
    volumes: {
      daily: 50000,
      weekly: 350000,
      monthly: 1500000
    }
  },
  recentTransactions: Array(5).fill(null).map((_, i) => ({
    id: `tx-${i}`,
    amount: 1000 * (i + 1),
    status: i % 2 ? 'completed' : 'pending',
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    user: {
      id: `user-${i}`,
      name: `User ${i}`,
    },
    type: i % 3 === 0 ? 'deposit' : i % 3 === 1 ? 'withdrawal' : 'transfer'
  })),
}

// Mock router functions
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}

// Mock search params
export const mockSearchParams = {
  get: vi.fn((key) => null),
  getAll: vi.fn(() => []),
  has: vi.fn(() => false),
  forEach: vi.fn(),
  entries: vi.fn(() => [].entries()),
  keys: vi.fn(() => [].keys()),
  values: vi.fn(() => [].values()),
  toString: vi.fn(() => ''),
}

// Setup providers wrapper
const AllTheProviders = ({ children, session = mockSession }: { children: React.ReactNode, session?: any }) => {
  const queryClient = createTestQueryClient()

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <RealTimeProvider>
              {children}
              <ToastContainer />
            </RealTimeProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    router?: Partial<typeof mockRouter>,
    pathname?: string,
    searchParams?: Partial<typeof mockSearchParams>,
    session?: any
  }
) => {
  // Setup default mocks with potential overrides
  useRouter.mockImplementation(() => ({
    ...mockRouter,
    ...(options?.router || {}),
  }))
  
  usePathname.mockImplementation(() => options?.pathname || '/')
  
  useSearchParams.mockImplementation(() => ({
    ...mockSearchParams,
    ...(options?.searchParams || {}),
  }))

  const { session, ...renderOptions } = options || {}
  return render(ui, { wrapper: (props) => <AllTheProviders session={session} {...props} />, ...renderOptions })
}

// Reset all mocks between tests
export const resetAllMocks = () => {
  vi.resetAllMocks()
}

// Helper function to wait for loading states to finish
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import('@testing-library/react')
  return waitFor(
    () => {
      const loader = document.querySelector('[aria-label="loading"], [data-testid="loading"]')
      if (loader) {
        throw new Error('Still loading')
      }
    },
    { timeout: 4000 }
  )
}

// Mock fetch responses
export const mockFetch = (data: any, options = {}) => {
  return vi.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      ...options,
    } as Response)
  )
}

// Mock fetch error responses
export const mockFetchError = (status = 500, message = 'Internal Server Error') => {
  return vi.spyOn(global, 'fetch').mockImplementation(() =>
    Promise.resolve({
      ok: false,
      status,
      statusText: message,
      json: () => Promise.resolve({ error: message }),
      text: () => Promise.resolve(JSON.stringify({ error: message })),
      headers: new Headers(),
    } as Response)
  )
}

// Mock WebSocket for RealTimeContext testing
export class MockWebSocket {
  static instance: MockWebSocket | null = null
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((data: any) => void) | null = null
  onerror: ((error: any) => void) | null = null
  readyState: number = WebSocket.CONNECTING

  constructor() {
    MockWebSocket.instance = this
  }

  send(data: string) {
    // Mock send implementation
    console.log('MockWebSocket.send', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }

  // Helper methods for testing
  static emit(event: string, data: any) {
    if (MockWebSocket.instance?.onmessage) {
      MockWebSocket.instance.onmessage({ data: JSON.stringify({ event, data }) })
    }
  }

  static connect() {
    if (MockWebSocket.instance) {
      MockWebSocket.instance.readyState = WebSocket.OPEN
      MockWebSocket.instance.onopen?.()
    }
  }

  static disconnect() {
    if (MockWebSocket.instance) {
      MockWebSocket.instance.readyState = WebSocket.CLOSED
      MockWebSocket.instance.onclose?.()
    }
  }

  static error(error: any) {
    if (MockWebSocket.instance?.onerror) {
      MockWebSocket.instance.onerror(error)
    }
  }
}

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}))

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  MockWebSocket.instance = null
})

export * from '@testing-library/react'
export { customRender as render }