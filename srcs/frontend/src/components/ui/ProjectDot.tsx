import { projectBg, type ProjectColor } from '../../lib/projectColors'

interface ProjectDotProps {
  color: ProjectColor
  // La couleur seule n'est pas une information accessible : le nom est lu par les
  // lecteurs d'ecran.
  label: string
}

export default function ProjectDot({ color, label }: ProjectDotProps) {
  return (
    <span
      className={`inline-block size-2.5 rounded-full ${projectBg[color]}`}
      role="img"
      aria-label={label}
    />
  )
}
