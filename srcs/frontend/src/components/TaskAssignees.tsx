import { useCallback, useEffect, useState } from 'react'
import { assignTaskMember, listOrganizationMembers, listTaskAssignments, removeTaskAssignment } from '../api'
import type { OrganizationMember, TaskAssignment } from '../api'
import { useTaskEvents } from '../realtime/useTaskEvents'
import Button from './ui/Button'

// Qui est assigne a une tache, et gestion des assignations.
// Regles appliquees par le backend, reproduites ici pour ne proposer que ce qui
// aboutira : le proprietaire de la tache et les administrateurs assignent et
// retirent n'importe qui ; tout autre membre peut prendre une tache libre ; tout
// membre peut se retirer lui-meme. Masquer une action reste un confort, pas une
// securite — le backend refuse de toute facon.
interface TaskAssigneesProps {
  accessToken: string
  organizationId: string
  taskId: string
  ownerId: string | null
  currentUserId: string
  isAdmin: boolean
}

export default function TaskAssignees({
  accessToken, organizationId, taskId, ownerId, currentUserId, isAdmin,
}: TaskAssigneesProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // --- Chargement -----------------------------------------------------------

  // useCallback fige l'identite de la fonction : elle peut servir de dependance
  // d'effet sans le relancer en boucle.
  const reload = useCallback(async () => {
    try {
      // Les membres sont necessaires pour afficher des noms : l'API d'assignation
      // ne renvoie que des OrganizationMember (userId), jamais le displayName.
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

  // Recharge quand une assignation change sur ce projet, y compris du fait de
  // quelqu'un d'autre pendant que ce panneau est ouvert.
  const taskEventsRevision = useTaskEvents(organizationId)

  useEffect(() => { reload() }, [reload, taskEventsRevision])

  const nameOf = (userId: string) =>
    members.find((m) => m.user.id === userId)?.user.displayName ?? 'Membre inconnu'

  // --- Droits ---------------------------------------------------------------

  // ownerId est un OrganizationMember.id, pas un userId : on ne peut trancher que
  // si l'on retrouve notre propre memberId quelque part.
  const myMemberId = assignments.find((a) => a.member.userId === currentUserId)?.member.id
  const iAmOwner = ownerId !== null && myMemberId === ownerId

  const canManageAll = isAdmin || iAmOwner
  const iAmAssigned = assignments.some((a) => a.member.userId === currentUserId)
  const isUnclaimed = assignments.length === 0

  const assignable = members.filter(
    (m) => !assignments.some((a) => a.member.userId === m.user.id),
  )

  // --- Actions --------------------------------------------------------------

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
            // Retirer quelqu'un demande les droits complets, sauf sur soi-meme.
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

      {/* Prendre la tache : propose a tout membre quand elle est libre. */}
      {isUnclaimed && !canManageAll && (
        <Button
          onClick={() => run(() => assignTaskMember(accessToken, organizationId, taskId, currentUserId))}
          disabled={busy}
        >
          Prendre cette tâche
        </Button>
      )}

      {/* Assigner quelqu'un : reserve au proprietaire et aux administrateurs. */}
      {canManageAll && assignable.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="assign-member" className="text-[13.5px] text-ink-soft">Assigner</label>
          <select
            id="assign-member"
            // Valeur toujours vide : le select declenche une action, il ne porte pas
            // d'etat. Sans cette remise a zero il resterait bloque sur le dernier
            // choix, empechant de reassigner la meme personne.
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
