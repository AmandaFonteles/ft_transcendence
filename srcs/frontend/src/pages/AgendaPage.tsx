// =============================================================================
// AgendaPage.tsx : agenda en VUE MOIS.
//
// Une tache apparait a sa DATE DE DEBUT et a son ECHEANCE, sous forme d'une
// pastille coloree par son projet. Les deux reperes se distinguent par leur
// marqueur : ▸ pour le debut, ◆ pour l'echeance — le meme langage visuel que les
// lignes de taches, pour qu'il n'y ait rien de nouveau a apprendre.
//
// Une tache dont les deux dates tombent le meme jour n'apparait qu'UNE fois, avec
// les deux marqueurs : la dupliquer dans la meme case n'apprendrait rien.
//
// Une tache SANS AUCUNE DATE est placee sur le jour courant : sans cela elle
// n'apparaissait nulle part dans l'agenda, donc restait invisible a qui travaille
// depuis cette page.
//
// Les taches TERMINEES ne sont plus affichees : l'agenda sert a voir ce qui reste
// a faire, pas a archiver ce qui est fait.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listOrganizations, listTasks } from '../api'
import type { Organization, Task } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useTaskEventsForOrganizations } from '../realtime/useTaskEvents'
import PageHeading from '../components/ui/PageHeading'
import Button from '../components/ui/Button'
import FilterChips from '../components/ui/FilterChips'
import type { FilterOption } from '../components/ui/FilterChips'
import { colorForId, projectBg } from '../lib/projectColors'
import { dayKey, monthGrid } from '../lib/dates'

// Entetes de colonnes : la semaine commence le lundi (usage francais).
const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

// Nombre d'entrees affichees par case avant de basculer sur un compteur.
// Au-dela, la cellule deviendrait illisible.
const MAX_PER_DAY = 3

// Ce qu'une entree de calendrier represente : le debut d'une tache, son echeance,
// ou les deux quand elles tombent le meme jour.
type EntryKind = 'start' | 'due' | 'both' | 'undated'

interface DayEntry {
  task: Task
  kind: EntryKind
}

// Marqueur affiche devant le nom. Repris tel quel des lignes de taches : ▸ evoque
// un demarrage, ◆ une echeance. Aucun nouveau symbole a apprendre.
const kindMarker: Record<EntryKind, string> = {
  start: '▸',
  due: '◆',
  both: '▸◆',
  // Cercle vide : ni debut ni echeance. Volontairement different des deux autres
  // marqueurs, pour ne pas laisser croire a une date qui n'existe pas.
  undated: '○',
}

// Libelle lu par les lecteurs d'ecran : un symbole seul n'est pas une information
// accessible.
const kindLabel: Record<EntryKind, string> = {
  start: 'début',
  due: 'échéance',
  both: 'début et échéance',
  undated: 'sans date',
}

// Ordre de tri dans une case : le debut avant l'echeance.
// Ordre de tri dans une case : le debut avant l'echeance. Les taches sans date
// passent en dernier : elles n'ont pas de rendez-vous ce jour-la, elles y sont
// juste rangees faute de mieux.
const kindOrder: Record<EntryKind, number> = { start: 0, both: 1, due: 2, undated: 3 }

