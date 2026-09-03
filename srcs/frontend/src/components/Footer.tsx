// =============================================================================
// Footer.tsx : pied de page FIXE, present sur toutes les pages.
// =============================================================================

import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    // h-11 (44px) : hauteur reprise par le padding du contenu dans AppShell.
    <footer className="fixed bottom-0 inset-x-0 z-20 h-11 flex items-center gap-4 px-4 bg-surface border-t border-rule text-[13px] text-ink-soft">
      {/* Liens legaux et de contact, exiges dans le pied de page. */}
      <Link to="/contact" className="no-underline text-ink-soft hover:underline">Contact</Link>
      {/* La grille d'evaluation exige que les DEUX pages soient accessibles.
          Deux liens distincts plutot qu'un seul libelle fourre-tout. */}
      <Link to="/confidentialite" className="no-underline text-ink-soft hover:underline">
        Confidentialité
      </Link>
      <Link to="/conditions" className="no-underline text-ink-soft hover:underline">
        Conditions d'utilisation
      </Link>
      {/* Pousse la mention a droite. */}
      <span className="ml-auto">42 · Aqan</span>
    </footer>
  )
}
