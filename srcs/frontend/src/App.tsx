// [CONCEPT: composant React] Page d'index : titre, corps, et etat des couches
// backend / base de donnees.

// Importe les hooks useState (etat) et useEffect (effet de bord).
import { useEffect, useState } from 'react'

// Composant racine.
export default function App() {
  // Statut du backend (initial "checking...").
  const [apiStatus, setApiStatus] = useState('checking...')
  // Nombre d'utilisateurs en base ; null tant qu'on ne l'a pas recu.
  const [users, setUsers] = useState<number | null>(null)

  // Effet lance une seule fois au montage ([] = aucune dependance).
  useEffect(() => {
    // Appel meme-origine ; nginx route /api vers le backend, qui interroge PostgreSQL.
    fetch('/api/health')
      // Parse la reponse JSON.
      .then((res) => res.json())
      // Met a jour les deux etats depuis la reponse.
      .then((data) => {
        setApiStatus(data.status)
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
      <p>Base Docker fonctionnelle — prête à recevoir les modules de l'équipe.</p>
      {/* Indicateur backend. */}
      <p className="status">
        Backend: <strong>{apiStatus}</strong>
      </p>
      {/* Indicateur base : affiche la ligne uniquement si la valeur a ete recue. */}
      {users !== null && (
        <p className="status">
          Utilisateurs en base: <strong>{users}</strong>
        </p>
      )}
      {/* La connexion temps reel n'est PAS ouverte ici : le gateway exige une identite
          authentifiee au handshake. C'est le module d'auth (Qu) qui la fournira, puis
          le tableau (Ai) appellera useBoardRealtime(boardId, identity). */}
    </main>
  )
}
