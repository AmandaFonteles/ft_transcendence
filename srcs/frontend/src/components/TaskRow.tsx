import type { Task, TaskStatus } from '../api'
import { projectBg, type ProjectColor } from '../lib/projectColors'
import { formatDay, isOverdue, startsAfter } from '../lib/dates'
import { statusBadge, statusLabel, statusOrder } from '../lib/taskStatus'
import Badge from './ui/Badge'

// Une ligne de tache, avec l'arete coloree de son projet : sur un agenda ou se
// melangent plusieurs projets, la couleur dit instantanement lequel.
interface TaskRowProps {
  task: Task
  projectColor: ProjectColor
  projectName?: string
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onOpen?: (task: Task) => void
  referenceDay?: Date
}

export default function TaskRow({
  task, projectColor, projectName, onStatusChange, onOpen, referenceDay,
}: TaskRowProps) {
  const day = referenceDay ?? new Date()
  // Une tache terminee n'est jamais "en retard", meme echeance depassee.
  const late = task.status !== 'DONE' && isOverdue(task.dueDate)
  const upcoming = task.status !== 'DONE' && startsAfter(task.startDate, day)

  return (
    <article
      className={`flex items-start gap-3 bg-surface border border-rule rounded-xl p-3 mb-2 transition-colors ${
        onOpen ? 'cursor-pointer hover:border-ink-faint' : ''
      } ${
        // Une tache pas encore commencee est attenuee : lisible, mais elle ne
        // concurrence pas visuellement les taches actives.
        upcoming ? 'opacity-70' : ''
      }`}
      onClick={onOpen ? () => onOpen(task) : undefined}
      // Un <article> n'est ni focusable ni activable au clavier : role + tabIndex +
      // touche Entree lui rendent le comportement d'un bouton.
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter') onOpen(task) } : undefined}
    >
      {/* L'arete coloree : self-stretch l'etire sur toute la hauteur, shrink-0
          l'empeche d'etre comprimee par un titre long. */}
      <span className={`w-1 self-stretch shrink-0 rounded ${projectBg[projectColor]}`} />

      {/* min-w-0 autorise la troncature : sans lui, un mot tres long ferait
          deborder toute la ligne. */}
      <div className="flex-1 min-w-0">
        <div className={`text-[14.5px] font-medium ${task.status === 'DONE' ? 'line-through text-ink-soft' : ''}`}>
          {task.name}
        </div>

        {/* Chiffres tabulaires : les dates s'alignent d'une ligne a l'autre.
            "▸" marque le debut, "◆" l'echeance — distinguables sans lire le libelle. */}
        <div className="font-data text-[12.5px] text-ink-soft tabular-nums flex flex-wrap items-center gap-x-2">
          {projectName && <span>{projectName}</span>}

          {task.startDate && (
            <span className={upcoming ? 'text-ink-faint' : ''}>
              ▸ début {formatDay(task.startDate)}
            </span>
          )}

          {task.dueDate && (
            <span className={late ? 'text-danger font-medium' : ''}>
              ◆ échéance {formatDay(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Badges d'etat temporel, du plus urgent au moins urgent. */}
      {late && <Badge tone="danger" className="shrink-0">En retard</Badge>}
      {!late && upcoming && <Badge className="shrink-0">À venir</Badge>}

      {onStatusChange ? (
        <select
          value={task.status}
          // stopPropagation : sans lui, ouvrir le menu declencherait aussi le
          // onClick de la ligne et ouvrirait le detail par surprise.
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onStatusChange(task.id, e.target.value as TaskStatus) }}
          className={`rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer shrink-0 ${statusBadge[task.status]}`}
          aria-label={`Statut de ${task.name}`}
        >
          {statusOrder.map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      ) : (
        <Badge className={`shrink-0 ${statusBadge[task.status]}`}>{statusLabel[task.status]}</Badge>
      )}
    </article>
  )
}
