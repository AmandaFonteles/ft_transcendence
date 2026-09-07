// Connexion, inscription et OAuth.

import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import { LIMITS } from '../lib/validation'

export default function LoginPage() {
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  // Destination memorisee par RequireAuth avant la redirection ; mode : demande
  // par HomePage pour ouvrir directement sur l'inscription (bouton "Créer un
  // compte"), sans quoi cette route s'ouvrait toujours en connexion.
  const location = useLocation() as { state?: { from?: string; mode?: 'login' | 'signup' } }

  const [mode, setMode] = useState<'login' | 'signup'>(location.state?.mode ?? 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [totpCode, setTotpCode] = useState('')
  // Passe a true quand le backend repond "code 2FA requis".
  const [needsTotp, setNeedsTotp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Deja connecte : inutile d'afficher le formulaire.
  // "replace" evite d'empiler une entree d'historique vers cette page.
  if (user) return <Navigate to={location.state?.from ?? '/tableau-de-bord'} replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signup(email, password, displayName)
      } else {
        // Le code 2FA n'est envoye que si le backend l'a reclame.
        await login(email, password, needsTotp ? totpCode : undefined)
      }
      navigate(location.state?.from ?? '/tableau-de-bord', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      // Message exact renvoye par le backend : il declenche l'affichage du champ.
      if (message === 'code 2FA requis') setNeedsTotp(true)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">
        {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
      </h1>

      <Card className="max-w-[420px]">
        <form onSubmit={handleSubmit} className="grid gap-3">
          {/* maxLength : les memes bornes que le backend (lib/validation.ts).
              Le navigateur empeche d'aller au-dela ; le serveur revalide. */}
          <TextField
            label="Adresse e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={LIMITS.EMAIL_MAX}
            required
          />

          {/* Le nom affiche n'est demande qu'a l'inscription. */}
          {mode === 'signup' && (
            <TextField
              label="Nom affiché"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={LIMITS.DISPLAY_NAME_MIN}
              maxLength={LIMITS.DISPLAY_NAME_MAX}
              required
            />
          )}

          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Memes bornes que le DTO backend : 8 caracteres minimum, et un
            // maximum, qui borne le cout du hachage argon2 cote serveur.
            minLength={LIMITS.PASSWORD_MIN}
            maxLength={LIMITS.PASSWORD_MAX}
            required
          />

          {/* N'apparait qu'apres un premier essai signalant "code 2FA requis". */}
          {needsTotp && (
            <TextField
              label="Code à deux facteurs"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              maxLength={6}
              required
            />
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </Button>
        </form>

        {/* Bascule entre les deux modes. */}
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="mt-3 text-[13.5px] text-link underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
        >
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>

        <div className="border-t border-rule my-4" />

        <p className="text-[13.5px] text-ink-soft mb-2">Ou continuer avec :</p>
        {/* Ces liens ne sont PAS des appels
            fetch : le navigateur doit quitter la page vers le fournisseur, qui
            redirige ensuite vers /#oauth=<jeton>, lu par AuthContext. Un fetch ne
            pourrait pas suivre cette redirection inter-domaines. */}
        <div className="flex gap-2">
          <a
            href="/api/auth/42"
            className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
          >
            42
          </a>
          <a
            href="/api/auth/github"
            className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
          >
            GitHub
          </a>
        </div>
      </Card>
    </>
  )
}
