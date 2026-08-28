// =============================================================================
// DashboardPage.tsx : accueil personnel = agenda general + acces aux projets.
// C'est l'ecran qui justifie la signature : les taches de PLUSIEURS projets s'y
// melangent, et l'arete coloree permet de les distinguer instantanement.
// =============================================================================

import { Link } from 'react-router-dom'
import TaskRow from '../components/TaskRow'
import PageHeading from '../components/ui/PageHeading'
import ProjectDot from '../components/ui/ProjectDot'
import type { ProjectColor } from '../lib/projectColors'

// Jours du bandeau d'agenda (donnees de demonstration).
const days = [
  { label: 'lun 08', today: false },
  { label: 'mar 09', today: false },
  { label: 'mer 10', today: true },
  { label: 'jeu 11', today: false },
  { label: 'ven 12', today: false },
]

// Projets accessibles, avec leur couleur d'identite.
const projects: { id: string; name: string; color: ProjectColor }[] = [
  { id: 'infrastructure', name: 'Infrastructure', color: 1 },
  { id: 'interface', name: 'Interface', color: 3 },
  { id: 'permissions', name: 'Permissions', color: 4 },
]

export default function DashboardPage() {
  return (
    <>
      <PageHeading title="Votre semaine" subtitle="3 tâches · 1 en retard" />

      {/* Bandeau des jours : filets verticaux et chiffres tabulaires (direction
          "Horaire"). grid-cols-2 sur petit ecran, 5 colonnes des sm:. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 font-data text-[12.5px] tabular-nums text-ink-soft border-b border-rule mb-4">
        {days.map((d) => (
          <div
            key={d.label}
            // Le jour courant est marque de facon STRUCTURELLE (encre + trait
            // inferieur), jamais par une couleur : les couleurs sont reservees a
            // l'identite des projets, et en abuser les viderait de leur sens.
            className={`px-2 py-2 border-l border-rule first:border-l-0 ${
              d.today ? 'text-ink font-semibold shadow-[inset_0_-2px_0_var(--color-ink)]' : ''
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* [SEAM: AGENDA — Ai] Remplacer par les vraies taches issues de l'API
          (tri par echeance, filtres, bascule "mes taches / toutes"). */}
      <TaskRow title="Rédiger le schéma Prisma" assignee="Nayel" due="mer 10:00" projectColor={1} label="Infrastructure" />
      <TaskRow title="Maquette page projet" assignee="Ai" due="mer 16:00" projectColor={3} label="Interface" />
      <TaskRow title="Relire la PR permissions" assignee="Am" due="aujourd'hui" projectColor={4} late />

      <h2 className="text-xl font-semibold mt-8 mb-3">Vos projets</h2>
      {/* auto-fit + minmax : le nombre de colonnes s'adapte a la largeur. */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projets/${p.id}`}
            className="flex items-center gap-2 bg-surface border border-rule rounded-xl p-4 no-underline text-ink hover:border-ink-faint"
          >
            {/* La pastille rappelle l'identite du projet, reprise sur ses taches. */}
            <ProjectDot color={p.color} label={p.name} />
            <span className="font-medium">{p.name}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
