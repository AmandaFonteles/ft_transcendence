// =============================================================================
// TaskAssignees.tsx : qui est assigne a une tache, et gestion des assignations.
//
// REGLES DE DROIT (appliquees par le backend, reproduites ici pour ne proposer
// que ce qui aboutira) :
//   - le PROPRIETAIRE de la tache et les ADMINISTRATEURS du projet assignent et
//     retirent n'importe qui ;
//   - tout autre membre peut PRENDRE une tache, mais seulement si elle n'a
//     encore aucun assigne ;
//   - tout membre peut se retirer LUI-MEME.
//
// Masquer une action est un confort, pas une securite : le backend refuse de
// toute facon (assignMember / removeAssignment verifient tout cela).
// =============================================================================

import { useCallback, useEffect, useState } from 'react'
import { assignTaskMember, listOrganizationMembers, listTaskAssignments, removeTaskAssignment } from '../api'
import type { OrganizationMember, TaskAssignment } from '../api'
import Button from './ui/Button'

interface TaskAssigneesProps {
  accessToken: string
  organizationId: string
  taskId: string
  // Identifiant du MEMBRE (OrganizationMember.id) proprietaire de la tache.
  // Peut etre null : une tache peut n'avoir aucun proprietaire.
  ownerId: string | null
  // Identifiant UTILISATEUR de la personne connectee.
  currentUserId: string
  // La personne connectee est-elle administratrice du projet ?
  isAdmin: boolean
}

export default function TaskAssignees({
  accessToken, organizationId, taskId, ownerId, currentUserId, isAdmin,
}: TaskAssigneesProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  // Membres du projet : necessaires pour afficher des NOMS. L'API d'assignation
  // ne renvoie que des OrganizationMember (userId), jamais le displayName.
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Action en cours : desactive les boutons pour eviter les doubles envois.
  const [busy, setBusy] = useState(false)

  // Recharge depuis l'API. useCallback fige l'identite de la fonction, ce qui
  // permet de la mettre en dependance de l'effet sans le relancer en boucle.
  const reload = useCallback(async () => {
    try {
      // Les deux appels sont independants : on les lance en parallele.
      const [a, m] = await Promise.all([
        listTaskAssignments(accessToken, organizationId, taskId),
        listOrganizationMembers(accessToken, organizationId),
      ])
      setAssignments(a)
      setMembers(m)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [accessToken, organizationId, taskId])

  useEffect(() => { reload() }, [reload])

  // Nom affichable d'un utilisateur, via la liste des membres.
  const nameOf = (userId: string) =>
    members.find((m) => m.user.id === userId)?.user.displayName ?? 'Membre inconnu'

  // Le membre connecte, pour comparer son OrganizationMember.id au ownerId.
  const myMemberId = assignments.find((a) => a.member.userId === currentUserId)?.member.id
  // Proprietaire de la tache ? ownerId est un OrganizationMember.id, pas un userId.
  // On ne peut donc trancher que si l'on trouve notre propre memberId quelque part.
  const iAmOwner = ownerId !== null && myMemberId === ownerId

  // Droits complets : assigner et retirer n'importe qui.
  const canManageAll = isAdmin || iAmOwner
  // Deja assigne a cette tache ?
  const iAmAssigned = assignments.some((a) => a.member.userId === currentUserId)
  // Tache libre : personne dessus, donc n'importe quel membre peut la prendre.
  const isUnclaimed = assignments.length === 0

  // Membres du projet pas encore assignes : candidats a l'assignation.
  const assignable = members.filter(
    (m) => !assignments.some((a) => a.member.userId === m.user.id),
  )

  // Execute une action puis recharge, en neutralisant les boutons entre-temps.
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-[13.5px] text-ink-soft">Chargement des assignations…</p>

  return (
    <div className="mb-4">
      <h3 className="text-[13.5px] font-semibold text-ink-soft mb-2">Assignée à</h3>

      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      {assignments.length === 0 ? (
        <p className="text-[13.5px] text-ink-faint mb-2">Personne pour l'instant.</p>
      ) : (
        <ul className="grid gap-1 mb-2">
          {assignments.map((a) => {
            // On peut retirer quelqu'un si l'on a les droits complets, ou s'il
            // s'agit de soi-meme.
            const canRemove = canManageAll || a.member.userId === currentUserId
            return (
              <li key={a.memberId} className="flex items-center gap-2 text-[13.5px]">
                <span className="flex-1 min-w-0 truncate">
                  {nameOf(a.member.userId)}
                  {a.member.userId === currentUserId && (
                    <span className="ml-1 text-ink-faint">(vous)</span>
                  )}
                </span>
                {canRemove && (
                  <button
                    onClick={() => run(() => removeTaskAssignment(accessToken, organizationId, taskId, a.member.userId))}
                    disabled={busy}
                    className="text-[12.5px] text-danger hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Retirer
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* PRENDRE LA TACHE : proposee a tout membre quand elle est libre. C'est la
          regle "si une tache n'est pas affiliee, tout le monde peut la prendre". */}
      {isUnclaimed && !canManageAll && (
        <Button
          onClick={() => run(() => assignTaskMember(accessToken, organizationId, taskId, currentUserId))}
          disabled={busy}
        >
          Prendre cette tâche
        </Button>
      )}

      {/* ASSIGNER QUELQU'UN : reserve au proprietaire et aux administrateurs. */}
      {canManageAll && assignable.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="assign-member" className="text-[13.5px] text-ink-soft">Assigner</label>
          <select
            id="assign-member"
            // Valeur toujours vide : le select sert de declencheur d'action, pas
            // de champ d'etat. Sans cette remise a zero, il resterait bloque sur
            // le dernier choix et on ne pourrait pas reassigner la meme personne.
            value=""
            disabled={busy}
            onChange={(e) => {
              const userId = e.target.value
              if (userId) run(() => assignTaskMember(accessToken, organizationId, taskId, userId))
            }}
            className="bg-surface border border-rule rounded-lg px-2 py-1 text-[13.5px] cursor-pointer"
          >
            <option value="">Choisir un membre…</option>
            {assignable.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.displayName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Se retirer quand on est assigne sans avoir les droits complets. */}
      {iAmAssigned && !canManageAll && (
        <p className="text-[12.5px] text-ink-faint mt-1">
          Vous pouvez vous retirer via « Retirer » ci-dessus.
        </p>
      )}
    </div>
  )
}
