// =============================================================================
// NotFoundPage.tsx : page affichee pour une URL inconnue.
// Un etat vide est une INVITATION a agir, pas une excuse.
// =============================================================================

import { Link } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Cette page n'existe pas"
      description="Le lien est peut-être obsolète."
      action={
        <Link
          to="/"
          className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
        >
          Retour à l'accueil
        </Link>
      }
    />
  )
}
