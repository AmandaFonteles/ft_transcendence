// =============================================================================
// EmptyState.tsx : ecran vide.
// Un etat vide est une INVITATION a agir, jamais une excuse. L'illustration
// optionnelle le fait lire comme un espace en attente, pas comme une panne.
// =============================================================================

import type { ReactNode } from 'react'
import EmptyIllustration from '../illustrations/EmptyIllustration'

interface EmptyStateProps {
  // Titre qui nomme l'espace (ex. "Aucun projet pour l'instant").
  title: string
  // Phrase d'explication courte.
  description?: string
  // Action proposee (un bouton ou un lien).
  action?: ReactNode
  // Motif de l'illustration ; "none" pour un etat vide compact sans dessin.
  illustration?: 'tasks' | 'projects' | 'search' | 'none'
}

export default function EmptyState({
  title, description, action, illustration = 'tasks',
}: EmptyStateProps) {
  return (
    // Bordure en tirets : signale une zone en attente de contenu.
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
