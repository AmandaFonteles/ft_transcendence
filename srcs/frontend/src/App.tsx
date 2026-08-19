// [CONCEPT: composant React] Page d'index : titre, corps, et un indicateur de la
// base (le nombre d'utilisateurs) pour VOIR la 4e couche fonctionner.

// Importe les hooks useState (etat) et useEffect (effet de bord).
import { useEffect, useState } from 'react'

// Composant racine.
export default function App() {
  // Etat pour le statut du backend (initial "checking...").
  const [apiStatus, setApiStatus] = useState('checking...')
  // Etat pour le nombre d'utilisateurs en base ; null tant qu'on ne l'a pas recu.
  // <number | null> type l'etat explicitement (nombre une fois charge, sinon null).
  const [users, setUsers] = useState<number | null>(null)

  // Effet lance une seule fois au montage ([] = pas de dependance).
  useEffect(() => {
    // Appel meme-origine ; nginx route /api vers le backend, qui interroge PostgreSQL.
    fetch('/api/health')
      // Parse la reponse JSON.
      .then((res) => res.json())
      // Met a jour les deux etats depuis la reponse (status + users).
      .then((data) => {
        // Statut renvoye par le backend (ex. "ok").
        setApiStatus(data.status)
        // Nombre d'utilisateurs lu depuis la base.
        setUsers(data.users)
      })
      // En cas d'echec reseau/proxy, affiche un statut d'erreur plutot que de planter.
      .catch(() => setApiStatus('unreachable'))
  }, [])

  // Rendu de la page.
  return (
    // Conteneur principal.
    <main className="page">
      {/* Titre. */}
      <h1>ft_transcendence</h1>
      {/* Corps. */}
      <p>
        Base Docker fonctionnelle — prête à recevoir les modules de l'équipe.
      </p>
      {/* Indicateur backend. */}
      <p className="status">
        Backend: <strong>{apiStatus}</strong>
      </p>
      {/* Indicateur base : n'affiche la ligne QUE si users a ete recu (!== null). */}
      {/* Pourquoi : prouve que le backend a lu une valeur reelle dans PostgreSQL. */}
      {users !== null && (
        <p className="status">
          Utilisateurs en base: <strong>{users}</strong>
        </p>
      )}
    </main>
  )
}
