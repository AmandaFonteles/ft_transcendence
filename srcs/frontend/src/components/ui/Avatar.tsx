import { projectBg, type ProjectColor } from '../../lib/projectColors'

interface AvatarProps {
  initials: string
  color: ProjectColor
}

export default function Avatar({ initials, color }: AvatarProps) {
  return (
    <span
      // ring-2 ring-surface dessine un lisere qui detache l'avatar du precedent
      // quand ils se chevauchent dans un AvatarGroup.
      className={`grid place-items-center size-7 rounded-full text-[11px] font-semibold text-white ring-2 ring-surface ${projectBg[color]}`}
    >
      {initials}
    </span>
  )
}
