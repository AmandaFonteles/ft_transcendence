import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeading({ title, subtitle, actions }: PageHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex-1">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="font-data text-[13px] text-ink-soft tabular-nums mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
