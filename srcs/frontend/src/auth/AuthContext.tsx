import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, me, refresh, setAccessTokenListener, signup as apiSignup } from '../api'
import type { AuthUser } from '../api'
import { closeSocket, setSocketAccessToken } from '../realtime/socket'

// Etat d'authentification partage par toute l'application.
// Le jeton d'acces reste en memoire (state React), jamais dans localStorage ; le
// jeton de rafraichissement est un cookie httpOnly que le JS ne peut pas lire.
// Contrepartie : un rechargement perd le jeton d'acces, d'ou le refresh() au
// demarrage qui le regenere silencieusement.
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
  login: (email: string, password: string, totpCode?: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

// Valeur initiale undefined : permet de detecter un composant utilise hors du
// Provider (voir le garde-fou dans useAuth).
const AuthContext = createContext<AuthState | undefined>(undefined)

// --- Fournisseur ------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Applique un jeton fraichement obtenu : le stocke puis charge l'utilisateur.
  const applyToken = useCallback(async (token: string) => {
    setAccessToken(token)
    // Depose le jeton dans le module socket AVANT toute ouverture de connexion
    // temps reel : c'est lui, et non un userId envoye par le client, qui prouve
    // l'identite au handshake (voir realtime.gateway.ts).
    setSocketAccessToken(token)
    const found = await me(token)
    setUser(found)
  }, [])

  useEffect(() => {
    // Le cookie httpOnly part tout seul avec la requete : s'il est encore valide,
    // l'utilisateur reste connecte apres un rechargement.
    refresh()
      .then(({ accessToken }) => applyToken(accessToken))
      // Echec normal quand personne n'est connecte : on reste anonyme.
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [applyToken])

  // api.ts renouvelle le jeton de lui-meme quand une requete revient en 401 : il
  // expire au bout de 15 minutes alors que le cookie de rafraichissement dure 7
  // jours. Reste a ramener le nouveau jeton ici, sans quoi les composants
  // continueraient a presenter l'ancien a chaque appel.
  useEffect(() => {
    setAccessTokenListener((token) => {
      if (token) {
        setAccessToken(token)
        // Le module socket rejoue ce jeton a chaque reconnexion : le laisser
        // perime condamnerait le temps reel des la premiere coupure reseau.
        setSocketAccessToken(token)
        return
      }
      // Renouvellement impossible : le cookie lui-meme est expire ou revoque. On
      // termine la session proprement plutot que de laisser l'interface
      // enchainer les messages d'erreur ; RequireAuth redirige vers /connexion.
      closeSocket()
      setAccessToken(null)
      setUser(null)
    })
    return () => setAccessTokenListener(null)
  }, [])

  useEffect(() => {
    // Retour d'un fournisseur OAuth : le backend redirige vers "/#oauth=<jeton>".
    const hash = window.location.hash
    if (!hash.startsWith('#oauth=')) return
    const token = hash.slice('#oauth='.length)
    // Efface le jeton de la barre d'adresse avant de s'en servir : il resterait
    // sinon visible, copiable et present dans l'historique.
    window.history.replaceState(null, '', window.location.pathname)
    applyToken(token).catch(() => {})
  }, [applyToken])

  // --- Actions --------------------------------------------------------------

  // Les erreurs remontent telles quelles : c'est la page de connexion qui sait les
  // afficher, notamment "code 2FA requis" qui declenche le champ dedie.
  const login = useCallback(
    async (email: string, password: string, totpCode?: string) => {
      const { accessToken } = await apiLogin({ email, password, totpCode })
      await applyToken(accessToken)
    },
    [applyToken],
  )

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { accessToken } = await apiSignup({ email, password, displayName })
      await applyToken(accessToken)
    },
    [applyToken],
  )

  const logout = useCallback(async () => {
    // Le catch evite qu'une erreur reseau bloque la deconnexion locale.
    await apiLogout().catch(() => {})
    // Fermer la socket AVANT de vider l'etat React : sinon le serveur ne recoit
    // jamais "disconnect", isOnline reste a true et les amis ne voient pas le
    // passage hors ligne.
    closeSocket()
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// --- Consommation -----------------------------------------------------------

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}
