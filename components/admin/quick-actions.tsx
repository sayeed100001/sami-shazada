import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Building,
  BookOpen,
  TrendingUp,
  Settings,
  DollarSign,
  FileText,
  MoreHorizontal,
} from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      label: 'User Management',
      icon: Users,
      href: '/admin/users',
      description: 'Manage system users'
    },
    {
      label: 'Saraf Approval',
      icon: Building,
      href: '/admin/sarafs',
      description: 'Review and approve sarafs'
    },
    {
      label: 'Education',
      icon: BookOpen,
      href: '/admin/education',
      description: 'Manage courses and content'
    },
    {
      label: 'Promotions',
      icon: TrendingUp,
      href: '/admin/promotions',
      description: 'Premium saraf management'
    },
    {
      label: 'System Settings',
      icon: Settings,
      href: '/admin/settings',
      description: 'Configure system parameters'
    },
    {
      label: 'Transactions',
      icon: DollarSign,
      href: '/admin/transactions',
      description: 'Monitor transactions'
    },
    {
      label: 'Reports',
      icon: FileText,
      href: '/admin/reports',
      description: 'View system reports'
    }
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem key={action.href} asChild>
            <Link href={action.href} className="flex items-center">
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}