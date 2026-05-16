import { LucideIcon } from 'lucide-react'

interface PortalPageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  gradient?: string
  actions?: React.ReactNode
}

export function PortalPageHeader({
  icon: Icon,
  title,
  description,
  gradient = 'from-blue-500 via-cyan-500 to-teal-500',
  actions
}: PortalPageHeaderProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} text-white rounded-2xl p-8 shadow-xl mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">{title}</h1>
            {description && (
              <p className="text-white/90 text-sm">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
