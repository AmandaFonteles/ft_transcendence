// =============================================================================
// TaskDetail.tsx : detail d'une tache, consultable puis modifiable.
//
// Deux modes dans un seul composant : LECTURE par defaut, EDITION a la demande.
// Pourquoi pas un formulaire d'emblee : ouvrir une tache sert le plus souvent a
// la consulter. Afficher directement des champs de saisie donne l'impression que
// tout est en cours de modification, et expose a des changements accidentels.
// =============================================================================

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

interface TaskDetailProps {
  // Tache affichee.
  task: Task
  // Jeton d'acces pour les appels proteges.
  accessToken: string
  // Fermeture du panneau.
  onClose: () => void
  // Remonte la tache modifiee au parent, qui met sa liste a jour.
  onUpdated: (task: Task) => void
  // Remonte la suppression au parent.
  onDeleted: (taskId: string) => void
  // La personne connectee est-elle administratrice du projet ? Sert a savoir si
  // elle peut assigner n'importe qui. Optionnelle : depuis le tableau de bord,
  // qui melange plusieurs projets, on ne connait pas ce role — on retombe alors
  // sur les droits du proprietaire de la tache uniquement.
  isAdmin?: boolean
}

export default function TaskDetail({
  task, accessToken, onClose, onUpdated, onDeleted, isAdmin = false,
}: TaskDetailProps) {
  // Identifiant de la personne connectee : necessaire pour savoir ce qu'elle a
  // le droit de faire sur les assignations.
  const { user } = useAuth()
  // Bascule lecture / edition.
  const [editing, setEditing] = useState(false)
  // Champs du formulaire, initialises depuis la tache courante.
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description ?? '')
  const [startDate, setStartDate] = useState(toDateInput(task.startDate))
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Confirmation de suppression : deux temps, pour eviter un clic irreversible.
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Enregistre les modifications.
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
        // <input type="date"> donne "2026-03-12" ; le backend attend de l'ISO.
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      })
      // [IMPORTANT] PATCH /tasks/:id renvoie seulement { message, taskId }, pas la
      // tache. On la RELIT donc pour obtenir l'objet reellement enregistre — et non
      // une reconstruction locale, qui divergerait si le backend normalise un champ.
      const fresh = await getTask(accessToken, task.organizationId, task.id)
      onUpdated(fresh)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  // Change le statut sans passer par le mode edition.
  async function handleStatus(status: TaskStatus) {
    setError(null)
    try {
      onUpdated(await updateTaskStatus(accessToken, task.organizationId, task.id, status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  // Supprime definitivement la tache.
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

  // Annule l'edition et restaure les valeurs d'origine.
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

      {editing ? (
        // ---------------- MODE EDITION ----------------
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
        // ---------------- MODE LECTURE ----------------
        <>
          {task.description ? (
            // whitespace-pre-line preserve les retours a la ligne saisis par
            // l'utilisateur, que le HTML replierait sinon en un seul paragraphe.
            <p className="text-ink-soft whitespace-pre-line mb-4">{task.description}</p>
          ) : (
            <p className="text-ink-faint italic mb-4">Aucune description.</p>
          )}

          {/* Dates en toutes lettres : la place ne manque pas dans un detail. */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-data text-[13px] mb-4">
            <dt className="text-ink-soft">▸ Début</dt>
            <dd className="tabular-nums">{formatLongDate(task.startDate)}</dd>
            <dt className="text-ink-soft">◆ Échéance</dt>
            <dd className="tabular-nums">{formatLongDate(task.dueDate)}</dd>
          </dl>

          {/* Assignations : qui travaille sur cette tache, et actions associees. */}
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

          {/* Changement de statut direct, sans entrer en edition : c'est l'action
              la plus frequente sur une tache. */}
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
            {confirmingDelete ? (
              <>
                {/* Confirmation en deux temps : la suppression est irreversible. */}
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
