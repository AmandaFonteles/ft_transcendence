// Page d'un projet : description, taches, membres, discussion.
// Le backend nomme "Organization" ce que l'interface appelle "projet".

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createTask, getOrganization, listOrganizationMembers, listTasks, updateTaskStatus } from '../api'
import type { Organization, Task, TaskStatus } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useTaskEvents } from '../realtime/useTaskEvents'
import TaskRow from '../components/TaskRow'
import TaskDetail from '../components/TaskDetail'
import MembersSection from '../components/MembersSection'
import ProjectSettings from '../components/ProjectSettings'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import EmptyState from '../components/ui/EmptyState'
import ProjectDot from '../components/ui/ProjectDot'
import { colorForId } from '../lib/projectColors'
import { LIMITS, isBlank } from '../lib/validation'
import ChatPanel from '../components/ChatPanel'
import FilesSection from '../components/FilesSection'

export default function ProjectPage() {
  // Identifiant du projet, extrait de l'URL /projets/:projectId.
  const { projectId } = useParams<{ projectId: string }>()
  const { accessToken, user } = useAuth()

  const [org, setOrg] = useState<Organization | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Un panneau depliant plutot qu'une pop-up : meme role, sans piege d'accessibilite.
  const [creating, setCreating] = useState(false)
  // Filtre "mes taches" / "toutes".
  const [onlyMine, setOnlyMine] = useState(false)
  // Tache ouverte dans le panneau de detail (null = aucun panneau).
  const [openTask, setOpenTask] = useState<Task | null>(null)
  // L'utilisateur courant est-il administrateur de CE projet ?
  const [iAmAdmin, setIAmAdmin] = useState(false)
  // Panneau de modification du projet ouvert ?
  const [editingProject, setEditingProject] = useState(false)
  // Incremente a la fermeture du panneau de modification, pour forcer
  // MembersSection a se remonter et relire les membres (l'admin a pu en
  // retirer depuis ce panneau, voir ProjectSettings).
  const [membersRefreshKey, setMembersRefreshKey] = useState(0)

  // S'abonne au salon du projet : le compteur change des qu'une tache est creee,
  // modifiee, supprimee ou (des)assignee, y compris par quelqu'un d'autre.
  const tasksRevision = useTaskEvents(projectId ?? '')

  // Charge le projet et ses taches. Relance si le filtre change, car le backend
  // sait filtrer lui-meme (parametre owned), ou si un evenement temps reel
  // signale qu'une tache a change ailleurs.
  useEffect(() => {
    if (!accessToken || !projectId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [organization, taskList] = await Promise.all([
          getOrganization(accessToken!, projectId!),
          // owned: true limite aux taches dont l'utilisateur est proprietaire.
          listTasks(accessToken!, projectId!, onlyMine ? { owned: true, unassigned: false } : undefined),
        ])
        if (cancelled) return
        setOrg(organization)
        setTasks(taskList)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accessToken, projectId, onlyMine, tasksRevision])

  // Hors du chargement principal, qui se relance a chaque changement de filtre
  // alors que le role, lui, ne bouge pas. Deux effets, deux rythmes.
  useEffect(() => {
    if (!accessToken || !projectId || !user) return
    let cancelled = false
    listOrganizationMembers(accessToken, projectId)
      .then((members) => {
        if (cancelled) return
        const me = members.find((m) => m.user.id === user.id)
        setIAmAdmin(me?.role === 'ADMIN')
      })
      // Echec silencieux : on retombe sur "pas administrateur", donc l'action de
      // modification n'est simplement pas proposee. Le backend reste de toute
      // facon le seul garant du droit.
      .catch(() => {})
    return () => { cancelled = true }
  }, [accessToken, projectId, user])

  // Change le statut d'une tache.
  async function handleStatus(taskId: string, status: TaskStatus) {
    if (!accessToken || !projectId) return
    try {
      const updated = await updateTaskStatus(accessToken, projectId, taskId, status)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  // Applique une tache modifiee a la liste ET au panneau ouvert, pour que le
  // detail reste synchronise avec ce qui vient d'etre enregistre.
  function applyUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setOpenTask(updated)
  }

  // Ajoute une tache creee au formulaire en tete de liste.
  function handleCreated(task: Task) {
    setTasks((prev) => [task, ...prev])
    setCreating(false)
  }

  if (loading) return <p className="text-ink-soft">Chargement…</p>
  if (!org) return <p className="text-danger">{error ?? 'Projet introuvable.'}</p>

  // Couleur d'identite, derivee de l'identifiant (voir lib/projectColors.ts).
  const color = colorForId(org.id)

  return (
    <>
      {/* En-tete du projet. Le NOM est cliquable pour les administrateurs : c'est
          l'endroit ou l'on s'attend a agir sur le projet lui-meme. Pour les
          membres non administrateurs, il reste un simple titre. */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          {iAmAdmin ? (
            <button
              onClick={() => setEditingProject(true)}
              title="Modifier le projet"
              // group : permet de reveler l'icone de modification au survol du
              // bouton entier, et pas seulement de l'icone elle-meme.
              className="group flex items-center gap-2 text-left cursor-pointer max-w-full"
            >
              <h1 className="text-[28px] font-semibold tracking-tight leading-tight truncate group-hover:text-link">
                {org.name}
              </h1>
              {/* Indice visuel discret : sans lui, rien ne signale que le titre
                  est cliquable. aria-hidden car le title du bouton porte deja
                  l'information pour les lecteurs d'ecran. */}
              <span className="text-ink-faint opacity-0 group-hover:opacity-100 shrink-0" aria-hidden="true">
                ✎
              </span>
            </button>
          ) : (
            <h1 className="text-[28px] font-semibold tracking-tight leading-tight truncate">
              {org.name}
            </h1>
          )}
          <p className="font-data text-[13px] text-ink-soft tabular-nums mt-0.5">
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ProjectDot color={color} label={org.name} />
          <Button variant="primary" onClick={() => setCreating((v) => !v)}>
            {creating ? 'Annuler' : 'Créer une tâche'}
          </Button>
        </div>
      </div>

      {/* Description optionnelle du projet. */}
      {org.description && <p className="text-ink-soft max-w-[62ch] mb-6">{org.description}</p>}

      {error && <p className="text-danger mb-4">{error}</p>}

      {/* Formulaire de creation, affiche a la demande. */}
      {creating && projectId && accessToken && (
        <TaskForm accessToken={accessToken} organizationId={projectId} onCreated={handleCreated} />
      )}

      <div className="flex items-center gap-3 mt-6 mb-3">
        <h2 className="text-xl font-semibold">Tâches</h2>
        {/* Bascule "mes taches" / "toutes". */}
        <label className="ml-auto flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="cursor-pointer"
          />
          Mes tâches uniquement
        </label>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Aucune tâche"
          description={onlyMine ? 'Aucune tâche ne vous appartient dans ce projet.' : 'Créez la première tâche du projet.'}
          illustration="tasks"
        />
      ) : (
        // max-h + overflow : la liste defile au lieu d'allonger la page a l'infini.
        <div className="max-h-[420px] overflow-y-auto pr-1">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} projectColor={color} onStatusChange={handleStatus} onOpen={setOpenTask} />
          ))}
        </div>
      )}

      {/* --- Membres et discussion --- */}

      <h2 className="text-xl font-semibold mt-8 mb-3">Membres et rôles</h2>
      {projectId && accessToken && (
        <MembersSection
          key={membersRefreshKey}
          organizationId={projectId}
          accessToken={accessToken}
          invitePolicy={org.invitePolicy}
        />
      )}

      <h2 className="text-xl font-semibold mt-8 mb-3">Discussion</h2>
      {projectId && <ChatPanel organizationId={projectId} />}

      <h2 className="text-xl font-semibold mt-8 mb-3">Fichiers</h2>
      {projectId && accessToken && (
        <FilesSection organizationId={projectId} accessToken={accessToken} />
      )}

      {/* Panneau de modification du projet, monte a la demande. */}
      {editingProject && accessToken && (
        <ProjectSettings
          organization={org}
          accessToken={accessToken}
          onClose={() => {
            setEditingProject(false)
            // Le panneau a pu retirer des membres : force MembersSection a se
            // remonter pour relire la liste a jour.
            setMembersRefreshKey((k) => k + 1)
          }}
          onUpdated={setOrg}
        />
      )}

      {/* Panneau de detail, monte uniquement quand une tache est ouverte. */}
      {openTask && accessToken && (
        <TaskDetail
          task={openTask}
          accessToken={accessToken}
          // On connait le role sur CE projet : on le transmet pour que le panneau
          // propose les actions d'assignation reservees aux administrateurs.
          isAdmin={iAmAdmin}
          onClose={() => setOpenTask(null)}
          onUpdated={applyUpdate}
          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </>
  )
}

