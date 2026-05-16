export interface Transaction {
  id: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  sarafName: string
  createdAt: string
  referenceCode: string
}

export interface AdminStats {
  totalUsers: number
  totalSarafs: number
  pendingSarafs: number
  totalTransactions: number
  pendingTransactions: number
  totalVolume: number
  systemHealth: 'good' | 'warning' | 'error'
  recentTransactions: Transaction[]
  activeUsers: number
  conversionRate: string
  avgTransactionValue: string
  lastUpdated: string
}