// =============================================================================
// App.tsx : la table de ROUTAGE de l'application.
// C'est le carrefour cote frontend, equivalent d'app.module.ts cote backend :
// chaque coequipier ajoute ici la route de ses ecrans.
// =============================================================================

// Routes declare l'ensemble ; Route declare une correspondance URL -> composant.
import { Routes, Route } from 'react-router-dom'
// Ossature commune (en-tete + pied de page).
import AppShell from './components/AppShell'
// Pages.
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import ProjectCreatePage from './pages/ProjectCreatePage'
import TeamPage from './pages/TeamPage'
import ProfilePage from './pages/ProfilePage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'

// Composant racine.
export default function App() {
  return (
    <Routes>
      {/* Route parente sans chemin : toutes les pages heritent de l'ossature. */}
      <Route element={<AppShell />}>
        {/* "index" = la route affichee pour "/". */}
        <Route index element={<HomePage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="tableau-de-bord" element={<DashboardPage />} />
        {/* Route STATIQUE avant la route dynamique : sinon "/projets/nouveau"
            serait capture par ":projectId" et ouvrirait un projet nomme "nouveau". */}
        <Route path="projets/nouveau" element={<ProjectCreatePage />} />
        {/* ":projectId" est un segment dynamique, lu avec useParams(). */}
        <Route path="projets/:projectId" element={<ProjectPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />
        {/* "*" attrape toute URL non reconnue. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
