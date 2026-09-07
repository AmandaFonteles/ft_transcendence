import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addOrganizationMember, demoteMember, listFriends, listOrganizationMembers, promoteMember, removeMember } from '../api'
import type { Friend, InvitePolicy, OrganizationMember } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useOrganizationMembers } from '../realtime/useOrganizationMembers'
import Card from './ui/Card'
import Button from './ui/Button'

// Membres d'un projet, leurs roles et les actions associees.
interface MembersSectionProps {
  organizationId: string
  accessToken: string
  // Determine, avec le role, qui peut ajouter un membre (voir checkInvitePolicy
  // cote backend).
  invitePolicy: InvitePolicy
}

export default function MembersSection({ organizationId, accessToken, invitePolicy }: MembersSectionProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Le backend n'autorise a inviter que des amis (OrganizationsService.addMember) :
  // c'est le seul vivier pertinent a proposer ici.
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState('')

  // S'abonne au salon du projet : le compteur change des qu'un membre est ajoute,
  // retire, promu ou retrograde, y compris par quelqu'un d'autre. Sans cela, deux
  // personnes travaillant en meme temps voyaient des listes divergentes.
  const membersRevision = useOrganizationMembers(organizationId)

  useEffect(() => {
    listFriends(accessToken)
      .then(setFriends)
      // Echec silencieux : au pire le selecteur d'ajout reste vide.
      .catch(() => {})
  }, [accessToken])

  // Le backend est la source de verite : il peut refuser une retrogradation, par
  // exemple s'il ne reste qu'un administrateur.
  async function reload() {
    try {
      setMembers(await listOrganizationMembers(accessToken, organizationId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // On recharge plutot que d'appliquer le payload : le backend applique des
    // regles que le client ignore. accessToken n'est pas en dependance, il ne
    // change pas pendant la vie de la page.
  }, [organizationId, membersRevision])

  // --- Droits ---------------------------------------------------------------

  const me = members.find((m) => m.user.id === user?.id)
  const iAmAdmin = me?.role === 'ADMIN'

  // Reflete checkInvitePolicy cote backend, qui reste le seul garant reel.
  const canInvite = iAmAdmin || invitePolicy === 'ANY_MEMBER'
  const memberIds = new Set(members.map((m) => m.user.id))
  const eligibleFriends = friends.filter((f) => !memberIds.has(f.user.id))

  // --- Actions --------------------------------------------------------------

  // Enveloppe commune aux trois actions : etat occupe, erreurs, rechargement.
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
      setOpenUserId(null)
    } catch (err) {
      // Le backend renvoie des messages explicites ("dernier administrateur"...) :
      // on les affiche tels quels.
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFriendId) return
    await run(() => addOrganizationMember(accessToken, organizationId, selectedFriendId))
    setSelectedFriendId('')
  }

  if (loading) return <p className="text-ink-soft">Chargement des membres…</p>

  return (
    <>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {/* --- Ajout d'un membre --- */}
      {canInvite && (
        <Card className="mb-3">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <select
              value={selectedFriendId}
              onChange={(e) => setSelectedFriendId(e.target.value)}
              disabled={busy || eligibleFriends.length === 0}
              className="flex-1 min-w-0 bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="">
                {eligibleFriends.length === 0 ? 'Aucun ami à ajouter' : 'Choisir un ami à ajouter…'}
              </option>
              {eligibleFriends.map((f) => (
                <option key={f.user.id} value={f.user.id}>{f.user.displayName}</option>
              ))}
            </select>
            <Button type="submit" variant="primary" disabled={busy || !selectedFriendId}>
              Ajouter
            </Button>
          </form>
          {/* Rappel du perimetre : le backend ne permet d'inviter que des amis. */}
          {eligibleFriends.length === 0 && friends.length === 0 && (
            <p className="font-data text-[12.5px] text-ink-soft mt-2">
              Ajoutez des amis pour pouvoir les inviter dans ce projet.
            </p>
          )}
        </Card>
      )}

      {/* --- Liste des membres --- */}
      <div className="grid gap-2">
        {members.map((m) => {
          const isMe = m.user.id === user?.id
          const isOpen = openUserId === m.user.id
          // On ne propose d'actions que si on est admin et que la cible n'est pas soi.
          const canAct = iAmAdmin && !isMe

          return (
            <Card key={m.user.id}>
              <div className="flex items-center gap-3">
                <Link
                  to={`/profil/${m.user.id}`}
                  className="relative shrink-0 rounded-full"
                  aria-label={`Voir le profil de ${m.user.displayName}`}
                >
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="grid place-items-center size-9 rounded-full bg-sunk text-ink-soft text-sm font-semibold">
                      {m.user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {/* Tag administrateur : relative sur le lien + absolute ici. */}
                  {m.role === 'ADMIN' && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 grid place-items-center size-4 rounded-full bg-ink text-white text-[9px] font-bold ring-2 ring-surface"
                      title="Administrateur"
                      aria-label="Administrateur"
                    >
                      A
                    </span>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {m.user.displayName}
                    {isMe && <span className="ml-2 text-[12px] text-ink-faint">(vous)</span>}
                  </div>
                  <div className="font-data text-[12.5px] text-ink-soft">
                    {m.role === 'ADMIN' ? 'Administrateur' : 'Membre'}
                  </div>
                </div>

                {canAct && (
                  <Button onClick={() => setOpenUserId(isOpen ? null : m.user.id)}>
                    {isOpen ? 'Fermer' : 'Gérer'}
                  </Button>
                )}
              </div>

              {/* Panneau d'actions, deplie a la demande. */}
              {isOpen && canAct && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-rule">
                  {m.role === 'MEMBER' ? (
                    <Button disabled={busy} onClick={() => run(() => promoteMember(accessToken, organizationId, m.user.id))}>
                      Promouvoir administrateur
                    </Button>
                  ) : (
                    <Button disabled={busy} onClick={() => run(() => demoteMember(accessToken, organizationId, m.user.id))}>
                      Rétrograder en membre
                    </Button>
                  )}
                  <Button
                    disabled={busy}
                    onClick={() => run(() => removeMember(accessToken, organizationId, m.user.id))}
                    className="!text-danger"
                  >
                    Exclure du projet
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {!iAmAdmin && (
        <p className="font-data text-[12.5px] text-ink-soft mt-3">
          Seuls les administrateurs peuvent gérer les membres.
        </p>
      )}
    </>
  )
}
