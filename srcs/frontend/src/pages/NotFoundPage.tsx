// =============================================================================
// NotFoundPage.tsx : page affichee pour une URL inconnue.
// Un etat vide est une INVITATION a agir, pas une excuse.
// =============================================================================

// Lien de retour.
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="empty">
      <h2>Cette page n'existe pas</h2>
      <p>Le lien est peut-être obsolète.</p>
      <Link to="/" className="btn btn-secondary">Retour à l'accueil</Link>
    </div>
  )
}
