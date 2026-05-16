import { render, screen, waitFor } from '@/lib/test-utils'
import AdminPage from '../page'
import { mockAdminStats, mockFetch, mockFetchError } from '@/lib/test-utils'
import { redirect } from 'next/navigation'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({
    user: { role: 'ADMIN', token: 'valid-token', refreshToken: 'valid-refresh-token' }
  }))
}))

describe('Admin Page', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockFetch(mockAdminStats)
  })

  describe('Authentication and Authorization', () => {
    it('should redirect to signin page when user is not authenticated', async () => {
      // Mock session to return null (unauthenticated)
      vi.mocked(require('next-auth').getServerSession).mockResolvedValueOnce(null)
      
      await AdminPage()
      expect(redirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should redirect to signin page when user is not an admin', async () => {
      // Mock session with non-admin role
      vi.mocked(require('next-auth').getServerSession).mockResolvedValueOnce({
        user: { role: 'USER', token: 'valid-token', refreshToken: 'valid-refresh-token' }
      })
      
      await AdminPage()
      expect(redirect).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Dashboard Content', () => {
    it('should render the admin dashboard heading', async () => {
      const { container } = render(await AdminPage())
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })

    it('should render all overview cards with correct stats', async () => {
      const { container } = render(await AdminPage())
      
      // Check total users card
      expect(screen.getByText('Total Users')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('50 active in last 30 days')).toBeInTheDocument()
      
      // Check total sarafs card
      expect(screen.getByText('Total Sarafs')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
      expect(screen.getByText('5 pending approval')).toBeInTheDocument()
      
      // Check total transactions card
      expect(screen.getByText('Total Transactions')).toBeInTheDocument()
      expect(screen.getByText('1,000')).toBeInTheDocument()
      expect(screen.getByText('10 pending')).toBeInTheDocument()
      
      // Check total volume card
      expect(screen.getByText('Total Volume')).toBeInTheDocument()
      expect(screen.getByText('$500,000')).toBeInTheDocument()
      expect(screen.getByText('Avg: $500/tx')).toBeInTheDocument()
    })

    it('should render system health component with correct metrics', async () => {
      const { container } = render(await AdminPage())
      
      expect(screen.getByText('System Health')).toBeInTheDocument()
      expect(screen.getByText('good')).toBeInTheDocument()
    })

    it('should render key metrics with correct calculations', async () => {
      const { container } = render(await AdminPage())
      
      expect(screen.getByText('Key Metrics')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument() // Conversion Rate
      expect(screen.getByText('50.00%')).toBeInTheDocument() // Active User Rate
    })
  })

  describe('Error Handling', () => {
    it('should display error message when stats fetch fails', async () => {
      mockFetchError('Failed to fetch stats')
      
      const { container } = render(await AdminPage())
      
      expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Failed to load admin statistics. Please try refreshing the page.')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should render all tab options', async () => {
      const { container } = render(await AdminPage())
      
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /reports/i })).toBeInTheDocument()
    })

    it('should show overview content by default', async () => {
      const { container } = render(await AdminPage())
      
      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Quick Actions', () => {
    it('should render quick actions component', async () => {
      const { container } = render(await AdminPage())
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })
  })
})