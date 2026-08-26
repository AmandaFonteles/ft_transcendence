// // =============================================================================
// // App.tsx : la table de ROUTAGE de l'application.
// // C'est le carrefour cote frontend, equivalent d'app.module.ts cote backend :
// // chaque coequipier ajoute ici la route de ses ecrans.
// // =============================================================================

// // Routes declare l'ensemble ; Route declare une correspondance URL -> composant.
// import { Routes, Route } from 'react-router-dom'
// // Ossature commune (en-tete + pied de page).
// import AppShell from './components/AppShell'
// // Pages.
// import HomePage from './pages/HomePage'
// import LoginPage from './pages/LoginPage'
// import DashboardPage from './pages/DashboardPage'
// import ProjectPage from './pages/ProjectPage'
// import ProjectCreatePage from './pages/ProjectCreatePage'
// import TeamPage from './pages/TeamPage'
// import ProfilePage from './pages/ProfilePage'
// import ContactPage from './pages/ContactPage'
// import PrivacyPage from './pages/PrivacyPage'
// import NotFoundPage from './pages/NotFoundPage'

// // Composant racine.
// export default function App() {
//   return (
//     <Routes>
//       {/* Route parente sans chemin : toutes les pages heritent de l'ossature. */}
//       <Route element={<AppShell />}>
//         {/* "index" = la route affichee pour "/". */}
//         <Route index element={<HomePage />} />
//         <Route path="connexion" element={<LoginPage />} />
//         <Route path="tableau-de-bord" element={<DashboardPage />} />
//         {/* Route STATIQUE avant la route dynamique : sinon "/projets/nouveau"
//             serait capture par ":projectId" et ouvrirait un projet nomme "nouveau". */}
//         <Route path="projets/nouveau" element={<ProjectCreatePage />} />
//         {/* ":projectId" est un segment dynamique, lu avec useParams(). */}
//         <Route path="projets/:projectId" element={<ProjectPage />} />
//         <Route path="equipe" element={<TeamPage />} />
//         <Route path="profil" element={<ProfilePage />} />
//         <Route path="contact" element={<ContactPage />} />
//         <Route path="confidentialite" element={<PrivacyPage />} />
//         {/* "*" attrape toute URL non reconnue. */}
//         <Route path="*" element={<NotFoundPage />} />
//       </Route>
//     </Routes>
import { useEffect, useState } from 'react'
import {
  fetchAvatarPresets,
  login,
  logout,
  me,
  refresh,
  selectAvatar,
  signup,
  type AuthUser
} from './api'

export default function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [usersCount, setUsersCount] = useState<number | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setApiStatus(data.status)
        setUsersCount(data.users)
      })
      .catch(() => setApiStatus('unreachable'))
  }, [])

  useEffect(() => {
    refresh()
      .then(({ accessToken }) => {
        setAccessToken(accessToken)
        return me(accessToken)
      })
      .then(setUser)
      .catch(() => {})
      .finally(() => setCheckingSession(false))
  }, [])

  // AJOUT : recuperation du token OAuth au retour de 42.
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#oauth=')) {
      const token = hash.slice('#oauth='.length)
      window.history.replaceState(null, '', window.location.pathname)
      handleAuthSuccess(token)
    }
  }, [])

  async function handleAuthSuccess(token: string) {
    setAccessToken(token)
    const found = await me(token)
    setUser(found)
  }

  async function handleLogout() {
    await logout().catch(() => {})
    setAccessToken(null)
    setUser(null)
  }

  return (
    <main className="page">
      <h1>ft_transcendence</h1>
      <p>Base Docker fonctionnelle — prête à recevoir les modules de l'équipe.</p>
      <p className="status">
        Backend: <strong>{apiStatus}</strong>
      </p>
      {usersCount !== null && (
        <p className="status">
          Utilisateurs en base: <strong>{usersCount}</strong>
        </p>
      )}

      <hr />

      {checkingSession ? (
        <p>Vérification de la session…</p>
      ) : user && accessToken ? (
        <AccountPanel
          user={user}
          accessToken={accessToken}
          onLogout={handleLogout}
          onAvatarChange={setUser}
        />
      ) : (
        <AuthPanel onSuccess={handleAuthSuccess} />
      )}
    </main>
  )
}

function AccountPanel({
  user,
  accessToken,
  onLogout,
  onAvatarChange
}: {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  onAvatarChange: (user: AuthUser) => void
}) {
  return (
    <section>
      <h2>Mon compte</h2>

      {user.avatarUrl && (
        <img src={user.avatarUrl} alt="avatar actuel" width={64} height={64} />
      )}

      <ul>
        <li>Username: <strong>{user.username}</strong></li>
        <li>Nom affiché: {user.displayName}</li>
        <li>Email: {user.email}</li>
      </ul>

      <AvatarPicker
        accessToken={accessToken}
        currentAvatarUrl={user.avatarUrl}
        onSelected={onAvatarChange}
      />

      <button onClick={onLogout}>Se déconnecter</button>
    </section>
  )
}

function AvatarPicker({
  accessToken,
  currentAvatarUrl,
  onSelected
}: {
  accessToken: string
  currentAvatarUrl: string | null
  onSelected: (user: AuthUser) => void
}) {
  const [presets, setPresets] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAvatarPresets()
      .then(setPresets)
      .catch(() => setError('impossible de charger les avatars'))
  }, [])

  async function handlePick(url: string) {
    setError(null)
    try {
      const updated = await selectAvatar(accessToken, url)
      onSelected(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  return (
    <div>
      <p>Choisis un avatar :</p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        {presets.map((url) => (
          <img
            key={url}
            src={url}
            alt="avatar"
            width={48}
            height={48}
            onClick={() => handlePick(url)}
            style={{
              cursor: 'pointer',
              borderRadius: '4px',
              border: url === currentAvatarUrl ? '2px solid dodgerblue' : '2px solid transparent'
            }}
          />
        ))}
      </div>
    </div>
  )
}

function AuthPanel({ onSuccess }: { onSuccess: (accessToken: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { accessToken } =
        mode === 'signup'
          ? await signup({ email, password, displayName })
          : await login({ email, password })
      await onSuccess(accessToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2>{mode === 'login' ? 'Connexion' : 'Inscription'}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>

        {mode === 'signup' && (
          <div>
            <label>
              Nom affiché
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          </div>
        )}

        <div>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
        </div>

        {error && <p className="status" style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
      </button>

      <hr />
      <a href="/api/auth/42">
        <button type="button">Se connecter avec 42</button>
      </a>
    </section>
  )
}