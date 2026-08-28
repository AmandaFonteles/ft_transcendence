// =============================================================================
// ProjectPage.tsx : page d'un projet = groupe, taches, discussion, roles.
// Chaque bloc porte un marqueur indiquant a qui appartient le module.
// =============================================================================

// useParams lit le parametre dynamique de l'URL (/projets/:projectId).
import { useParams } from 'react-router-dom'
import TaskRow from '../components/TaskRow'
import PageHeading from '../components/ui/PageHeading'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import AvatarGroup from '../components/ui/AvatarGroup'
import SeamBlock from '../components/ui/SeamBlock'
import type { ProjectColor } from '../lib/projectColors'

// Membres de l'equipe affiches dans l'en-tete du projet.
const members: { initials: string; color: ProjectColor }[] = [
  { initials: 'NY', color: 1 },
  { initials: 'QU', color: 2 },
  { initials: 'AI', color: 3 },
  { initials: 'AM', color: 4 },
]

export default function ProjectPage() {
  // Identifiant du projet, extrait de l'URL.
  const { projectId } = useParams()

  return (
    <>
      <PageHeading
        // Repli sur "Projet" si le parametre est absent.
        title={projectId ?? 'Projet'}
        subtitle="4 membres · 3 tâches en cours"
        actions={
          <div className="flex items-center gap-3">
            {/* L'equipe reste visible en permanence (signature "Atelier"). */}
            <AvatarGroup>
              {members.map((m) => (
                <Avatar key={m.initials} initials={m.initials} color={m.color} />
              ))}
            </AvatarGroup>
            {/* Action principale unique de l'ecran. */}
            <Button variant="primary">Créer une tâche</Button>
          </div>
        }
      />

      <h2 className="text-xl font-semibold mb-3">Tâches</h2>
      {/* [SEAM: CARTES ET LISTES — Ai] Brancher les vraies cartes (glisser-deposer,
          position fractionnaire LexoRank) et la bascule "mes taches / toutes". */}
      <TaskRow title="Rédiger le schéma Prisma" assignee="Nayel" due="mer 10:00" projectColor={1} />
      <TaskRow title="Configurer nginx WebSocket" assignee="Nayel" due="jeu 14:00" projectColor={1} />
      <TaskRow title="Relire la PR permissions" assignee="Am" due="aujourd'hui" projectColor={1} late />

      <h2 className="text-xl font-semibold mt-8 mb-3">Discussion</h2>
      <SeamBlock owner="Module chat · Qu">
        Fil de discussion du projet, avec onglets général et messages privés.
        La diffusion en direct passera par le gateway WebSocket existant.
      </SeamBlock>

      <h2 className="text-xl font-semibold mt-8 mb-3">Membres et rôles</h2>
      <SeamBlock owner="Module permissions · Am">
        Gestion des rôles sur le projet et ajout de membres depuis la liste d'amis.
      </SeamBlock>
    </>
  )
}
