// =============================================================================
// useTaskEvents.ts : previent quand les taches d'un projet changent (creation,
// modification, suppression, (des)assignation) - y compris par QUELQU'UN D'AUTRE.
//
// Meme principe que useOrganizationMembers.ts : le hook n'expose pas les taches,
// juste un COMPTEUR qui s'incremente a chaque evenement. L'appelant s'en sert
// comme dependance d'effet pour recharger depuis l'API plutot que de reconstituer
// son etat a partir du payload (le backend applique des regles de visibilite que
// le client ignore).
// =============================================================================

import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents, TaskEventPayload } from './events'
import type { SocketIdentity } from './socket'

export function useTaskEvents(organizationId: string, identity: SocketIdentity): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket(identity)

    const joinOrg = () => socket.emit(ClientEvents.JOIN_ORG, { organizationId })

    // Un seul handler pour les cinq evenements : dans tous les cas, la reponse
    // est la meme — recharger. On ignore les evenements d'un autre projet : la
    // socket est partagee par toute l'app.
    const bump = (payload: TaskEventPayload) => {
      if (payload.organizationId !== organizationId) return
      setRevision((r) => r + 1)
    }

    socket.on('connect', joinOrg)
    socket.on(ServerEvents.TASK_CREATED, bump)
    socket.on(ServerEvents.TASK_UPDATED, bump)
    socket.on(ServerEvents.TASK_DELETED, bump)
    socket.on(ServerEvents.TASK_ASSIGNED, bump)
    socket.on(ServerEvents.TASK_UNASSIGNED, bump)

    // Si la socket est DEJA connectee au montage, l'evenement "connect" est
    // passe et ne se redeclenchera pas : on rejoint donc manuellement.
    if (socket.connected) joinOrg()

    return () => {
      socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      socket.off('connect', joinOrg)
      socket.off(ServerEvents.TASK_CREATED, bump)
      socket.off(ServerEvents.TASK_UPDATED, bump)
      socket.off(ServerEvents.TASK_DELETED, bump)
      socket.off(ServerEvents.TASK_ASSIGNED, bump)
      socket.off(ServerEvents.TASK_UNASSIGNED, bump)
    }
  }, [organizationId, identity.userId, identity.displayName])

  return revision
}
