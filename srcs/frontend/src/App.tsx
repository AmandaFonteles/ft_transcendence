// Table de routage de l'application : chaque ecran est declare ici.

import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireAuth from './auth/RequireAuth'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
import ProjectPage from './pages/ProjectPage'
import ProjectCreatePage from './pages/ProjectCreatePage'
import FriendsPage from './pages/FriendsPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Route parente sans chemin : toutes les pages heritent de l'ossature. */}
      <Route element={<AppShell />}>

        {/* --- Pages publiques --- */}
        <Route index element={<HomePage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />
        <Route path="conditions" element={<TermsPage />} />

        {/* --- Pages protegees --- */}
        <Route element={<RequireAuth />}>
          <Route path="tableau-de-bord" element={<DashboardPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          {/* Route statique avant la route dynamique : sinon "/projets/nouveau"
              serait capture par ":projectId". */}
          <Route path="projets/nouveau" element={<ProjectCreatePage />} />
          <Route path="projets/:projectId" element={<ProjectPage />} />
          <Route path="amis" element={<FriendsPage />} />
          <Route path="profil" element={<ProfilePage />} />
          {/* Profil public d'un autre utilisateur : meme ordre statique/dynamique. */}
          <Route path="profil/:userId" element={<UserProfilePage />} />
        </Route>

        {/* Toute URL non reconnue. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
