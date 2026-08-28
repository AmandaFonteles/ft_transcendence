// =============================================================================
// AvatarGroup.tsx : rangee d'avatars qui se chevauchent.
// Rend l'equipe visible en permanence (signature de la direction "Atelier").
// =============================================================================

import type { ReactNode } from 'react'

interface AvatarGroupProps {
  // Une suite de <Avatar/>.
  children: ReactNode
}

export default function AvatarGroup({ children }: AvatarGroupProps) {
  return (
    // [CONCEPT: selecteur d'enfants Tailwind] "[&>*:not(:first-child)]:-ml-1.5"
    // applique une marge negative a tous les enfants SAUF le premier : ils se
    // chevauchent, mais le premier reste aligne sur le bord.
    <div className="flex items-center [&>*:not(:first-child)]:-ml-1.5">
      {children}
    </div>
  )
}
