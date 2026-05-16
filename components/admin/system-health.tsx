import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

interface SystemHealthProps {
  status: 'good' | 'warning' | 'error'
  metrics: {
    pendingSarafs: number
    pendingTransactions: number
    activeUsers: number
    totalUsers: number
  }
}

export function SystemHealth({ status, metrics }: SystemHealthProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'good':
        return 'System is healthy'
      case 'warning':
        return 'System requires attention'
      case 'error':
        return 'System has critical issues'
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'good':
        return 'All systems are operating normally'
      case 'warning':
        return 'Some metrics require attention'
      case 'error':
        return 'Immediate action required'
    }
  }

  return (
    <div className="space-y-6">
      <Alert className={getStatusColor()}>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <AlertTitle>{getStatusTitle()}</AlertTitle>
        </div>
        <AlertDescription>{getStatusDescription()}</AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Pending Sarafs</span>
            <span className="text-sm text-muted-foreground">{metrics.pendingSarafs}</span>
          </div>
          <Progress value={metrics.pendingSarafs > 15 ? 100 : (metrics.pendingSarafs / 15) * 100} />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Pending Transactions</span>
            <span className="text-sm text-muted-foreground">{metrics.pendingTransactions}</span>
          </div>
          <Progress value={metrics.pendingTransactions > 50 ? 100 : (metrics.pendingTransactions / 50) * 100} />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Active Users</span>
            <span className="text-sm text-muted-foreground">
              {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={(metrics.activeUsers / metrics.totalUsers) * 100} />
        </div>
      </div>
    </div>
  )
}