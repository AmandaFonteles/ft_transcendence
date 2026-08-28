// =============================================================================
// TeamPage.tsx : gestion des utilisateurs (liste, recherche, amis, chat).
// La structure prevoit deux vues : utilisateur simple et administrateur.
// =============================================================================

export default function TeamPage() {
  return (
    <>
      <h1>Équipe</h1>

      {/* Barre de recherche prevue par la structure. */}
      <input
        type="search"
        placeholder="Rechercher une personne"
        style={{
          width: '100%', maxWidth: 380, padding: '9px 12px',
          border: '1px solid var(--rule)', borderRadius: 'var(--radius-field)',
          font: 'inherit', background: 'var(--surface)', marginBottom: 'var(--space-4)',
        }}
      />

      {/* [SEAM: UTILISATEURS — Qu] Liste reelle depuis GET /api/users, ajout d'amis,
          ouverture d'une conversation, et vue administrateur (tous les users, droits). */}
      <div className="seam">
        <span className="seam-owner">Module utilisateurs · Qu</span>
        Liste des personnes connues, ajout d'amis, ouverture d'un chat, et vue
        administrateur sur les droits et projets de chacun.
      </div>

      {/* Apercu de la mise en forme d'une ligne de personne. */}
      <div className="card" style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span className="avatar" style={{ ['--avatar-color' as string]: 'var(--project-2)' }}>QU</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>Qu</div>
          <div className="task-meta">Authentification et chat</div>
        </div>
        <button className="btn btn-secondary">Message</button>
      </div>
    </>
  )
}
