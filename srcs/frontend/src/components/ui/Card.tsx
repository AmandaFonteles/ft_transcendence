import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface border border-rule rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}
