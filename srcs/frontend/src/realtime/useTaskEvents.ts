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

export function useTaskEvents(organizationId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket()

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
  }, [organizationId])

  return revision
}

// Variante pour les ecrans qui melangent PLUSIEURS projets (DashboardPage,
// AgendaPage) : ceux-ci n'ont pas un organizationId unique mais une liste de
// projets, il faut donc rejoindre une room par projet plutot qu'une seule.
//
// organizationIds est attendu STABLE en VALEUR mais pas forcement en
// REFERENCE (les pages le calculent souvent via .map() a chaque rendu) : on
// dependend donc d'une cle textuelle plutot que du tableau lui-meme, sans
// quoi l'effet se relancerait — et rejoindrait/quitterait les rooms — a
// chaque rendu.
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
