// =============================================================================
// LegalSection.tsx : bloc titre + contenu, pour les pages legales.
// Evite de repeter la meme structure de titres dans les deux pages et garantit
// une hierarchie typographique identique.
// =============================================================================

import type { ReactNode } from 'react'

interface LegalSectionProps {
  // Titre de la section.
  title: string
  // Contenu : paragraphes, listes, etc.
  children: ReactNode
}

export default function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {/* max-w-[68ch] : longueur de ligne lisible pour un texte long. */}
      <div className="text-ink-soft max-w-[68ch] space-y-2">{children}</div>
    </section>
  )
}
