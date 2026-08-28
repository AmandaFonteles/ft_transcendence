// =============================================================================
// HomePage.tsx : page d'accueil publique (presentation du projet).
// Affiche aussi l'etat des couches backend / base : preuve visible que la
// chaine navigateur -> nginx -> NestJS -> PostgreSQL fonctionne.
// =============================================================================

// Hooks React.
import { useEffect, useState } from 'react'
// Lien de navigation cote client.
import { Link } from 'react-router-dom'

// Composant de page.
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
      <h1>Organisez vos projets, ensemble</h1>
      <p style={{ fontSize: 17, color: 'var(--ink-soft)', maxWidth: '52ch' }}>
        Un agenda partagé, des projets, des tâches assignées et une discussion par
        équipe. Chaque projet a sa couleur : vous savez d'un coup d'œil à quoi
        appartient chaque tâche.
      </p>

      {/* Une seule action principale par ecran (regle de retenue). */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <Link to="/connexion" className="btn btn-primary">Créer un compte</Link>
        <Link to="/tableau-de-bord" className="btn btn-secondary">Voir la démo</Link>
      </div>

      {/* Etat technique des couches, utile en developpement et en soutenance. */}
      <div className="card">
        <h3>État du système</h3>
        <p className="task-meta" style={{ margin: 0 }}>
          Backend : <strong>{apiStatus}</strong>
          {users !== null && <> · Utilisateurs en base : <strong>{users}</strong></>}
        </p>
      </div>
    </>
  )
}