// --- Formulaire de creation d'une tache -------------------------------------
function TaskForm({
  accessToken,
  organizationId,
  onCreated,
}: {
  accessToken: string
  organizationId: string
  onCreated: (task: Task) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  // Le backend assigne au createur par defaut ; on laisse le choix explicite.
  const [assignToSelf, setAssignToSelf] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    // Empeche le rechargement complet de la page par le navigateur.
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const task = await createTask(accessToken, organizationId, {
        // trim() : un nom fait d'espaces passerait "required" et serait refuse
        // par le backend. On envoie ce qui sera reellement enregistre.
        name: name.trim(),
        // Champs vides envoyes comme "non fournis" plutot que comme chaines vides :
        // le DTO backend les marque @IsOptional, une chaine vide echouerait.
        description: description || undefined,
        // <input type="date"> donne "2026-03-12" ; le backend attend une date ISO.
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assignToSelf,
      })
      onCreated(task)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="grid gap-3">
        <h3 className="text-base font-semibold">Nouvelle tâche</h3>
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.TASK_NAME_MAX} required />
        <TextField label="Description (optionnelle)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={LIMITS.TASK_DESCRIPTION_MAX} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField label="Échéance" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer">
          <input type="checkbox" checked={assignToSelf} onChange={(e) => setAssignToSelf(e.target.checked)} className="cursor-pointer" />
          M'assigner cette tâche
        </label>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div>
          <Button type="submit" variant="primary" disabled={saving || isBlank(name)}>
            {saving ? 'Création…' : 'Créer la tâche'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
