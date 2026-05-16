'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, Search, Filter, Plus, Edit, Trash2, Eye, 
  CheckCircle, XCircle, Clock, Shield, User, Building 
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface UserData {
  id: string
  name: string
  email: string
  role: 'USER' | 'SARAF' | 'ADMIN'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BLOCKED'
  createdAt: string
  lastLogin?: string
  sarafStatus?: string
}

export function UserManagement() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      // Mock data for demo
      setUsers([
        {
          id: '1',
          name: 'احمد محمدی',
          email: 'ahmad@example.com',
          role: 'USER',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        {
          id: '2',
          name: 'صرافی کابل',
          email: 'kabul@saraf.com',
          role: 'SARAF',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          sarafStatus: 'PENDING'
        },
        {
          id: '3',
          name: 'مدیر سیستم',
          email: 'admin@system.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />مدیر</Badge>
      case 'SARAF':
        return <Badge variant="default"><Building className="h-3 w-3 mr-1" />صراف</Badge>
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />کاربر</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />فعال</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />در انتظار</Badge>
      case 'BLOCKED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />مسدود</Badge>
      default:
        return <Badge variant="secondary">غیرفعال</Badge>
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    const matchesStatus = filterStatus === 'ALL' || user.status === filterStatus
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to perform user action:', error)
    }
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="text-center p-8">دسترسی غیرمجاز</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              مدیریت کاربران
            </CardTitle>
            <CardDescription>مشاهده و مدیریت تمام کاربران سیستم</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            کاربر جدید
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام یا ایمیل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="ALL">همه نقشها</option>
            <option value="USER">کاربر</option>
            <option value="SARAF">صراف</option>
            <option value="ADMIN">مدیر</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="ALL">همه وضعیتها</option>
            <option value="ACTIVE">فعال</option>
            <option value="PENDING">در انتظار</option>
            <option value="BLOCKED">مسدود</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کاربر</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ عضویت</TableHead>
                <TableHead>آخرین ورود</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    در حال بارگذاری...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    کاربری یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString('fa-IR')
                        : 'هرگز'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.status === 'PENDING' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {user.status !== 'BLOCKED' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'block')}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-sm text-muted-foreground">کل کاربران</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'ACTIVE').length}
              </div>
              <div className="text-sm text-muted-foreground">فعال</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.status === 'PENDING').length}
              </div>
              <div className="text-sm text-muted-foreground">در انتظار</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.status === 'BLOCKED').length}
              </div>
              <div className="text-sm text-muted-foreground">مسدود</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}