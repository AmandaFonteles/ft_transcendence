// =============================================================================
// TaskRow.tsx : une ligne de tache, avec l'ARETE coloree du projet.
// C'est la signature de la direction retenue : sur l'agenda general, ou se
// melangent les taches de plusieurs projets, la couleur dit instantanement
// a quel projet appartient chaque ligne.
// =============================================================================

// Table de classes (voir le piege du scan Tailwind dans lib/projectColors.ts).
import { projectBg, type ProjectColor } from '../lib/projectColors'
// Badge reutilisable.
import Badge from './ui/Badge'

export interface TaskRowProps {
  // Intitule de la tache.
  title: string
  // Personne responsable.
  assignee: string
  // Echeance deja formatee pour l'affichage.
  due: string
  // Couleur d'identite du projet auquel appartient la tache.
  projectColor: ProjectColor
  // Etiquette optionnelle (nom du projet).
  label?: string
  // Marque la tache comme en retard.
  late?: boolean
}

export default function TaskRow({ title, assignee, due, projectColor, label, late }: TaskRowProps) {
  return (
    <article className="flex items-start gap-3 bg-surface border border-rule rounded-xl p-3 mb-2">
      {/* L'arete coloree. self-stretch l'etire sur toute la hauteur de la carte,
          shrink-0 l'empeche d'etre comprimee par un titre long. */}
      <span className={`w-1 self-stretch shrink-0 rounded ${projectBg[projectColor]}`} />

      {/* Bloc central. min-w-0 autorise la troncature d'un titre trop long :
          sans lui, un mot interminable ferait deborder toute la ligne. */}
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium">{title}</div>
        {/* Metadonnees : police utilitaire et chiffres tabulaires, pour que les
            heures s'alignent en colonne d'une ligne a l'autre (rigueur "Horaire"). */}
        <div className="font-data text-[12.5px] text-ink-soft tabular-nums">
          {assignee} · {due}
        </div>
      </div>

      {/* Le retard prime sur l'etiquette de projet. */}
      {late ? <Badge tone="danger">En retard</Badge> : label ? <Badge>{label}</Badge> : null}
    </article>
  )
}
