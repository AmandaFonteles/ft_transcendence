// =============================================================================
// HomePage.tsx : page d'accueil publique (presentation du projet).
// Affiche aussi l'etat des couches backend / base : preuve visible que la chaine
// navigateur -> nginx -> NestJS -> PostgreSQL fonctionne.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import HeroIllustration from '../components/illustrations/HeroIllustration'

export default function HomePage() {
  const { user } = useAuth()
  const [apiStatus, setApiStatus] = useState('vérification…')
  const [users, setUsers] = useState<number | null>(null)

  // Route publique : pas de jeton necessaire.
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => { setApiStatus(data.status); setUsers(data.users) })
      .catch(() => setApiStatus('injoignable'))
  }, [])

  return (
    <>
      {/* Mise en page en deux colonnes des md : texte a gauche, illustration a
          droite. En dessous, l'illustration passe sous le texte plutot que de
          comprimer la colonne de lecture. */}
      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-center mb-8">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight leading-tight mb-3">
            Organisez vos projets, ensemble
          </h1>
          {/* max-w-[52ch] limite la longueur de ligne : au-dela, la lecture fatigue. */}
          <p className="text-[17px] text-ink-soft max-w-[52ch] mb-6">
            Un agenda partagé, des projets, des tâches assignées et une discussion par
            équipe. Chaque projet a sa couleur : vous savez d'un coup d'œil à quoi
            appartient chaque tâche.
          </p>

          {/* Une seule action principale par ecran ; elle depend de l'etat de session. */}
          <div className="flex gap-2">
            {user ? (
              <Link to="/tableau-de-bord" className="inline-flex items-center rounded-full bg-ink px-[18px] py-[9px] text-sm font-medium text-white no-underline hover:bg-action-hover">
                Ouvrir mon tableau de bord
              </Link>
            ) : (
              <>
                {/* state.mode : lu par LoginPage pour ouvrir directement le
                    formulaire d'inscription plutot que celui de connexion. */}
                <Link to="/connexion" state={{ mode: 'signup' }} className="inline-flex items-center rounded-full bg-ink px-[18px] py-[9px] text-sm font-medium text-white no-underline hover:bg-action-hover">
                  Créer un compte
                </Link>
                <Link to="/connexion" className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Illustration decorative : montre la metaphore du produit (un agenda dont
            les taches portent la couleur de leur projet) sans texte a traduire. */}
        <HeroIllustration className="w-full h-auto" />
      </div>

      {/* Trois arguments courts : rend la page moins vide sans la surcharger. */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        {[
          { title: 'Un agenda partagé', text: 'Vue semaine et vue mois, toutes équipes confondues.' },
          { title: 'Une couleur par projet', text: 'Chaque tâche porte la couleur du projet dont elle vient.' },
          { title: 'Des rôles clairs', text: 'Administrateurs et membres, avec des droits distincts.' },
        ].map((f) => (
          <Card key={f.title}>
            <h2 className="text-base font-semibold mb-1">{f.title}</h2>
            <p className="text-[13.5px] text-ink-soft m-0">{f.text}</p>
          </Card>
        ))}
      </div>

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
