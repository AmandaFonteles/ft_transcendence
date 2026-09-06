// =============================================================================
// MembersSection.tsx : membres d'un projet, leurs roles et les actions associees.
//
// Rendu possible par la route GET /organizations/:id/members, qui n'existait pas
// jusqu'ici. Repond aux demandes de la structure du 28/08 : tag sur l'avatar de
// l'administrateur, et actions accessibles au clic sur un membre.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addOrganizationMember, demoteMember, listFriends, listOrganizationMembers, promoteMember, removeMember } from '../api'
import type { Friend, InvitePolicy, OrganizationMember } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useOrganizationMembers } from '../realtime/useOrganizationMembers'
import Card from './ui/Card'
import Button from './ui/Button'

interface MembersSectionProps {
  organizationId: string
  accessToken: string
  // Politique d'invitation du projet : determine, avec le role, qui peut
  // ajouter un membre (voir checkInvitePolicy cote backend).
  invitePolicy: InvitePolicy
}

export default function MembersSection({ organizationId, accessToken, invitePolicy }: MembersSectionProps) {
  // Utilisateur courant : sert a savoir s'il est administrateur et a s'exclure
  // lui-meme des actions de moderation.
  const { user } = useAuth()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Membre dont le panneau d'actions est ouvert (identifiant utilisateur).
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  // Action en cours : desactive les boutons pour eviter les doubles clics.
  const [busy, setBusy] = useState(false)
  // Amis de l'utilisateur courant : le backend n'autorise a inviter QUE des
  // amis (voir OrganizationsService.addMember), c'est donc le seul vivier
  // pertinent a proposer ici.
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriendId, setSelectedFriendId] = useState('')

  // [TEMPS REEL] S'abonne au salon du projet. Le compteur change des qu'un membre
  // est ajoute, retire, promu ou retrograde — y compris par QUELQU'UN D'AUTRE.
  // Sans cela, deux personnes travaillant en meme temps voyaient des listes
  // divergentes jusqu'au prochain rechargement manuel.
  const membersRevision = useOrganizationMembers(
    organizationId,
    // Identite du handshake. Le repli sur des chaines vides ne sert qu'a
    // satisfaire le typage : la section n'est rendue que pour un utilisateur
    // connecte, et le backend refuse une socket sans identite.
    { userId: user?.id ?? '', displayName: user?.displayName ?? '' },
  )

  useEffect(() => {
    listFriends(accessToken)
      .then(setFriends)
      // Echec silencieux : au pire le selecteur d'ajout reste vide.
      .catch(() => {})
  }, [accessToken])

  // Recharge la liste depuis l'API. Appelee au montage et apres chaque action :
  // le backend est la source de verite (il peut refuser une retrogradation, par
  // exemple s'il ne reste qu'un administrateur).
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
    // membersRevision en dependance : chaque evenement temps reel incremente ce
    // compteur, ce qui relance le chargement. On RECHARGE plutot que d'appliquer
    // le payload, car le backend applique des regles que le client ignore
    // (dernier administrateur, suppression du projet au depart du dernier membre).
    // accessToken n'y figure pas : il ne change pas pendant la vie de la page.
  }, [organizationId, membersRevision])

  // Le rôle de l'utilisateur courant determine les actions proposees.
  const me = members.find((m) => m.user.id === user?.id)
  const iAmAdmin = me?.role === 'ADMIN'

  // Peut inviter : administrateur (toujours autorise), ou membre simple si la
  // politique du projet l'autorise. Reflete checkInvitePolicy cote backend ;
  // celui-ci reste le seul garant reel du droit.
  const canInvite = iAmAdmin || invitePolicy === 'ANY_MEMBER'
  // Amis pas encore membres actifs : seuls eux ont un sens a proposer.
  const memberIds = new Set(members.map((m) => m.user.id))
  const eligibleFriends = friends.filter((f) => !memberIds.has(f.user.id))

  // Enveloppe commune aux trois actions : etat occupe, erreurs, rechargement.
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
      setOpenUserId(null)
    } catch (err) {
      // Le backend renvoie des messages explicites ("dernier administrateur", etc.) :
      // on les affiche tels quels plutot que de les reformuler approximativement.
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  // Ajoute l'ami selectionne comme membre du projet.
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

      <div className="grid gap-2">
        {members.map((m) => {
          const isMe = m.user.id === user?.id
          const isOpen = openUserId === m.user.id
          // On ne propose d'actions que si on est admin et que la cible n'est pas soi.
          const canAct = iAmAdmin && !isMe

          return (
            <Card key={m.user.id}>
              <div className="flex items-center gap-3">
                {/* Avatar avec TAG administrateur : relative + absolute posent la
                    pastille sur le coin de l'image. L'ensemble est un lien vers
                    le profil public. */}
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
                  {m.role === 'ADMIN' && (
                    <span
                      // ring-surface detache la pastille de l'avatar.
                      className="absolute -bottom-0.5 -right-0.5 grid place-items-center size-4 rounded-full bg-ink text-white text-[9px] font-bold ring-2 ring-surface"
                      // La pastille seule n'est pas accessible : on la nomme.
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

      {/* Information utile : sans elle, un membre simple pourrait croire a un bug
          en ne voyant aucun bouton de gestion. */}
      {!iAmAdmin && (
        <p className="font-data text-[12.5px] text-ink-soft mt-3">
          Seuls les administrateurs peuvent gérer les membres.
        </p>
      )}
    </>
  )
}
