import { useEffect, useState } from 'react'
import {
  changePassword,
  confirmTwoFactor,
  disableTwoFactor,
  fetchAvatarPresets,
  login,
  logout,
  me,
  refresh,
  selectAvatar,
  setupTwoFactor,
  signup,
  updateProfile,
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
          onProfileChange={setUser}
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
  onAvatarChange,
  onProfileChange
}: {
  user: AuthUser
  accessToken: string
  onLogout: () => void
  onAvatarChange: (user: AuthUser) => void
  onProfileChange: (user: AuthUser) => void
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

      <hr />
      <ProfileForm user={user} accessToken={accessToken} onUpdated={onProfileChange} />

      <hr />
      <PasswordForm accessToken={accessToken} />

      <hr />
      <TwoFactorPanel accessToken={accessToken} />

      <hr />
      <button onClick={onLogout}>Se déconnecter</button>
    </section>
  )
}

// AJOUT : formulaire displayName/email.
function ProfileForm({
  user,
  accessToken,
  onUpdated
}: {
  user: AuthUser
  accessToken: string
  onUpdated: (user: AuthUser) => void
}) {
  const [email, setEmail] = useState(user.email)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const updated = await updateProfile(accessToken, { email, displayName })
      onUpdated(updated)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Modifier mon profil</h3>
      <div>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
      </div>
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
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {success && <p style={{ color: 'seagreen' }}>Profil mis à jour.</p>}
      <button type="submit" disabled={loading}>
        {loading ? '...' : 'Enregistrer'}
      </button>
    </form>
  )
}

// AJOUT : gere les 3 etats possibles - inactif / QR affiche en attente de
// confirmation / actif. Reste minimaliste : pas de recuperation d'etat "deja
// active" depuis le backend (AuthUser n'expose pas ce champ), donc l'etat
// repart a "inactif" a chaque rechargement de page. Suffisant pour tester.
function TwoFactorPanel({ accessToken }: { accessToken: string }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setError(null)
    try {
      const { qrCodeDataUrl } = await setupTwoFactor(accessToken)
      setQrCodeDataUrl(qrCodeDataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await confirmTwoFactor(accessToken, code)
      setEnabled(true)
      setQrCodeDataUrl(null)
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleDisable() {
    setError(null)
    try {
      await disableTwoFactor(accessToken)
      setEnabled(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  return (
    <div>
      <h3>Authentification à deux facteurs</h3>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {enabled ? (
        <>
          <p style={{ color: 'seagreen' }}>2FA activée.</p>
          <button onClick={handleDisable}>Désactiver la 2FA</button>
        </>
      ) : qrCodeDataUrl ? (
        <>
          <p>Scanne ce QR code avec ton app d'authentification :</p>
          <img src={qrCodeDataUrl} alt="QR code 2FA" width={200} height={200} />
          <form onSubmit={handleConfirm}>
            <label>
              Code affiché dans l'app
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </label>
            <button type="submit">Confirmer</button>
          </form>
        </>
      ) : (
        <button onClick={handleStart}>Activer la 2FA</button>
      )}
    </div>
  )
}

// AJOUT : formulaire changement de mot de passe.
function PasswordForm({ accessToken }: { accessToken: string }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await changePassword(accessToken, { currentPassword, newPassword })
      setSuccess(true)
      // Vide les champs apres succes : evite de laisser le mdp affiche/reenvoyable.
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      // Affiche notamment "compte OAuth, aucun mot de passe a modifier" (403)
      // ou "mot de passe actuel incorrect" (401), renvoyes tels quels par le backend.
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Changer mon mot de passe</h3>
      <div>
        <label>
          Mot de passe actuel
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Nouveau mot de passe
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {success && <p style={{ color: 'seagreen' }}>Mot de passe changé.</p>}
      <button type="submit" disabled={loading}>
        {loading ? '...' : 'Changer'}
      </button>
    </form>
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

// function AuthPanel({ onSuccess }: { onSuccess: (accessToken: string) => Promise<void> }) {
//   const [mode, setMode] = useState<'login' | 'signup'>('login')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [displayName, setDisplayName] = useState('')
//   const [totpCode, setTotpCode] = useState('')
//   const [needsTotp, setNeedsTotp] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [loading, setLoading] = useState(false)

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault()
//     setError(null)
//     setLoading(true)
//     try {
//       const { accessToken } =
//         mode === 'signup'
//           ? await signup({ email, password, displayName })
//           : await login({ email, password })
//       await onSuccess(accessToken)
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Erreur inconnue')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <section>
//       <h2>{mode === 'login' ? 'Connexion' : 'Inscription'}</h2>

//       <form onSubmit={handleSubmit}>
//         <div>
//           <label>
//             Email
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </label>
//         </div>

//         {mode === 'signup' && (
//           <div>
//             <label>
//               Nom affiché
//               <input
//                 type="text"
//                 value={displayName}
//                 onChange={(e) => setDisplayName(e.target.value)}
//                 required
//               />
//             </label>
//           </div>
//         )}

//         <div>
//           <label>
//             Mot de passe
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               minLength={8}
//               required
//             />
//           </label>
//         </div>

//         {error && <p className="status" style={{ color: 'crimson' }}>{error}</p>}

//         <button type="submit" disabled={loading}>
//           {loading ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
//         </button>
//       </form>

//       <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
//         {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
//       </button>

//       <hr />
//       <a href="/api/auth/42">
//         <button type="button">Se connecter avec 42</button>
//       </a>
//       <a href="/api/auth/github">
//         <button type="button">Se connecter avec GitHub</button>
//       </a>
//     </section>
//   )
// }

function AuthPanel({ onSuccess }: { onSuccess: (accessToken: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [totpCode, setTotpCode] = useState('')
  // AJOUT : bascule a true quand le backend repond "code 2FA requis".
  const [needsTotp, setNeedsTotp] = useState(false)
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
          : await login({ email, password, totpCode: needsTotp ? totpCode : undefined })
      await onSuccess(accessToken)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      // AJOUT : detecte ce message precis renvoye par le backend pour afficher
      // le champ code, sans jamais soumettre le formulaire vide entre-temps.
      if (message === 'code 2FA requis') {
        setNeedsTotp(true)
      }
      setError(message)
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

<<<<<<< HEAD
=======
        {/* AJOUT : n'apparait qu'apres le premier essai signalant "code 2FA requis". */}
        {needsTotp && (
          <div>
            <label>
              Code 2FA
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                maxLength={6}
                required
              />
            </label>
          </div>
        )}

>>>>>>> origin/Quentin
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
      <a href="/api/auth/github">
        <button type="button">Se connecter avec GitHub</button>
      </a>
    </section>
  )
}
