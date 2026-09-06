// =============================================================================
// DashboardPage.tsx : accueil personnel = vue SEMAINE + acces aux projets.
// C'est l'ecran qui justifie la signature visuelle : les taches de PLUSIEURS
// projets s'y melangent, et l'arete coloree les distingue instantanement.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrganizations, listTasks, updateTaskStatus } from '../api'
import type { Organization, Task, TaskStatus } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useTaskEventsForOrganizations } from '../realtime/useTaskEvents'
import TaskRow from '../components/TaskRow'
import TaskDetail from '../components/TaskDetail'
import PageHeading from '../components/ui/PageHeading'
import ProjectDot from '../components/ui/ProjectDot'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { colorForId } from '../lib/projectColors'
import { dayKey, hasStartedOn, isSameDay, weekGrid } from '../lib/dates'

export default function DashboardPage() {
  const { accessToken, user } = useAuth()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Tache ouverte dans le panneau de detail (null = aucun panneau).
  const [openTask, setOpenTask] = useState<Task | null>(null)

  // JOUR SELECTIONNE. Determine quelles taches sont considerees "commencees".
  // Le changer permet d'ANTICIPER : en avancant au jeudi, on voit ce qui sera
  // actif jeudi, sans attendre jeudi.
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  // Filtre "mes taches" / "toutes", meme principe que sur la page d'un projet
  // (voir ProjectPage) : le backend sait deja filtrer par projet (parametre
  // owned), on l'applique donc a chacun des appels ci-dessous.
  const [onlyMine, setOnlyMine] = useState(false)

  // [TEMPS REEL] Cette vue melange les taches de TOUS les projets de
  // l'utilisateur : on rejoint donc le salon de chacun (voir
  // useTaskEventsForOrganizations) pour recharger des qu'une tache change
  // n'importe ou, y compris depuis la page d'un projet ou par quelqu'un d'autre.
  const tasksRevision = useTaskEventsForOrganizations(
    orgs.map((o) => o.id),
    { userId: user?.id ?? '', displayName: user?.displayName ?? '' },
  )

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function load() {
      try {
        const organizations = await listOrganizations(accessToken!)
        if (cancelled) return
        setOrgs(organizations)
        // [CONCEPT: requetes en parallele] Les taches sont imbriquees sous un projet :
        // il faut un appel PAR projet. Promise.all les lance simultanement au lieu
        // d'attendre chaque reponse l'une apres l'autre.
        const perOrg = await Promise.all(
          // owned: true limite aux taches dont l'utilisateur est proprietaire.
          organizations.map((o) => listTasks(accessToken!, o.id, onlyMine ? { owned: true, unassigned: false } : undefined)),
        )
        if (cancelled) return
        setTasks(perOrg.flat())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Ignore les reponses tardives si le composant est demonte entre-temps.
    return () => { cancelled = true }
  }, [accessToken, tasksRevision, onlyMine])

  async function handleStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !accessToken) return
    try {
      const updated = await updateTaskStatus(accessToken, task.organizationId, taskId, status)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  // Applique une tache modifiee a la liste ET au panneau ouvert.
  function applyUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setOpenTask(updated)
  }

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? 'Projet'

  // [CHOIX] La semaine affichee est TOUJOURS la semaine courante : on ne peut plus
  // en changer. Le bandeau sert a anticiper les jours a venir DE CETTE SEMAINE, pas
  // a naviguer dans le calendrier — c'est le role de la page Agenda (vue mois).
  // weekGrid(new Date()) et non weekGrid(selectedDay) : selectionner un jour ne doit
  // pas faire glisser le bandeau.
  const week = useMemo(() => weekGrid(new Date()), [])

  // TACHES AFFICHEES : non terminees ET deja commencees au jour selectionne.
  // C'est la demande centrale de cette vue : ne pas noyer l'utilisateur sous des
  // taches qui ne le concernent pas encore.
  const visible = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'DONE' && hasStartedOn(t.startDate, selectedDay))
      .sort((a, b) => {
        // Sans echeance, la tache passe en fin de liste.
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
  }, [tasks, selectedDay])

  // Nombre de taches qui deviendront actives plus tard dans la semaine : donne
  // une raison concrete de naviguer entre les jours.
  const laterThisWeek = useMemo(() => {
    const lastDay = week[6]
    return tasks.filter(
      (t) => t.status !== 'DONE'
        && !hasStartedOn(t.startDate, selectedDay)
        && hasStartedOn(t.startDate, lastDay),
    ).length
  }, [tasks, selectedDay, week])

  const today = new Date()
  const isToday = isSameDay(selectedDay, today)

  if (loading) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading
        title="Ma semaine"
        subtitle={`${visible.length} tâche${visible.length > 1 ? 's' : ''} active${visible.length > 1 ? 's' : ''} · ${orgs.length} projet${orgs.length > 1 ? 's' : ''}`}
        actions={
          // Plus de navigation entre semaines : seul un retour rapide au jour
          // courant subsiste, et uniquement si l'utilisateur a selectionne un autre jour.
          !isToday
            ? <Button onClick={() => setSelectedDay(new Date())}>Revenir à aujourd'hui</Button>
            : undefined
        }
      />

      {error && <p className="text-danger mb-4">{error}</p>}

      {/* BANDEAU DE SEMAINE : chaque jour est SELECTIONNABLE. Filets verticaux et
          chiffres tabulaires reprennent la rigueur de la direction "Horaire". */}
      <div className="grid grid-cols-7 font-data text-[12px] tabular-nums border-b border-rule mb-1" role="tablist" aria-label="Jour de la semaine">
        {week.map((d) => {
          const selected = isSameDay(d, selectedDay)
          const isCurrentDay = isSameDay(d, today)
          // Nombre de taches echeant ce jour-la : information dense mais utile.
          const dueCount = tasks.filter(
            (t) => t.status !== 'DONE' && t.dueDate && dayKey(t.dueDate) === dayKey(d),
          ).length

          return (
            <button
              key={d.toISOString()}
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedDay(d)}
              className={`px-1 py-2 border-l border-rule first:border-l-0 cursor-pointer text-left transition-colors ${
                selected ? 'bg-sunk' : 'hover:bg-sunk/50'
              }`}
            >
              <span className={`block ${isCurrentDay ? 'text-ink font-semibold' : 'text-ink-soft'}`}>
                {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className={`block text-[15px] ${
                // Le JOUR COURANT est marque par une pastille d'encre : structurel,
                // jamais colore — les couleurs restent a l'identite des projets.
                isCurrentDay
                  ? 'inline-flex items-center justify-center size-6 rounded-full bg-ink text-white'
                  : selected ? 'text-ink font-semibold' : 'text-ink-soft'
              }`}>
                {d.getDate()}
              </span>
              {/* Point discret : au moins une echeance ce jour-la. */}
              {dueCount > 0 && (
                <span className="block mt-0.5 text-[10px] text-ink-faint">
                  {dueCount} éch.
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Rappel explicite du filtre applique : sans cette phrase, l'utilisateur
          pourrait croire que des taches ont disparu. La bascule "mes taches" est
          posee sur la meme ligne : les deux disent ce qui est filtre. */}
      <div className="flex items-center gap-3 mb-3">
        <p className="font-data text-[12.5px] text-ink-soft m-0">
          Tâches commencées au {selectedDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          {laterThisWeek > 0 && (
            <> · {laterThisWeek} autre{laterThisWeek > 1 ? 's' : ''} démarre{laterThisWeek > 1 ? 'nt' : ''} plus tard cette semaine</>
          )}
        </p>
        <label className="ml-auto shrink-0 flex items-center gap-2 text-[13.5px] text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="cursor-pointer"
          />
          Mes tâches uniquement
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Rien de commencé ce jour-là"
          description={
            laterThisWeek > 0
              ? 'Sélectionnez un jour plus tard dans la semaine pour voir les tâches à venir.'
              : onlyMine
                ? 'Aucune tâche ne vous appartient à cette date.'
                : 'Créez une tâche depuis la page d\'un projet.'
          }
          illustration="tasks"
        />
      ) : (
        visible.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            projectColor={colorForId(t.organizationId)}
            projectName={orgName(t.organizationId)}
            onStatusChange={handleStatus}
            onOpen={setOpenTask}
            referenceDay={selectedDay}
          />
        ))
      )}

      <h2 className="text-xl font-semibold mt-8 mb-3">Vos projets</h2>
      {orgs.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Créez votre premier projet pour commencer à organiser des tâches."
          illustration="projects"
          action={
            <Link to="/projets/nouveau" className="inline-flex items-center rounded-full bg-ink px-[18px] py-[9px] text-sm font-medium text-white no-underline hover:bg-action-hover">
              Créer un projet
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {orgs.map((o) => {
            // Compteur de taches actives par projet : rend la carte informative
            // plutot que decorative.
            const count = tasks.filter((t) => t.organizationId === o.id && t.status !== 'DONE').length
            return (
              <Link
                key={o.id}
                to={`/projets/${o.id}`}
                className="flex items-center gap-2 bg-surface border border-rule rounded-xl p-4 no-underline text-ink hover:border-ink-faint"
              >
                <ProjectDot color={colorForId(o.id)} label={o.name} />
                <span className="font-medium truncate flex-1">{o.name}</span>
                <span className="font-data text-[12px] text-ink-soft tabular-nums shrink-0">{count}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Panneau de detail, monte uniquement quand une tache est ouverte. */}
      {openTask && accessToken && (
        <TaskDetail
          task={openTask}
          accessToken={accessToken}
          onClose={() => setOpenTask(null)}
          onUpdated={applyUpdate}
          onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </>
  )
}
