// =============================================================================
// HomePage.tsx : page d'accueil publique (presentation du projet).
// Affiche aussi l'etat des couches backend / base : preuve visible que la chaine
// navigateur -> nginx -> NestJS -> PostgreSQL fonctionne.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'

export default function HomePage() {
  // Statut renvoye par le backend.
  const [apiStatus, setApiStatus] = useState('vérification…')
  // Nombre d'utilisateurs en base (null tant qu'inconnu).
  const [users, setUsers] = useState<number | null>(null)

  // Appel unique au montage de la page.
  useEffect(() => {
    // Requete meme-origine : nginx route /api vers NestJS.
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => { setApiStatus(data.status); setUsers(data.users) })
      .catch(() => setApiStatus('injoignable'))
  }, [])

  return (
    <>
      <h1 className="text-[32px] font-semibold tracking-tight leading-tight mb-3">
        Organisez vos projets, ensemble
      </h1>
      {/* max-w-[52ch] limite la longueur de ligne : au-dela, la lecture fatigue. */}
      <p className="text-[17px] text-ink-soft max-w-[52ch] mb-6">
        Un agenda partagé, des projets, des tâches assignées et une discussion par
        équipe. Chaque projet a sa couleur : vous savez d'un coup d'œil à quoi
        appartient chaque tâche.
      </p>

      {/* Une seule action principale par ecran (regle de retenue). */}
      <div className="flex gap-2 mb-8">
        <Link
          to="/connexion"
          className="inline-flex items-center rounded-full bg-ink px-[18px] py-[9px] text-sm font-medium text-white no-underline hover:bg-action-hover"
        >
          Créer un compte
        </Link>
        <Link
          to="/tableau-de-bord"
          className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
        >
          Voir la démo
        </Link>
      </div>

      {/* Etat technique des couches, utile en developpement et en soutenance. */}
      <Card>
        <h2 className="text-base font-semibold mb-1">État du système</h2>
        <p className="font-data text-[13px] text-ink-soft tabular-nums m-0">
          Backend : <span className="font-medium text-ink">{apiStatus}</span>
          {users !== null && <> · Utilisateurs en base : <span className="font-medium text-ink">{users}</span></>}
        </p>
      </Card>
    </>
  )
}
