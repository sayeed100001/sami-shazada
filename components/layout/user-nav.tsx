'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession, signOut, signIn } from 'next-auth/react'
import { User, LogOut, Settings, Shield } from 'lucide-react'
import Link from 'next/link'

export function UserNav() {
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: { label: 'مدیر', color: 'text-red-600' },
      SARAF: { label: 'صراف', color: 'text-blue-600' },
      USER: { label: 'کاربر', color: 'text-green-600' }
    }
    return badges[role as keyof typeof badges] || badges.USER
  }

  const roleBadge = getRoleBadge(session.user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="gradient-bg text-white">
              {getInitials(session.user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            <span className={`text-xs font-medium ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>پروفایل</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>تنظیمات</span>
          </Link>
        </DropdownMenuItem>
        
        {session.user.role === 'SARAF' && (
          <DropdownMenuItem asChild>
            <Link href="/portal" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>پورتال صراف</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        {session.user.role === 'ADMIN' && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>پنل مدیریت</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>خروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}