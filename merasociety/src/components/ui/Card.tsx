import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
}

export function Card({
  children,
  header,
  footer,
  className,
  padding = true,
  onClick,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-200',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {header && (
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">
          {header}
        </div>
      )}
      <div className={cn(padding && 'p-5')}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  )
}

export default Card
