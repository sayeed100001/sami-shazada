import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { AdminStats } from '@/types/admin'

interface OverviewProps {
  data: AdminStats
}

export function Overview({ data }: OverviewProps) {
  // Generate sample data for the chart
  // In production, this would come from historical data
  const chartData = [
    {
      name: '00:00',
      users: data.totalUsers * 0.7,
      transactions: data.totalTransactions * 0.6,
    },
    {
      name: '03:00',
      users: data.totalUsers * 0.75,
      transactions: data.totalTransactions * 0.65,
    },
    {
      name: '06:00',
      users: data.totalUsers * 0.8,
      transactions: data.totalTransactions * 0.7,
    },
    {
      name: '09:00',
      users: data.totalUsers * 0.85,
      transactions: data.totalTransactions * 0.75,
    },
    {
      name: '12:00',
      users: data.totalUsers * 0.9,
      transactions: data.totalTransactions * 0.8,
    },
    {
      name: '15:00',
      users: data.totalUsers * 0.95,
      transactions: data.totalTransactions * 0.85,
    },
    {
      name: '18:00',
      users: data.totalUsers,
      transactions: data.totalTransactions,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="users"
          stroke="#8884d8"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="transactions"
          stroke="#82ca9d"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}