import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents, TaskEventPayload } from './events'

// Previent quand les taches d'un projet changent, y compris du fait de quelqu'un
// d'autre. Meme principe que useOrganizationMembers : un compteur, et l'appelant
// recharge depuis l'API plutot que de reconstituer son etat depuis le payload.
export function useTaskEvents(organizationId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket()

    const joinOrg = () => socket.emit(ClientEvents.JOIN_ORG, { organizationId })

    // Un seul handler pour les cinq evenements. On ignore ceux d'un autre projet :
    // la socket est partagee par toute l'application.
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

    // "connect" est deja passe si la socket etait montee avant ce hook.
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
  }, [organizationId])

  return revision
}

// Variante pour les ecrans qui melangent plusieurs projets (tableau de bord,
// agenda) : une room par projet.
// organizationIds est stable en valeur mais pas en reference (les pages le
// calculent souvent via .map()) : on depend donc d'une cle textuelle, sans quoi
// l'effet rejoindrait et quitterait les rooms a chaque rendu.
export function useTaskEventsForOrganizations(organizationIds: string[]): number {
  const [revision, setRevision] = useState(0)
  const idsKey = organizationIds.join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (ids.length === 0) return
    const socket = getSocket()

    const joinAll = () => {
      for (const organizationId of ids) socket.emit(ClientEvents.JOIN_ORG, { organizationId })
    }

    const bump = (payload: TaskEventPayload) => {
      if (!ids.includes(payload.organizationId)) return
      setRevision((r) => r + 1)
    }

    socket.on('connect', joinAll)
    socket.on(ServerEvents.TASK_CREATED, bump)
    socket.on(ServerEvents.TASK_UPDATED, bump)
    socket.on(ServerEvents.TASK_DELETED, bump)
    socket.on(ServerEvents.TASK_ASSIGNED, bump)
    socket.on(ServerEvents.TASK_UNASSIGNED, bump)

    if (socket.connected) joinAll()

    return () => {
      for (const organizationId of ids) socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      socket.off('connect', joinAll)
      socket.off(ServerEvents.TASK_CREATED, bump)
      socket.off(ServerEvents.TASK_UPDATED, bump)
      socket.off(ServerEvents.TASK_DELETED, bump)
      socket.off(ServerEvents.TASK_ASSIGNED, bump)
      socket.off(ServerEvents.TASK_UNASSIGNED, bump)
    }
  }, [idsKey])

  return revision
}
