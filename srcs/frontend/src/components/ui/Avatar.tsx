// =============================================================================
// Avatar.tsx : pastille d'initiales, coloree par l'identite de projet.
// =============================================================================

// Table de classes et type des couleurs de projet.
import { projectBg, type ProjectColor } from '../../lib/projectColors'

interface AvatarProps {
  // Initiales affichees (2 caracteres en general).
  initials: string
  // Couleur d'identite associee a la personne ou au projet.
  color: ProjectColor
}

export default function Avatar({ initials, color }: AvatarProps) {
  return (
    <span
      // ring-2 ring-surface dessine un liseré blanc qui detache l'avatar du
      // precedent quand ils se chevauchent dans un AvatarGroup.
      className={`grid place-items-center size-7 rounded-full text-[11px] font-semibold text-white ring-2 ring-surface ${projectBg[color]}`}
    >
      {initials}
    </span>
  )
}
