// =============================================================================
// PageHeading.tsx : titre de page, avec sous-titre et actions optionnels.
// Garantit la meme hierarchie typographique sur tous les ecrans de l'equipe.
// =============================================================================

import type { ReactNode } from 'react'

interface PageHeadingProps {
  // Titre principal de la page.
  title: string
  // Ligne de contexte sous le titre.
  subtitle?: string
  // Actions alignees a droite (boutons, avatars).
  actions?: ReactNode
}

export default function PageHeading({ title, subtitle, actions }: PageHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex-1">
        {/* tracking-tight resserre legerement les grands titres. */}
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
        {/* Sous-titre en police utilitaire : chiffres alignes (dates, compteurs). */}
        {subtitle && <p className="font-data text-[13px] text-ink-soft tabular-nums mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
