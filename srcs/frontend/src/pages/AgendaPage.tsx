// =============================================================================
// AgendaPage.tsx : agenda en VUE MOIS (demande de la structure du 28/08).
// Les taches viennent de tous les projets ; la couleur de l'arete indique le
// projet d'origine, ce qui permet de lire un mois melange d'un coup d'oeil.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { listOrganizations, listTasks } from '../api'
import type { Organization, Task } from '../api'
import { useAuth } from '../auth/AuthContext'
import PageHeading from '../components/ui/PageHeading'
import Button from '../components/ui/Button'
import { colorForId, projectBg } from '../lib/projectColors'
import { dayKey, monthGrid } from '../lib/dates'

// Entetes de colonnes : la semaine commence le lundi (usage francais).
const weekdays = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']

export default function AgendaPage() {
  const { accessToken } = useAuth()
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

  // Charge projets et taches une seule fois : la navigation entre mois se fait
  // ensuite en memoire, sans rappeler l'API.
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false

    async function load() {
      try {
        const organizations = await listOrganizations(accessToken!)
        if (cancelled) return
        setOrgs(organizations)
        const perOrg = await Promise.all(organizations.map((o) => listTasks(accessToken!, o.id)))
        if (cancelled) return
        setTasks(perOrg.flat())
      } catch {
        // Silencieux : un agenda vide est preferable a un ecran d'erreur bloquant.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accessToken])

  // [CONCEPT: useMemo] Regroupe les taches par jour. Le calcul ne se refait que si
  // les taches ou le filtre changent, pas a chaque rendu (par exemple au survol).
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      // Une tache sans echeance n'apparait pas dans le calendrier.
      if (!t.dueDate) continue
      // Applique le filtre projet.
      if (filterOrg && t.organizationId !== filterOrg) continue
      const key = dayKey(t.dueDate)
      // Cree le tableau du jour s'il n'existe pas encore.
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return map
  }, [tasks, filterOrg])

  // Les 42 cases du mois affiche.
  const grid = monthGrid(cursor.year, cursor.month)
  // Cle du jour courant, pour le marquer.
  const todayKey = dayKey(new Date())
  // Libelle du mois, en francais.
  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

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
        // first-letter:uppercase : toLocaleDateString renvoie "mars 2026" en
        // minuscule ; on capitalise a l'affichage plutot qu'en manipulant la chaine.
        subtitle={monthLabel}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={prevMonth} aria-label="Mois précédent">←</Button>
            <Button onClick={nextMonth} aria-label="Mois suivant">→</Button>
          </div>
        }
      />

      {/* Filtre par projet : "l'agenda du projet uniquement" demande le 28/08. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilterOrg(null)}
          className={`rounded-full px-3 py-1 text-[13px] cursor-pointer border ${
            filterOrg === null ? 'bg-ink text-white border-transparent' : 'bg-surface text-ink-soft border-rule'
          }`}
        >
          Tous les projets
        </button>
        {orgs.map((o) => (
          <button
            key={o.id}
            onClick={() => setFilterOrg(o.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] cursor-pointer border ${
              filterOrg === o.id ? 'bg-ink text-white border-transparent' : 'bg-surface text-ink-soft border-rule'
            }`}
          >
            <span className={`inline-block size-2 rounded-full ${projectBg[colorForId(o.id)]}`} />
            {o.name}
          </button>
        ))}
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
          const dayTasks = byDay.get(key) ?? []
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
                isToday ? 'inline-flex items-center justify-center size-5 rounded-full bg-ink text-white' :
                outside ? 'text-ink-faint' : 'text-ink-soft'
              }`}>
                {d.getDate()}
              </div>

              {/* Jusqu'a trois taches affichees, puis un compteur. */}
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-1 mb-0.5">
                  <span className={`inline-block w-1 h-3 rounded shrink-0 ${projectBg[colorForId(t.organizationId)]}`} />
                  {/* truncate coupe proprement un nom trop long pour la cellule. */}
                  <span className={`text-[11px] truncate ${t.status === 'DONE' ? 'line-through text-ink-faint' : 'text-ink'}`}>
                    {t.name}
                  </span>
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div className="font-data text-[10.5px] text-ink-faint">+{dayTasks.length - 3}</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
