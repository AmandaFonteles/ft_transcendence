// =============================================================================
// ProjectPage.tsx : page d'un projet = description, taches, membres, discussion.
// Le backend nomme "Organization" ce que l'interface appelle "projet".
// =============================================================================

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createTask, getOrganization, listTasks, updateTaskStatus } from '../api'
import type { Organization, Task, TaskStatus } from '../api'
import { useAuth } from '../auth/AuthContext'
import TaskRow from '../components/TaskRow'
import PageHeading from '../components/ui/PageHeading'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import EmptyState from '../components/ui/EmptyState'
import SeamBlock from '../components/ui/SeamBlock'
import ProjectDot from '../components/ui/ProjectDot'
import { colorForId } from '../lib/projectColors'

export default function ProjectPage() {
  // Identifiant du projet, extrait de l'URL /projets/:projectId.
  const { projectId } = useParams<{ projectId: string }>()
  const { accessToken } = useAuth()

  const [org, setOrg] = useState<Organization | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ouverture du formulaire de creation (la structure prevoit une pop-up ;
  // un panneau depliant remplit le meme role sans piege d'accessibilite).
  const [creating, setCreating] = useState(false)
  // Filtre "mes tâches" / "toutes" prevu par la structure.
  const [onlyMine, setOnlyMine] = useState(false)

  // Charge le projet et ses taches. Relance si le filtre change, car le backend
  // sait filtrer lui-meme (parametre owned).
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
  }, [accessToken, projectId, onlyMine])

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
      <PageHeading
        title={org.name}
        subtitle={`${tasks.length} tâche${tasks.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-3">
            <ProjectDot color={color} label={org.name} />
            <Button variant="primary" onClick={() => setCreating((v) => !v)}>
              {creating ? 'Annuler' : 'Créer une tâche'}
            </Button>
          </div>
        }
      />

      {/* Description optionnelle du projet (demandee dans la structure du 28/08). */}
      {org.description && <p className="text-ink-soft max-w-[62ch] mb-6">{org.description}</p>}

      {error && <p className="text-danger mb-4">{error}</p>}

      {/* Formulaire de creation, affiche a la demande. */}
      {creating && projectId && accessToken && (
        <TaskForm accessToken={accessToken} organizationId={projectId} onCreated={handleCreated} />
      )}

      <div className="flex items-center gap-3 mt-6 mb-3">
        <h2 className="text-xl font-semibold">Tâches</h2>
        {/* Bascule "mes tâches / toutes", prevue par la structure. */}
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
        />
      ) : (
        // max-h + overflow : la liste defile au lieu d'allonger la page a l'infini
        // (demande du 28/08 : "nombre de taches affichees, a faire defiler").
        <div className="max-h-[420px] overflow-y-auto pr-1">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} projectColor={color} onStatusChange={handleStatus} />
          ))}
        </div>
      )}

      {/* --- Modules non encore disponibles ---------------------------------- */}

      <h2 className="text-xl font-semibold mt-8 mb-3">Membres et rôles</h2>
      <SeamBlock owner="Module organisations · Ai">
        Le backend gère déjà les rôles (ADMIN / MEMBER), l'ajout, la promotion et
        l'exclusion de membres. Il manque une route de <em>lecture</em> :
        <code className="mx-1">GET /organizations/:id/members</code>. Dès qu'elle
        existera, cette section affichera les avatars, les rôles, le tag admin et
        les actions au clic sur un avatar.
      </SeamBlock>

      <h2 className="text-xl font-semibold mt-8 mb-3">Discussion</h2>
      <SeamBlock owner="Module chat · Qu">
        Fil de discussion du projet, avec onglets général et messages privés.
        La diffusion en direct passera par le gateway WebSocket déjà en place.
      </SeamBlock>

      <h2 className="text-xl font-semibold mt-8 mb-3">Fichiers</h2>
      <SeamBlock owner="Module fichiers · à attribuer">
        Documents liés au projet. Aucune route backend n'existe encore.
      </SeamBlock>
    </>
  )
}

// -----------------------------------------------------------------------------
// Formulaire de creation d'une tache : "quoi, quand, qui" (structure du projet).
// -----------------------------------------------------------------------------
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
        name,
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
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
        <TextField label="Description (optionnelle)" value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Création…' : 'Créer la tâche'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
