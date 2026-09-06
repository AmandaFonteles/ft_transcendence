// =============================================================================
// AuthContext.tsx : l'etat d'authentification, partage par TOUTE l'application.
//
// POURQUOI CE FICHIER EXISTE : le jeton d'acces et l'utilisateur connecte vivaient
// dans l'etat local d'App.tsx. Consequence : aucune page ne pouvait y acceder, donc
// aucune page ne pouvait appeler une route protegee. En le remontant dans un
// contexte React, n'importe quel composant peut faire useAuth() sans qu'on ait a
// faire descendre les donnees de parent en enfant sur cinq niveaux.
//
// SECURITE : le jeton d'acces reste EN MEMOIRE (state React), jamais dans
// localStorage. Le jeton de rafraichissement, lui, est un cookie httpOnly pose par
// le backend : le JavaScript ne peut pas le lire. C'est la conception de Qu, on la
// respecte. Contrepartie assumee : un rechargement de page perd le jeton d'acces,
// d'ou l'appel a refresh() au demarrage pour le regenerer silencieusement.
// =============================================================================

// Hooks et types React necessaires au contexte.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
// Fonctions d'API ecrites par Qu (auth) que ce contexte orchestre.
import { login as apiLogin, logout as apiLogout, me, refresh, signup as apiSignup } from '../api'
import type { AuthUser } from '../api'
import { closeSocket, setSocketAccessToken } from '../realtime/socket' // AJOUT

// Ce que le contexte expose a l'application.
interface AuthState {
  // Utilisateur connecte, ou null si personne ne l'est.
  user: AuthUser | null
  // Jeton d'acces courant, necessaire a tout appel de route protegee.
  accessToken: string | null
  // Vrai tant qu'on verifie la session au demarrage : evite d'afficher
  // brievement "non connecte" a quelqu'un qui l'est en realite.
  loading: boolean
  // Connexion par email/mot de passe (avec code 2FA si le backend le reclame).
  login: (email: string, password: string, totpCode?: string) => Promise<void>
  // Inscription.
  signup: (email: string, password: string, displayName: string) => Promise<void>
  // Deconnexion.
  logout: () => Promise<void>
  // Remplace l'utilisateur en memoire apres une modification de profil.
  setUser: (user: AuthUser) => void
}

// [CONCEPT: contexte React] createContext cree un "canal" de donnees.
// La valeur initiale est undefined : elle permet de detecter un composant utilise
// hors du Provider (voir le garde-fou dans useAuth plus bas).
const AuthContext = createContext<AuthState | undefined>(undefined)

// Fournisseur : enveloppe l'application et alimente le canal.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Utilisateur connecte.
  const [user, setUser] = useState<AuthUser | null>(null)
  // Jeton d'acces (en memoire uniquement).
  const [accessToken, setAccessToken] = useState<string | null>(null)
  // Verification de session en cours.
  const [loading, setLoading] = useState(true)

  // Applique un jeton fraichement obtenu : le stocke puis charge l'utilisateur.
  // useCallback fige l'identite de la fonction entre les rendus, ce qui evite de
  // relancer inutilement les effets qui en dependent.
  const applyToken = useCallback(async (token: string) => {
    setAccessToken(token)
    // [SECURITE] Depose le jeton dans le module socket AVANT toute ouverture de
    // connexion temps reel : c'est lui, et non un userId envoye par le client,
    // qui prouve l'identite au handshake (voir realtime.gateway.ts).
    // Ordre important : AppShell n'appelle getSocket() qu'une fois "user" pose,
    // donc a la ligne suivante — le jeton est deja en place a ce moment.
    setSocketAccessToken(token)
    const found = await me(token)
    setUser(found)
  }, [])

  // Au premier montage : tente de restaurer la session.
  useEffect(() => {
    // [CONCEPT: rafraichissement silencieux] Le cookie httpOnly part tout seul avec
    // la requete (credentials: 'include' dans api.ts). S'il est encore valide, le
    // backend renvoie un nouveau jeton d'acces : l'utilisateur reste connecte apres
    // un rechargement, sans avoir a ressaisir son mot de passe.
    refresh()
      .then(({ accessToken }) => applyToken(accessToken))
      // Echec normal quand personne n'est connecte : on reste simplement anonyme.
      .catch(() => {})
      // Dans tous les cas la verification est terminee.
      .finally(() => setLoading(false))
  }, [applyToken])

  // Retour depuis un fournisseur OAuth (42, GitHub).
  useEffect(() => {
    // Le backend redirige vers "/#oauth=<jeton>" : on lit le fragment d'URL.
    const hash = window.location.hash
    if (!hash.startsWith('#oauth=')) return
    const token = hash.slice('#oauth='.length)
    // Efface le jeton de la barre d'adresse AVANT de s'en servir.
    // Pourquoi : il resterait sinon visible, copiable et present dans l'historique.
    window.history.replaceState(null, '', window.location.pathname)
    applyToken(token).catch(() => {})
  }, [applyToken])

  // Connexion classique. Les erreurs remontent telles quelles a l'appelant :
  // c'est la page de connexion qui sait comment les afficher (notamment
  // "code 2FA requis", qui declenche l'affichage du champ dedie).
  const login = useCallback(
    async (email: string, password: string, totpCode?: string) => {
      const { accessToken } = await apiLogin({ email, password, totpCode })
      await applyToken(accessToken)
    },
    [applyToken],
  )

  // Inscription, puis connexion immediate.
  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { accessToken } = await apiSignup({ email, password, displayName })
      await applyToken(accessToken)
    },
    [applyToken],
  )

  // Deconnexion : on invalide cote serveur, puis on vide l'etat local.
  const logout = useCallback(async () => {
    // Le catch evite qu'une erreur reseau empeche la deconnexion locale :
    // mieux vaut deconnecter l'interface que laisser l'utilisateur bloque.
    await apiLogout().catch(() => {})
    // AJOUT : ferme la socket AVANT de vider l'etat React. Sans ca, le serveur
    // ne recoit jamais l'evenement "disconnect" : isOnline reste bloque a true
    // en base et les amis ne voient jamais le passage hors ligne.
    closeSocket()
    setAccessToken(null)
    setUser(null)
  }, [])

  // Alimente le canal avec l'etat et les actions.
  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// [CONCEPT: hook personnalise] useAuth() donne acces au contexte depuis n'importe
// quel composant. Le garde-fou transforme une erreur silencieuse et difficile a
// diagnostiquer (valeur undefined) en message explicite.
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}
