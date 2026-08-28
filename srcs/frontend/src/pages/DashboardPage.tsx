// =============================================================================
// DashboardPage.tsx : accueil personnel = agenda general + acces aux projets.
// C'est l'ecran qui justifie la signature : les taches de PLUSIEURS projets s'y
// melangent, et l'arete coloree permet de les distinguer instantanement.
// =============================================================================

// Composant de ligne de tache partage.
import TaskRow from '../components/TaskRow'
// Lien de navigation.
import { Link } from 'react-router-dom'

// Jours affiches dans le bandeau d'agenda (donnees de demonstration).
const days = [
  { label: 'lun 08', today: false },
  { label: 'mar 09', today: false },
  { label: 'mer 10', today: true },
  { label: 'jeu 11', today: false },
  { label: 'ven 12', today: false },
]

export default function DashboardPage() {
  return (
    <>
      <h1>Votre semaine</h1>

      {/* Bandeau des jours : filets verticaux et chiffres tabulaires (direction A).
          Le jour courant est marque de facon STRUCTURELLE, pas coloree. */}
      <div className="agenda-days">
        {days.map((d) => (
          <div key={d.label} className={'agenda-day' + (d.today ? ' is-today' : '')}>
            {d.label}
          </div>
        ))}
      </div>

      {/* [SEAM: AGENDA — Ai] Remplacer ces lignes de demonstration par les vraies
          taches issues de /api (tri par echeance, filtres, toggle mes taches). */}
      <TaskRow title="Rédiger le schéma Prisma" assignee="Nayel" due="mer 10:00" projectColor={1} label="Infrastructure" />
      <TaskRow title="Maquette page projet" assignee="Ai" due="mer 16:00" projectColor={3} label="Interface" />
      <TaskRow title="Relire la PR permissions" assignee="Am" due="aujourd'hui" projectColor={4} late />

      {/* Acces aux projets. */}
      <h2 style={{ marginTop: 'var(--space-6)' }}>Vos projets</h2>
      <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Chaque projet porte sa couleur d'identite, reprise dans ses taches. */}
        {[
          { id: 'infra', name: 'Infrastructure', color: 1 },
          { id: 'interface', name: 'Interface', color: 3 },
          { id: 'permissions', name: 'Permissions', color: 4 },
        ].map((p) => (
          <Link key={p.id} to={`/projets/${p.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            {/* Pastille de couleur : rappelle l'identite du projet. */}
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: `var(--project-${p.color})`, marginRight: 8,
            }} />
            <strong style={{ fontWeight: 500 }}>{p.name}</strong>
          </Link>
        ))}
      </div>
    </>
  )
}
