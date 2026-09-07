import type { ReactNode } from 'react'

interface AvatarGroupProps {
  children: ReactNode
}

export default function AvatarGroup({ children }: AvatarGroupProps) {
  return (
    // Marge negative sur tous les enfants sauf le premier : ils se chevauchent,
    // mais le premier reste aligne sur le bord.
    <div className="flex items-center [&>*:not(:first-child)]:-ml-1.5">
      {children}
    </div>
  )
}
