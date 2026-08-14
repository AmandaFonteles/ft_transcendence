// [CONCEPT: composant React] Un composant est une fonction qui renvoie de l'UI (JSX).
// <App/> est toute notre page pour l'instant ; plus tard chacun ajoute ses composants.

// Importe deux "hooks" React : useState (etat) et useEffect (effets de bord).
import { useEffect, useState } from 'react'

// Exporte le composant racine par defaut.
export default function App() {
  // [CONCEPT: useState] Cree une variable d'etat suivie par React : quand elle change,
  // React re-affiche le composant. Ici elle stocke l'etat du backend, initial "checking...".
  const [apiStatus, setApiStatus] = useState('checking...')

  // [CONCEPT: useEffect] Execute un effet APRES le rendu. Le tableau vide [] signifie
  // "une seule fois, au premier affichage". On s'en sert pour appeler le backend.
  useEffect(() => {
    // Requete meme-origine : le navigateur est sur https://localhost et nginx route /api
    // vers le backend. Pourquoi c'est important : aucune config CORS necessaire, et cela
    // prouve toute la chaine navigateur -> nginx -> NestJS.
    fetch('/api/health')
      // Convertit la reponse HTTP en objet JavaScript (parse le JSON).
      .then((res) => res.json())
      // Met a jour l'etat avec le statut renvoye (ex. "ok"), ce qui re-affiche la page.
      .then((data) => setApiStatus(data.status))
      // En cas d'erreur reseau/proxy, affiche "unreachable" plutot que de planter.
      .catch(() => setApiStatus('unreachable'))
  }, [])

  // Renvoie la page d'index demandee : un titre, un corps, un indicateur backend.
  return (
    // Conteneur principal de la page (balise semantique <main>).
    <main className="page">
      {/* Titre de la page. */}
      <h1>ft_transcendence</h1>
      {/* Corps : phrase d'introduction. */}
      <p>
        Base Docker fonctionnelle — prête à recevoir les modules de l'équipe.
      </p>
      {/* Indicateur vivant : montre que le front atteint le back a travers nginx. */}
      <p className="status">
        Backend: <strong>{apiStatus}</strong>
      </p>
    </main>
  )
}
