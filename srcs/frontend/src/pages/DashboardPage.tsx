// =============================================================================
// DashboardPage.tsx : accueil personnel = taches de la semaine + acces projets.
// C'est l'ecran qui justifie la signature visuelle : les taches de PLUSIEURS
// projets s'y melangent, et l'arete coloree les distingue instantanement.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrganizations, listTasks, updateTaskStatus } from '../api'
import type { Organization, Task, TaskStatus } from '../api'
import { useAuth } from '../auth/AuthContext'
import TaskRow from '../components/TaskRow'
import PageHeading from '../components/ui/PageHeading'
import ProjectDot from '../components/ui/ProjectDot'
import EmptyState from '../components/ui/EmptyState'
import SeamBlock from '../components/ui/SeamBlock'
import { colorForId } from '../lib/projectColors'
import { dayKey } from '../lib/dates'

export default function DashboardPage() {
  // Jeton necessaire a tous les appels proteges.
  const { accessToken } = useAuth()
  // Projets dont l'utilisateur est membre.
  const [orgs, setOrgs] = useState<Organization[]>([])
  // Toutes les taches, tous projets confondus.
  const [tasks, setTasks] = useState<Task[]>([])
  // Chargement en cours (evite d'afficher "aucun projet" pendant le fetch).
  const [loading, setLoading] = useState(true)
  // Message d'erreur eventuel.
  const [error, setError] = useState<string | null>(null)

  // Charge projets puis taches au montage.
  useEffect(() => {
    // Sans jeton on ne peut rien demander (ne devrait pas arriver : route protegee).
    if (!accessToken) return

    let cancelled = false

    async function load() {
      try {
        const organizations = await listOrganizations(accessToken!)
        if (cancelled) return
        setOrgs(organizations)

        // [CONCEPT: requetes en parallele] Les taches sont imbriquees sous un
        // projet : il faut donc un appel PAR projet. Promise.all les lance
        // simultanement au lieu d'attendre chaque reponse l'une apres l'autre —
        // avec 5 projets, on passe de 5 allers-retours successifs a un seul temps
        // d'attente.
        const perOrg = await Promise.all(
          organizations.map((o) => listTasks(accessToken!, o.id)),
        )
        if (cancelled) return
        // flat() aplatit le tableau de tableaux en une liste unique.
        setTasks(perOrg.flat())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // [CONCEPT: nettoyage d'effet] Si le composant est demonte avant la fin des
    // requetes, on ignore les reponses tardives : sans ce garde-fou, React
    // avertit qu'on met a jour l'etat d'un composant demonte.
    return () => { cancelled = true }
  }, [accessToken])

  // Change le statut d'une tache et met a jour la liste sur place.
  async function handleStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !accessToken) return
    try {
      const updated = await updateTaskStatus(accessToken, task.organizationId, taskId, status)
      // Remplace uniquement la tache concernee, sans recharger toute la liste.
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  // Retrouve le nom d'un projet a partir de son identifiant.
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? 'Projet'

  // Taches non terminees, triees par echeance : celles sans date passent en dernier.
  const upcoming = tasks
    .filter((t) => t.status !== 'DONE')
    .sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })

  // Les cinq jours ouvres a partir d'aujourd'hui, pour le bandeau d'agenda.
  const today = new Date()
  const days = Array.from({ length: 5 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i))

  if (loading) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading
        title="Votre semaine"
        subtitle={`${upcoming.length} tâche${upcoming.length > 1 ? 's' : ''} en cours · ${orgs.length} projet${orgs.length > 1 ? 's' : ''}`}
      />

      {error && <p className="text-danger mb-4">{error}</p>}

      {/* Bandeau des jours : filets verticaux et chiffres tabulaires. Le jour
          courant est marque de facon STRUCTURELLE (encre + trait), jamais par une
          couleur : les couleurs sont reservees a l'identite des projets. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 font-data text-[12.5px] tabular-nums text-ink-soft border-b border-rule mb-4">
        {days.map((d, i) => {
          // Nombre de taches echeant ce jour-la.
          const count = tasks.filter((t) => t.dueDate && dayKey(t.dueDate) === dayKey(d)).length
          return (
            <div
              key={d.toISOString()}
              className={`px-2 py-2 border-l border-rule first:border-l-0 ${
                i === 0 ? 'text-ink font-semibold shadow-[inset_0_-2px_0_var(--color-ink)]' : ''
              }`}
            >
              {d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
              {count > 0 && <span className="ml-1 text-ink">· {count}</span>}
            </div>
          )
        })}
      </div>

      {/* Liste des taches a venir, tous projets confondus. */}
      {upcoming.length === 0 ? (
        <EmptyState
          title="Aucune tâche en cours"
          description="Créez une tâche depuis la page d'un projet."
        />
      ) : (
        upcoming.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            projectColor={colorForId(t.organizationId)}
            projectName={orgName(t.organizationId)}
            onStatusChange={handleStatus}
          />
        ))
      )}

      <h2 className="text-xl font-semibold mt-8 mb-3">Vos projets</h2>
      {orgs.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Créez votre premier projet pour commencer à organiser des tâches."
          action={
            <Link to="/projets/nouveau" className="inline-flex items-center rounded-full bg-ink px-[18px] py-[9px] text-sm font-medium text-white no-underline hover:bg-action-hover">
              Créer un projet
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {orgs.map((o) => (
            <Link
              key={o.id}
              to={`/projets/${o.id}`}
              className="flex items-center gap-2 bg-surface border border-rule rounded-xl p-4 no-underline text-ink hover:border-ink-faint"
            >
              <ProjectDot color={colorForId(o.id)} label={o.name} />
              <span className="font-medium truncate">{o.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Module non encore livre : rendu visible dans l'interface elle-meme. */}
      <h2 className="text-xl font-semibold mt-8 mb-3">Notifications</h2>
      <SeamBlock owner="Module notifications · à attribuer">
        Rappels d'échéance, tâches à commencer ou à rendre, et alertes de projet.
        Aucune route backend n'existe encore pour ce module.
      </SeamBlock>
    </>
  )
}
