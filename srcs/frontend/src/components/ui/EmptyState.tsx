import type { ReactNode } from 'react'
import EmptyIllustration from '../illustrations/EmptyIllustration'

// Etat vide : une invitation a agir, pas une panne. L'illustration optionnelle
// le fait lire comme un espace en attente.
interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  illustration?: 'tasks' | 'projects' | 'search' | 'none'
}

export default function EmptyState({
  title, description, action, illustration = 'tasks',
}: EmptyStateProps) {
  return (
    <div className="text-center border border-dashed border-rule rounded-xl px-4 py-8">
      {illustration !== 'none' && (
        <EmptyIllustration variant={illustration} className="w-[120px] h-[90px] mx-auto mb-2" />
      )}
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && <p className="text-ink-soft mb-4">{description}</p>}
      {action}
    </div>
  )
}
