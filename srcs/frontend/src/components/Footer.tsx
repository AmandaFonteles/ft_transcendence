// =============================================================================
// Footer.tsx : pied de page FIXE, present sur toutes les pages.
// =============================================================================

// Lien de navigation cote client.
import { Link } from 'react-router-dom'

// Composant de pied de page.
export default function Footer() {
  return (
    <footer className="app-footer">
      {/* Liens legaux et de contact demandes dans la structure. */}
      <Link to="/contact">Contact</Link>
      <Link to="/confidentialite">Confidentialité et conditions</Link>
      {/* Pousse la mention a droite. */}
      <span className="spacer" />
      {/* Mention discrete de contexte. */}
      <span>42 · ft_transcendence</span>
    </footer>
  )
}
