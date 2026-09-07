import type { ReactNode } from 'react'

type Tone = 'neutral' | 'danger' | 'success'

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

// Le texte reprend toujours la teinte foncee de la meme famille que le fond :
// jamais du noir sur un fond colore.
const tones: Record<Tone, string> = {
  neutral: 'bg-sunk text-ink-soft',
  danger: 'bg-danger-bg text-danger',
  success: 'bg-success-bg text-success',
}

export default function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
