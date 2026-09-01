// =============================================================================
// App.tsx : la table de ROUTAGE de l'application.
// C'est le carrefour cote frontend, equivalent d'app.module.ts cote backend :
// chaque coequipier ajoute ici la route de ses ecrans.
//
// NOTE DE REPRISE : ce fichier avait ete remplace lors d'un merge par un banc de
// test mono-page. Le routage etait donc perdu et toutes les pages orphelines. La
// logique d'authentification de ce banc de test n'a PAS ete jetee : elle vit
// desormais dans auth/AuthContext.tsx, pages/LoginPage.tsx et pages/ProfilePage.tsx.
// =============================================================================

// Routes declare l'ensemble ; Route associe une URL a un composant.
import { Routes, Route } from 'react-router-dom'
// Ossature commune (en-tete + pied de page).
import AppShell from './components/AppShell'
// Garde de route pour les pages reservees aux utilisateurs connectes.
import RequireAuth from './auth/RequireAuth'
// Pages.
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
import ProjectPage from './pages/ProjectPage'
import ProjectCreatePage from './pages/ProjectCreatePage'
import TeamPage from './pages/TeamPage'
import ProfilePage from './pages/ProfilePage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Route parente sans chemin : toutes les pages heritent de l'ossature. */}
      <Route element={<AppShell />}>

        {/* --- Pages publiques --- */}
        {/* "index" = la route affichee pour "/". */}
        <Route index element={<HomePage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />

        {/* --- Pages protegees --- */}
        {/* RequireAuth n'a pas de chemin : il enveloppe les routes ci-dessous et
            redirige vers /connexion si personne n'est connecte. */}
        <Route element={<RequireAuth />}>
          <Route path="tableau-de-bord" element={<DashboardPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          {/* Route STATIQUE avant la route dynamique : sinon "/projets/nouveau"
              serait capture par ":projectId" et ouvrirait un projet nomme "nouveau". */}
          <Route path="projets/nouveau" element={<ProjectCreatePage />} />
          {/* ":projectId" est un segment dynamique, lu avec useParams(). */}
          <Route path="projets/:projectId" element={<ProjectPage />} />
          <Route path="equipe" element={<TeamPage />} />
          <Route path="profil" element={<ProfilePage />} />
        </Route>

        {/* "*" attrape toute URL non reconnue. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
