import { NextResponse } from 'next/server'

export function isDevAdminEndpointEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_ADMIN_ENDPOINTS === 'true'
}

export function devEndpointDisabledResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
