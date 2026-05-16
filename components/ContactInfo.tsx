'use client'

import { Mail, Phone, MapPin } from 'lucide-react'
import { useSystemConfig } from '@/hooks/useSystemConfig'

export function ContactInfo() {
  const { config } = useSystemConfig()

  return (
    <div className="space-y-3">
      {config.contact_email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <a href={`mailto:${config.contact_email}`} className="hover:underline">
            {config.contact_email}
          </a>
        </div>
      )}
      
      {config.contact_phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${config.contact_phone}`} className="hover:underline persian-numbers">
            {config.contact_phone}
          </a>
        </div>
      )}
      
      {config.address && (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{config.address}</span>
        </div>
      )}
    </div>
  )
}