export default function AgendaPage() {
  // L'utilisateur courant n'est plus necessaire ici : l'identite du handshake
  // socket vient du jeton verifie par le serveur, plus d'un objet passe au hook.
  const { accessToken } = useAuth()
  // Permet d'ouvrir la page d'un projet au clic sur une de ses taches.
  const navigate = useNavigate()

  const [orgs, setOrgs] = useState<Organization[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  // Mois affiche : on ne garde que l'annee et le mois.
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  // Filtre par projet ; null = tous les projets.
  const [filterOrg, setFilterOrg] = useState<string | null>(null)

  // [TEMPS REEL] Cette vue melange les taches de TOUS les projets de
  // l'utilisateur : on rejoint donc le salon de chacun (voir
  // useTaskEventsForOrganizations) pour recharger des qu'une tache change
  // n'importe ou, y compris depuis la page d'un projet ou par quelqu'un d'autre.
  const tasksRevision = useTaskEventsForOrganizations(orgs.map((o) => o.id))

  // Charge projets et taches (et les recharge sur evenement temps reel) ; la
  // navigation entre mois, elle, se fait ensuite en memoire sans rappeler l'API.
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function load() {
      try {
        const organizations = await listOrganizations(accessToken!)
        if (cancelled) return
        setOrgs(organizations)
        // Les taches sont imbriquees sous un projet : un appel par projet, lances
        // en parallele plutot que l'un apres l'autre.
        const perOrg = await Promise.all(organizations.map((o) => listTasks(accessToken!, o.id)))
        if (cancelled) return
        setTasks(perOrg.flat())
      } catch {
        // Silencieux : un agenda vide vaut mieux qu'un ecran d'erreur bloquant.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Ignore les reponses tardives si le composant est demonte entre-temps.
    return () => { cancelled = true }
  }, [accessToken, tasksRevision])

  // Options du filtre : "Tous" en tete, puis un projet par option avec sa pastille.
  const filterOptions: FilterOption[] = useMemo(() => [
    { value: null, label: 'Tous les projets' },
    ...orgs.map((o) => ({
      value: o.id,
      label: o.name,
      // La pastille rappelle la couleur d'identite du projet dans le filtre lui-meme.
      adornment: <span className={`inline-block size-2 rounded-full ${projectBg[colorForId(o.id)]}`} />,
    })),
  ], [orgs])

  // [CONCEPT: useMemo] Regroupe les taches par jour. Le calcul ne se refait que si
  // les taches ou le filtre changent, pas a chaque rendu.
  //
  // Une meme tache peut produire DEUX entrees : une a son debut, une a son
  // echeance. On les distingue par "kind" pour pouvoir afficher le bon marqueur.
  const byDay = useMemo(() => {
    const map = new Map<string, DayEntry[]>()

    // Ajoute une entree dans la case du jour donne.
    const push = (key: string, entry: DayEntry) => {
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
    }

    // Cle du jour courant, calculee une fois hors de la boucle.
    const todayKey = dayKey(new Date())

    for (const t of tasks) {
      // Applique le filtre projet.
      if (filterOrg && t.organizationId !== filterOrg) continue

      // Une tache TERMINEE ne figure plus dans l'agenda : celui-ci sert a voir ce
      // qui reste a faire. La garder encombrerait la grille sans rien apprendre.
      if (t.status === 'DONE') continue

      const startKey = t.startDate ? dayKey(t.startDate) : null
      const dueKey = t.dueDate ? dayKey(t.dueDate) : null

      // Aucune date : on la range sur le jour courant, sinon elle n'apparaitrait
      // nulle part et resterait invisible depuis l'agenda.
      if (!startKey && !dueKey) {
        push(todayKey, { task: t, kind: 'undated' })
        continue
      }

      // Debut et echeance le meme jour : une seule entree, deux marqueurs.
      // Sans ce cas, la tache apparaitrait deux fois dans la meme case.
      if (startKey && dueKey && startKey === dueKey) {
        push(startKey, { task: t, kind: 'both' })
        continue
      }
      if (startKey) push(startKey, { task: t, kind: 'start' })
      if (dueKey) push(dueKey, { task: t, kind: 'due' })
    }

    // Dans une case, le debut se lit avant l'echeance : c'est l'ordre du temps.
    for (const list of map.values()) {
      list.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
    }
    return map
  }, [tasks, filterOrg])

  // Les 42 cases du mois affiche (6 semaines de 7 jours).
  const grid = monthGrid(cursor.year, cursor.month)
  // Cle du jour courant, pour le marquer.
  const todayKey = dayKey(new Date())
  // Libelle du mois, en francais.
  const monthLabel = new Date(cursor.year, cursor.month)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Recule d'un mois (le constructeur Date gere le passage a l'annee precedente).
  const prevMonth = () => setCursor((c) => {
    const d = new Date(c.year, c.month - 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  // Avance d'un mois.
  const nextMonth = () => setCursor((c) => {
    const d = new Date(c.year, c.month + 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  if (loading) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading
        title="Agenda"
        subtitle={monthLabel}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={prevMonth} aria-label="Mois précédent">←</Button>
            <Button onClick={nextMonth} aria-label="Mois suivant">→</Button>
          </div>
        }
      />

      {/* FILTRE PAR PROJET. Composant dedie (FilterChips) et non des boutons
          arrondis : "Tous les projets" ressemblait a une action de creation. */}
      <div className="mb-4">
        <FilterChips
          label="Filtrer par projet"
          value={filterOrg}
          onChange={setFilterOrg}
          options={filterOptions}
        />
      </div>

      {/* Entetes des jours de la semaine. */}
      <div className="grid grid-cols-7 font-data text-[12px] text-ink-soft border-b border-rule">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-2 border-l border-rule first:border-l-0">{d}</div>
        ))}
      </div>

      {/* Grille du mois : 6 lignes de 7 jours. */}
      <div className="grid grid-cols-7 border-l border-rule">
        {grid.map((d) => {
          const key = dayKey(d)
          const dayEntries = byDay.get(key) ?? []
          // Les jours des mois voisins sont attenues pour rester lisibles sans
          // attirer l'attention.
          const outside = d.getMonth() !== cursor.month
          const isToday = key === todayKey

          return (
            <div
              key={key}
              className={`min-h-[92px] border-r border-b border-rule p-1.5 ${outside ? 'bg-sunk/40' : 'bg-surface'}`}
            >
              {/* Numero du jour. Le jour courant est marque en encre pleine —
                  structurel, jamais colore : les couleurs restent aux projets. */}
              <div className={`font-data text-[12px] tabular-nums mb-1 ${
                isToday
                  ? 'inline-flex items-center justify-center size-5 rounded-full bg-ink text-white'
                  : outside ? 'text-ink-faint' : 'text-ink-soft'
              }`}>
                {d.getDate()}
              </div>

              {/* Jusqu'a trois entrees affichees, puis un compteur. */}
              {dayEntries.slice(0, MAX_PER_DAY).map((e) => (
                // CLIC SUR UNE TACHE -> page de son projet. C'est le chemin le plus
                // court entre "je vois quelque chose dans l'agenda" et "j'agis dessus".
                <button
                  // La cle combine tache ET nature : une meme tache apparait a deux
                  // dates, deux entrees distinctes ne peuvent pas partager une cle.
                  key={`${e.task.id}-${e.kind}`}
                  onClick={() => navigate(`/projets/${e.task.organizationId}`)}
                  title={`${e.task.name} — ${kindLabel[e.kind]} — ouvrir le projet`}
                  className="flex items-center gap-1 mb-0.5 w-full text-left cursor-pointer rounded hover:bg-sunk px-0.5"
                >
                  <span className={`inline-block w-1 h-3 rounded shrink-0 ${projectBg[colorForId(e.task.organizationId)]}`} />
                  {/* Marqueur de nature. aria-hidden : le symbole est decoratif,
                      l'information est portee par le title du bouton. */}
                  <span className="font-data text-[9px] text-ink-faint shrink-0" aria-hidden="true">
                    {kindMarker[e.kind]}
                  </span>
                  {/* truncate coupe proprement un nom trop long pour la cellule. */}
                  {/* Plus de variante "terminee" ici : ces taches sont desormais
                      filtrees en amont, le style barre serait inatteignable. */}
                  <span className="text-[11px] truncate text-ink">
                    {e.task.name}
                  </span>
                </button>
              ))}
              {dayEntries.length > MAX_PER_DAY && (
                <div className="font-data text-[10.5px] text-ink-faint">
                  +{dayEntries.length - MAX_PER_DAY}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
