// =============================================================================
// TaskRow.tsx : une ligne de tache, avec l'ARETE coloree du projet.
// C'est la signature de la direction retenue : sur l'agenda general, ou se
// melangent les taches de plusieurs projets, la couleur dit instantanement
// a quel projet appartient chaque ligne.
// =============================================================================

// Forme des donnees attendues par le composant.
export interface TaskRowProps {
  // Intitule de la tache.
  title: string
  // Personne responsable.
  assignee: string
  // Echeance affichee (texte deja formate).
  due: string
  // Numero de couleur du projet, de 1 a 6 (voir tokens.css).
  projectColor: number
  // Etiquette optionnelle (ex. le nom du projet).
  label?: string
  // Marque la tache comme en retard.
  late?: boolean
}

// Composant de ligne.
export default function TaskRow({ title, assignee, due, projectColor, label, late }: TaskRowProps) {
  return (
    <article className="task">
      {/* L'arete : sa couleur est injectee en variable CSS locale, ce qui evite
          d'ecrire une couleur en dur et respecte le systeme de jetons. */}
      <span
        className="task-spine"
        style={{ ['--spine' as string]: `var(--project-${projectColor})` }}
      />

      {/* Bloc central : titre + metadonnees. flex:1 lui fait occuper l'espace libre. */}
      <div style={{ flex: 1 }}>
        <div className="task-title">{title}</div>
        {/* Metadonnees en police utilitaire, chiffres tabulaires (rigueur "Horaire"). */}
        <div className="task-meta">{assignee} · {due}</div>
      </div>

      {/* Badge de retard prioritaire, sinon etiquette de projet si fournie. */}
      {late ? (
        <span className="badge badge-danger">En retard</span>
      ) : label ? (
        <span className="badge" style={{ background: 'var(--surface-sunk)', color: 'var(--ink-soft)' }}>{label}</span>
      ) : null}
    </article>
  )
}
