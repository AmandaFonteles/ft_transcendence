// =============================================================================
// TaskRow.tsx : une ligne de tache, avec l'ARETE coloree du projet.
// Signature de la direction retenue : sur l'agenda general, ou se melangent les
// taches de plusieurs projets, la couleur dit instantanement a quel projet
// appartient chaque ligne.
// =============================================================================

import type { Task, TaskStatus } from '../api'
import { projectBg, type ProjectColor } from '../lib/projectColors'
import { formatDay, isOverdue } from '../lib/dates'
import { statusBadge, statusLabel, statusOrder } from '../lib/taskStatus'

interface TaskRowProps {
  // La tache telle que renvoyee par l'API.
  task: Task
  // Couleur d'identite du projet auquel elle appartient.
  projectColor: ProjectColor
  // Nom du projet, affiche seulement quand plusieurs projets se melangent.
  projectName?: string
  // Callback de changement de statut ; absent = statut non modifiable ici.
  onStatusChange?: (taskId: string, status: TaskStatus) => void
}

export default function TaskRow({ task, projectColor, projectName, onStatusChange }: TaskRowProps) {
  // Une tache terminee n'est jamais "en retard", meme si son echeance est passee.
  const late = task.status !== 'DONE' && isOverdue(task.dueDate)

  return (
    <article className="flex items-start gap-3 bg-surface border border-rule rounded-xl p-3 mb-2">
      {/* L'arete coloree. self-stretch l'etire sur toute la hauteur, shrink-0
          l'empeche d'etre comprimee par un titre long. */}
      <span className={`w-1 self-stretch shrink-0 rounded ${projectBg[projectColor]}`} />

      {/* min-w-0 autorise la troncature : sans lui, un mot tres long ferait
          deborder toute la ligne. */}
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-medium">{task.name}</div>
        {/* Metadonnees en police utilitaire et chiffres tabulaires : les dates
            s'alignent en colonne d'une ligne a l'autre. */}
        <div className="font-data text-[12.5px] text-ink-soft tabular-nums">
          {projectName && <>{projectName} · </>}
          échéance {formatDay(task.dueDate)}
        </div>
      </div>

      {/* Le retard prime sur l'affichage du statut. */}
      {late && <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-danger-bg text-danger">En retard</span>}

      {/* Selecteur de statut si l'appelant fournit un callback, sinon simple badge. */}
      {onStatusChange ? (
        <select
          value={task.status}
          // e.target.value est une chaine : on la retype vers l'union TaskStatus.
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${statusBadge[task.status]}`}
          // Libelle pour les lecteurs d'ecran : le select seul n'est pas explicite.
          aria-label={`Statut de ${task.name}`}
        >
          {statusOrder.map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      ) : (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[task.status]}`}>
          {statusLabel[task.status]}
        </span>
      )}
    </article>
  )
}
