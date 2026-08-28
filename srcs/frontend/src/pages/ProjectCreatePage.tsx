// =============================================================================
// ProjectCreatePage.tsx : creation d'un projet (nom, membres, echeance).
// Coquille visuelle : la logique appartient au module d'Ai.
// =============================================================================

export default function ProjectCreatePage() {
  return (
    <>
      <h1>Créer un projet</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        {/* [SEAM: PROJETS — Ai] Formulaire reel : nom, membres depuis la liste
            d'amis, echeance, couleur d'identite du projet, puis POST /api/... */}
        <div className="seam">
          <span className="seam-owner">Module projets · Ai</span>
          Nom du projet, membres depuis la liste d'amis, échéance, et choix de la
          couleur d'identité qui suivra toutes ses tâches.
        </div>

        {/* Selecteur de couleur : montre le systeme d'identite en action. */}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 'var(--space-2)' }}>
            Couleur du projet
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {/* Les six couleurs d'identite definies dans les jetons. */}
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n}
                // aria-label rend chaque pastille comprehensible au lecteur d'ecran.
                aria-label={`Couleur ${n}`}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `var(--project-${n})`, display: 'inline-block',
                }} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
