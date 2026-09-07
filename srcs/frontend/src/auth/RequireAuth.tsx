import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Garde de route : protege les pages reservees aux utilisateurs connectes.
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Sans ce garde-fou, un utilisateur deja connecte serait ejecte vers la page de
  // connexion pendant la fraction de seconde du refresh().
  if (loading) {
    return <p className="text-ink-soft">Vérification de la session…</p>
  }

  // "replace" evite d'empiler une entree d'historique vers une page protegee ;
  // "state" memorise la destination voulue pour y revenir apres connexion.
  if (!user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
