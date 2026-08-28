// =============================================================================
// ProjectPage.tsx : page d'un projet = groupe, agenda, taches, discussion.
// Chaque bloc porte un marqueur [SEAM] indiquant a qui appartient le module.
// =============================================================================

// useParams lit le parametre dynamique de l'URL (/projets/:projectId).
import { useParams } from 'react-router-dom'
// Composant de ligne de tache partage.
import TaskRow from '../components/TaskRow'

export default function ProjectPage() {
  // Recupere l'identifiant du projet depuis l'URL.
  const { projectId } = useParams()

  return (
    <>
      {/* En-tete de projet : nom + equipe visible en permanence (signature B). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: 4 }}>{projectId ?? 'Projet'}</h1>
          <p className="task-meta" style={{ margin: 0 }}>4 membres · 3 tâches en cours</p>
        </div>

        {/* Avatars empiles : l'equipe est toujours visible. */}
        <div className="avatars">
          {[
            { initials: 'NY', color: 1 },
            { initials: 'QU', color: 2 },
            { initials: 'AI', color: 3 },
            { initials: 'AM', color: 4 },
          ].map((m) => (
            <span key={m.initials} className="avatar"
              style={{ ['--avatar-color' as string]: `var(--project-${m.color})` }}>
              {m.initials}
            </span>
          ))}
        </div>

        {/* Action principale unique de l'ecran. */}
        <button className="btn btn-primary">Créer une tâche</button>
      </div>

      {/* --- Taches --- */}
      <h2>Tâches</h2>
      {/* [SEAM: CARTES ET LISTES — Ai] Brancher ici les vraies cartes (drag and drop,
          position fractionnaire LexoRank) et le toggle "mes tâches / toutes". */}
      <TaskRow title="Rédiger le schéma Prisma" assignee="Nayel" due="mer 10:00" projectColor={1} />
      <TaskRow title="Configurer nginx WebSocket" assignee="Nayel" due="jeu 14:00" projectColor={1} />
      <TaskRow title="Relire la PR permissions" assignee="Am" due="aujourd'hui" projectColor={1} late />

      {/* --- Discussion --- */}
      <h2 style={{ marginTop: 'var(--space-6)' }}>Discussion</h2>
      <div className="seam">
        <span className="seam-owner">Module chat · Qu</span>
        Fil de discussion du projet, avec onglets général et messages privés.
        La diffusion en direct passera par le gateway WebSocket existant.
      </div>

      {/* --- Permissions --- */}
      <h2 style={{ marginTop: 'var(--space-6)' }}>Membres et rôles</h2>
      <div className="seam">
        <span className="seam-owner">Module permissions · Am</span>
        Gestion des rôles sur le projet et ajout de membres depuis la liste d'amis.
      </div>
    </>
  )
}
