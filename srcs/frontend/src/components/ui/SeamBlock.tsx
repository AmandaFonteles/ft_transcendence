import type { ReactNode } from 'react'

// Emplacement reserve au module d'un coequipier : rend les points d'extension
// visibles dans l'interface elle-meme.
interface SeamBlockProps {
  owner: string
  children: ReactNode
}

export default function SeamBlock({ owner, children }: SeamBlockProps) {
  return (
    <div className="bg-sunk border border-dashed border-ink-faint rounded-xl p-4 text-[13.5px] text-ink-soft">
      <span className="block font-data text-[11.5px] uppercase tracking-wider text-ink-faint mb-1">
        {owner}
      </span>
      {children}
    </div>
  )
}
