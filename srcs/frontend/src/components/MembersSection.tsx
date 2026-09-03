// =============================================================================
// MembersSection.tsx : membres d'un projet, leurs roles et les actions associees.
//
// Rendu possible par la route GET /organizations/:id/members, qui n'existait pas
// jusqu'ici. Repond aux demandes de la structure du 28/08 : tag sur l'avatar de
// l'administrateur, et actions accessibles au clic sur un membre.
// =============================================================================

import { useEffect, useState } from 'react'
import { demoteMember, listOrganizationMembers, promoteMember, removeMember } from '../api'
import type { OrganizationMember } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from './ui/Card'
import Button from './ui/Button'

interface MembersSectionProps {
  organizationId: string
  accessToken: string
}

export default function MembersSection({ organizationId, accessToken }: MembersSectionProps) {
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
    // organizationId suffit : accessToken ne change pas pendant la vie de la page.
  }, [organizationId])

  // Le rôle de l'utilisateur courant determine les actions proposees.
  const me = members.find((m) => m.user.id === user?.id)
  const iAmAdmin = me?.role === 'ADMIN'

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

  if (loading) return <p className="text-ink-soft">Chargement des membres…</p>

  return (
    <>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <div className="grid gap-2">
        {members.map((m) => {
          const isMe = m.user.id === user?.id
          const isOpen = openUserId === m.user.id
          // On ne propose d'actions que si on est admin et que la cible n'est pas soi.
          const canAct = iAmAdmin && !isMe

          return (
            <Card key={m.user.id}>
              <div className="flex items-center gap-3">
                {/* Avatar avec TAG administrateur. relative + absolute : la pastille
                    se pose sur le coin de l'image, comme demande. */}
                <span className="relative shrink-0">
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
                </span>

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
