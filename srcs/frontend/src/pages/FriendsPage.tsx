// =============================================================================
// FriendsPage.tsx : ses amis, les demandes en attente, et la recherche.
// La liste vient de GET /api/users. Les fonctions "amis" et "chat" prevues par
// la structure n'ont pas encore de route backend : elles sont signalees comme
// emplacements a construire.
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listFriends, listPendingRequests, listSentRequests,
  searchUsers, sendFriendRequest, acceptFriendRequest, removeFriendship,
} from '../api'
import type { Friend, FriendRequest, PublicUser } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'
import { useOnlineStatus } from '../realtime/useOnlineStatus'
import { useFriendshipEvents } from '../realtime/useFriendshipEvents'
import { LIMITS } from '../lib/validation'

function UserRow({ user, action, isOnline }: { user: PublicUser; action?: React.ReactNode; isOnline?: boolean }) {
  // L'avatar mène au profil public. Le lien porte un intitulé explicite : une
  // image sans texte n'annonce rien à un lecteur d'écran.
  const profilePath = `/profil/${user.id}`

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Link
          to={profilePath}
          className="shrink-0 rounded-full"
          aria-label={`Voir le profil de ${user.displayName}`}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="grid place-items-center size-9 rounded-full bg-sunk text-ink-soft text-sm font-semibold">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {user.displayName}
            {isOnline !== undefined && (
              <span
                className={`size-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}
                title={isOnline ? 'En ligne' : 'Hors ligne'}
              />
            )}
          </div>
          <div className="font-data text-[12.5px] text-ink-soft truncate">{user.username}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </Card>
  )
}

export default function FriendsPage() {
  // Plus besoin de l'utilisateur courant ici : l'identite du handshake socket
  // vient desormais du jeton verifie cote serveur, pas d'un objet passe au hook.
  const { accessToken } = useAuth()
  const onlineStatuses = useOnlineStatus()

  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<FriendRequest[]>([])
  const [sent, setSent] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [searching, setSearching] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const reloadFriendshipData = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    Promise.all([
      listFriends(accessToken),
      listPendingRequests(accessToken),
      listSentRequests(accessToken),
    ])
      .then(([f, p, s]) => { setFriends(f); setPending(p); setSent(s) })
      .catch((err) => setError(err instanceof Error ? err.message : 'erreur inconnue'))
      .finally(() => setLoading(false))
  }, [accessToken])

  useEffect(() => { reloadFriendshipData() }, [reloadFriendshipData])

  useFriendshipEvents(reloadFriendshipData)

  useEffect(() => {
    if (!accessToken) return
    const q = query.trim()
    if (!q) { setResults([]); return }

    setSearching(true)
    const timeout = setTimeout(() => {
      searchUsers(accessToken, q)
        .then(setResults)
        .catch((err) => setActionError(err instanceof Error ? err.message : 'erreur inconnue'))
        .finally(() => setSearching(false))
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, accessToken])

  async function handleSendRequest(username: string) {
    if (!accessToken) return
    setActionError(null)
    try {
      await sendFriendRequest(accessToken, username)
      reloadFriendshipData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleAccept(friendshipId: string) {
    if (!accessToken) return
    setActionError(null)
    try {
      await acceptFriendRequest(accessToken, friendshipId)
      reloadFriendshipData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleRemove(friendshipId: string) {
    if (!accessToken) return
    setActionError(null)
    try {
      await removeFriendship(accessToken, friendshipId)
      reloadFriendshipData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  function statusFor(userId: string): 'friend' | 'pending-sent' | 'pending-received' | null {
    if (friends.some((f) => f.user.id === userId)) return 'friend'
    if (sent.some((s) => s.receiver?.id === userId)) return 'pending-sent'
    if (pending.some((p) => p.requester?.id === userId)) return 'pending-received'
    return null
  }

  function resolveOnline(u: PublicUser): boolean {
    return onlineStatuses.has(u.id) ? onlineStatuses.get(u.id)! : (u.isOnline ?? false)
  }

  const hasPendingRequests = pending.length > 0

  if (loading) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading title="Amis" subtitle={`${friends.length} ami${friends.length > 1 ? 's' : ''}`} />

      {error && <p className="text-danger mb-4">{error}</p>}

      {friends.length === 0 ? (
        <EmptyState title="Aucun ami pour l'instant" description="Cherchez quelqu'un ci-dessous pour l'ajouter." />
      ) : (
        <div className="grid gap-2 mb-8">
          {friends.map((f) => (
            <UserRow
              key={f.friendshipId}
              user={f.user}
              isOnline={resolveOnline(f.user)}
              action={<Button variant="ghost" onClick={() => handleRemove(f.friendshipId)}>Retirer</Button>}
            />
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">Amis</h2>

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-ink-soft mb-2">Demandes reçues</h3>
          <div className="grid gap-2">
            {pending.map((req) => req.requester && (
              <UserRow
                key={req.id}
                user={req.requester}
                action={
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => handleAccept(req.id)}>Accepter</Button>
                    <Button variant="ghost" onClick={() => handleRemove(req.id)}>Refuser</Button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-ink-soft mb-2">Demandes envoyées</h3>
          <div className="grid gap-2">
            {sent.map((req) => req.receiver && (
              <UserRow
                key={req.id}
                user={req.receiver}
                action={
                  <span className="text-[12.5px] text-ink-faint flex items-center gap-2">
                    En attente
                    <Button variant="ghost" onClick={() => handleRemove(req.id)}>Annuler</Button>
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-[380px] mb-4">
        <TextField
          label="Ajouter un ami"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Username (ex: Alex#3f9c2)"
          maxLength={LIMITS.SEARCH_QUERY_MAX}
        />
      </div>

      {actionError && <p className="text-danger mb-4">{actionError}</p>}

      {query.trim() && !searching && results.length === 0 && (
        <EmptyState title="Aucun résultat" description="Essayez un autre terme de recherche." />
      )}

      {results.length > 0 && (
        <div className="grid gap-2 mb-8">
          {results.map((u) => {
            const status = statusFor(u.id)
            return (
              <UserRow
                key={u.id}
                user={u}
                action={
                  status === 'friend' ? (
                    <span className="text-[12.5px] text-ink-faint">Déjà ami</span>
                  ) : status === 'pending-sent' ? (
                    <span className="text-[12.5px] text-ink-faint">Demande envoyée</span>
                  ) : status === 'pending-received' ? (
                    <span className="text-[12.5px] text-ink-faint">Vous a demandé</span>
                  ) : (
                    <Button
                      variant={hasPendingRequests ? 'secondary' : 'primary'}
                      onClick={() => handleSendRequest(u.username)}
                    >
                      Ajouter
                    </Button>
                  )
                }
              />
            )
          })}
        </div>
      )}
    </>
  )
}