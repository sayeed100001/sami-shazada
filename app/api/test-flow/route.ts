import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.contentItem.deleteMany({})
    
    const testContent = await prisma.contentItem.create({
      data: {
        title: 'تست فوری - ' + new Date().toLocaleString('fa-IR'),
        type: 'ANNOUNCEMENT',
        content: 'این محتوا باید فوراً در داشبورد نمایش داده شود!',
        position: 'DASHBOARD',
        isActive: true
      }
    })
    
    const allContent = await prisma.contentItem.findMany()
    const activeContent = await prisma.contentItem.findMany({ where: { isActive: true } })
    
    return NextResponse.json({
      status: 'success',
      message: 'Test content created and verified',
      created: testContent,
      verification: {
        total: allContent.length,
        active: activeContent.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
