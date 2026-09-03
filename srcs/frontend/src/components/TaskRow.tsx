// =============================================================================
// TaskRow.tsx : une ligne de tache, avec l'ARETE coloree du projet.
// Signature de la direction retenue : sur l'agenda general, ou se melangent les
// taches de plusieurs projets, la couleur dit instantanement a quel projet
// appartient chaque ligne.
// =============================================================================

import type { Task, TaskStatus } from '../api'
import { projectBg, type ProjectColor } from '../lib/projectColors'
import { formatDay, isOverdue, startsAfter } from '../lib/dates'
import { statusBadge, statusLabel, statusOrder } from '../lib/taskStatus'
import Badge from './ui/Badge'

interface TaskRowProps {
  // La tache telle que renvoyee par l'API.
  task: Task
  // Couleur d'identite du projet auquel elle appartient.
  projectColor: ProjectColor
  // Nom du projet, affiche seulement quand plusieurs projets se melangent.
  projectName?: string
  // Callback de changement de statut ; absent = statut non modifiable ici.
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  // Ouverture du detail au clic ; absent = ligne non cliquable.
  onOpen?: (task: Task) => void
  // Jour de reference pour juger si la tache a demarre. Aujourd'hui par defaut.
  referenceDay?: Date
}

export default function TaskRow({
  task, projectColor, projectName, onStatusChange, onOpen, referenceDay,
}: TaskRowProps) {
  // Jour servant de reference aux indicateurs temporels.
  const day = referenceDay ?? new Date()
  // Une tache terminee n'est jamais "en retard", meme si son echeance est passee.
  const late = task.status !== 'DONE' && isOverdue(task.dueDate)
  // Tache dont le debut est posterieur au jour de reference : pas encore active.
  const upcoming = task.status !== 'DONE' && startsAfter(task.startDate, day)

  return (
    <article
      className={`flex items-start gap-3 bg-surface border border-rule rounded-xl p-3 mb-2 transition-colors ${
        onOpen ? 'cursor-pointer hover:border-ink-faint' : ''
      } ${
        // Une tache pas encore commencee est attenuee : elle reste lisible mais
        // ne concurrence pas visuellement les taches actives.
        upcoming ? 'opacity-70' : ''
      }`}
      // Le clic ouvre le detail. On le pose sur l'article entier : toute la ligne
      // est cliquable, ce qui offre une cible large et previsible.
      onClick={onOpen ? () => onOpen(task) : undefined}
      // [CONCEPT: accessibilite d'un element rendu cliquable] Un <article> n'est
      // pas focusable ni activable au clavier. role + tabIndex + gestion de la
      // touche Entree lui rendent le comportement d'un bouton.
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => { if (e.key === 'Enter') onOpen(task) } : undefined}
    >
      {/* L'arete coloree. self-stretch l'etire sur toute la hauteur, shrink-0
          l'empeche d'etre comprimee par un titre long. */}
      <span className={`w-1 self-stretch shrink-0 rounded ${projectBg[projectColor]}`} />

      {/* min-w-0 autorise la troncature : sans lui, un mot tres long ferait
          deborder toute la ligne. */}
      <div className="flex-1 min-w-0">
        <div className={`text-[14.5px] font-medium ${task.status === 'DONE' ? 'line-through text-ink-soft' : ''}`}>
          {task.name}
        </div>

        {/* Metadonnees en police utilitaire et chiffres tabulaires : les dates
            s'alignent en colonne d'une ligne a l'autre. */}
        <div className="font-data text-[12.5px] text-ink-soft tabular-nums flex flex-wrap items-center gap-x-2">
          {projectName && <span>{projectName}</span>}

          {/* INDICATEUR DE DEBUT. Le triangle plein "▸" evoque un demarrage ; il
              complete l'indicateur d'echeance sans le concurrencer. */}
          {task.startDate && (
            <span className={upcoming ? 'text-ink-faint' : ''}>
              ▸ début {formatDay(task.startDate)}
            </span>
          )}

          {/* INDICATEUR D'ECHEANCE. Le losange "◆" la distingue du debut au
              premier coup d'oeil, meme sans lire le libelle. */}
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

      {/* Selecteur de statut si l'appelant fournit un callback, sinon simple badge. */}
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
