// =============================================================================
// EmptyState.tsx : ecran vide.
// Un etat vide est une INVITATION a agir, jamais une excuse.
// =============================================================================

import type { ReactNode } from 'react'

interface EmptyStateProps {
  // Titre qui nomme l'espace (ex. "Aucun projet pour l'instant").
  title: string
  // Phrase d'explication courte.
  description?: string
  // Action proposee (un bouton ou un lien).
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    // Bordure en tirets : signale une zone en attente de contenu.
    <div className="text-center border border-dashed border-rule rounded-xl px-4 py-8">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && <p className="text-ink-soft mb-4">{description}</p>}
      {action}
    </div>
  )
}
