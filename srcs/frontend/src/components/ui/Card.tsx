// =============================================================================
// Card.tsx : conteneur de contenu, surface blanche sur fond avoine.
// =============================================================================

// ReactNode designe tout ce que React sait afficher (texte, elements, listes).
import type { ReactNode } from 'react'

// Props du composant.
interface CardProps {
  // Contenu place a l'interieur de la carte.
  children: ReactNode
  // Classes additionnelles pour ajuster la carte au cas par cas.
  className?: string
}

// Composant de carte.
export default function Card({ children, className = '' }: CardProps) {
  return (
    // rounded-xl = 12px, coherent avec la douceur de la direction "Atelier".
    <div className={`bg-surface border border-rule rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}
