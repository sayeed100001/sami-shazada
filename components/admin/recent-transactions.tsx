import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Transaction } from '@/types/admin'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="space-y-8">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {transaction.sarafName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {transaction.sarafName}
            </p>
            <p className="text-sm text-muted-foreground">
              {transaction.referenceCode}
            </p>
          </div>
          <div className="ml-auto font-medium">
            ${transaction.amount.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
}