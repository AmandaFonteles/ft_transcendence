import { useState } from 'react'
import { deleteTask, getTask, updateTask, updateTaskStatus } from '../api'
import type { Task, TaskStatus } from '../api'
import { useAuth } from '../auth/AuthContext'
import TaskAssignees from './TaskAssignees'
import Modal from './ui/Modal'
import Button from './ui/Button'
import TextField from './ui/TextField'
import TextArea from './ui/TextArea'
import { formatLongDate, toDateInput } from '../lib/dates'
import { statusBadge, statusLabel, statusOrder } from '../lib/taskStatus'
import { LIMITS } from '../lib/validation'

// Detail d'une tache, en deux modes dans un seul composant : lecture par defaut,
// edition a la demande. Ouvrir une tache sert le plus souvent a la consulter ;
// afficher d'emblee des champs de saisie exposerait a des changements accidentels.
interface TaskDetailProps {
  task: Task
  accessToken: string
  onClose: () => void
  onUpdated: (task: Task) => void
  onDeleted: (taskId: string) => void
  // Sert a savoir si la personne peut assigner n'importe qui. Optionnel : depuis
  // le tableau de bord, qui melange plusieurs projets, ce role est inconnu et on
  // retombe sur les seuls droits du proprietaire de la tache.
  isAdmin?: boolean
}

export default function TaskDetail({
  task, accessToken, onClose, onUpdated, onDeleted, isAdmin = false,
}: TaskDetailProps) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description ?? '')
  const [startDate, setStartDate] = useState(toDateInput(task.startDate))
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Confirmation en deux temps : la suppression est irreversible.
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateTask(accessToken, task.organizationId, task.id, {
        name,
        // Chaine vide -> null : le backend distingue "champ absent" de "vide".
        // Envoyer "" enregistrerait une description vide au lieu de l'effacer.
        description: description || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      })
      // PATCH ne renvoie que { message, taskId } : on relit la tache pour obtenir
      // ce qui a reellement ete enregistre, et non une reconstruction locale qui
      // divergerait si le backend normalise un champ.
      const fresh = await getTask(accessToken, task.organizationId, task.id)
      onUpdated(fresh)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(status: TaskStatus) {
    setError(null)
    try {
      onUpdated(await updateTaskStatus(accessToken, task.organizationId, task.id, status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleDelete() {
    setError(null)
    setSaving(true)
    try {
      await deleteTask(accessToken, task.organizationId, task.id)
      onDeleted(task.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
      setSaving(false)
    }
  }

  function cancelEdit() {
    setName(task.name)
    setDescription(task.description ?? '')
    setStartDate(toDateInput(task.startDate))
    setDueDate(toDateInput(task.dueDate))
    setEditing(false)
    setError(null)
  }

  return (
    <Modal title={editing ? 'Modifier la tâche' : task.name} onClose={onClose}>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {/* --- Mode edition --- */}
      {editing ? (
        <form onSubmit={handleSave} className="grid gap-3">
          <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.TASK_NAME_MAX} required />
          <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={LIMITS.TASK_DESCRIPTION_MAX} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <TextField label="Échéance" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit}>Annuler</Button>
          </div>
        </form>
      ) : (
        /* --- Mode lecture --- */
        <>
          {task.description ? (
            /* whitespace-pre-line preserve les retours a la ligne saisis, que le
               HTML replierait sinon en un seul paragraphe. */
            <p className="text-ink-soft whitespace-pre-line mb-4">{task.description}</p>
          ) : (
            <p className="text-ink-faint italic mb-4">Aucune description.</p>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-data text-[13px] mb-4">
            <dt className="text-ink-soft">▸ Début</dt>
            <dd className="tabular-nums">{formatLongDate(task.startDate)}</dd>
            <dt className="text-ink-soft">◆ Échéance</dt>
            <dd className="tabular-nums">{formatLongDate(task.dueDate)}</dd>
          </dl>

          {user && (
            <TaskAssignees
              accessToken={accessToken}
              organizationId={task.organizationId}
              taskId={task.id}
              ownerId={task.ownerId}
              currentUserId={user.id}
              isAdmin={isAdmin}
            />
          )}

          {/* Changement de statut direct, sans entrer en edition. */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[13.5px] text-ink-soft">Statut</span>
            {statusOrder.map((s) => (
              <button
                key={s}
                onClick={() => handleStatus(s)}
                aria-pressed={task.status === s}
                className={`rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  task.status === s ? statusBadge[s] : 'text-ink-soft hover:bg-sunk'
                }`}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-3 border-t border-rule">
            <Button variant="primary" onClick={() => setEditing(true)}>Modifier</Button>
            {/* Confirmation en deux temps : la suppression est irreversible. */}
            {confirmingDelete ? (
              <>
                <Button
                  onClick={handleDelete}
                  disabled={saving}
                  className="!bg-danger !text-white !border-transparent"
                >
                  Confirmer la suppression
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>Annuler</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>Supprimer</Button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
