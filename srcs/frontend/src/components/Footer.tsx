import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    // h-11 (44px) : hauteur reprise par le padding du contenu dans AppShell.
    <footer className="fixed bottom-0 inset-x-0 z-20 h-11 flex items-center gap-4 px-4 bg-surface border-t border-rule text-[13px] text-ink-soft">
      <Link to="/contact" className="no-underline text-ink-soft hover:underline">Contact</Link>
      <Link to="/confidentialite" className="no-underline text-ink-soft hover:underline">
        Confidentialité
      </Link>
      <Link to="/conditions" className="no-underline text-ink-soft hover:underline">
        Conditions d'utilisation
      </Link>
      <span className="ml-auto">42 · Aqan</span>
    </footer>
  )
}
