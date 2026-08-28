// =============================================================================
// SeamBlock.tsx : emplacement reserve au module d'un coequipier.
// Rend les points d'extension VISIBLES dans l'interface elle-meme : chacun voit
// immediatement ou poser son code, sans avoir a lire la documentation.
// =============================================================================

import type { ReactNode } from 'react'

interface SeamBlockProps {
  // Nom du module et proprietaire (ex. "Module chat · Qu").
  owner: string
  // Description de ce qui viendra ici.
  children: ReactNode
}

export default function SeamBlock({ owner, children }: SeamBlockProps) {
  return (
    <div className="bg-sunk border border-dashed border-ink-faint rounded-xl p-4 text-[13.5px] text-ink-soft">
      {/* Etiquette du proprietaire, en police utilitaire et petites capitales. */}
      <span className="block font-data text-[11.5px] uppercase tracking-wider text-ink-faint mb-1">
        {owner}
      </span>
      {children}
    </div>
  )
}
