// =============================================================================
// LoginPage.tsx : page de connexion / inscription.
// Coquille visuelle uniquement : toute la logique appartient au module de Qu.
// =============================================================================

export default function LoginPage() {
  return (
    <>
      <h1>Se connecter</h1>

      {/* Carte de formulaire, largeur limitee pour la lisibilite. */}
      <div className="card" style={{ maxWidth: 420 }}>
        {/* [SEAM: AUTH — Qu] Remplacer par le vrai formulaire : validation,
            appel a /api/auth/login, gestion des erreurs, stockage du JWT. */}
        <div className="seam">
          <span className="seam-owner">Module auth · Qu</span>
          Formulaire de connexion, inscription et authentification Google.
          Le gabarit visuel ci-dessous est prêt à être branché.
        </div>

        {/* Apercu de la mise en forme attendue (champs desactives). */}
        <div style={{ marginTop: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
          <label style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            Adresse e-mail
            <input
              type="email"
              placeholder="nom@42.fr"
              disabled
              style={{
                width: '100%', marginTop: 4, padding: '9px 12px',
                border: '1px solid var(--rule)', borderRadius: 'var(--radius-field)',
                font: 'inherit', background: 'var(--surface-sunk)',
              }}
            />
          </label>
          <button className="btn btn-primary" disabled>Se connecter</button>
        </div>
      </div>
    </>
  )
}
