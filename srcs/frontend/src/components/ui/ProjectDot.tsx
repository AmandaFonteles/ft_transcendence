// =============================================================================
// ProjectDot.tsx : pastille de couleur identifiant un projet.
// =============================================================================

import { projectBg, type ProjectColor } from '../../lib/projectColors'

interface ProjectDotProps {
  // Couleur d'identite du projet.
  color: ProjectColor
  // Nom du projet, lu par les lecteurs d'ecran (la couleur seule n'est pas
  // une information accessible : un daltonien ou un non-voyant la perd).
  label: string
}

export default function ProjectDot({ color, label }: ProjectDotProps) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${projectBg[color]}`}
      // role="img" + aria-label rendent la pastille annoncable.
      role="img"
      aria-label={label}
    />
  )
}
