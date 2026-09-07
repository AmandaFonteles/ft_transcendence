import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents, FileEventPayload } from './events'

// Previent quand les fichiers d'un projet changent, y compris du fait de
// quelqu'un d'autre. Meme principe que useTaskEvents : un compteur, et
// l'appelant recharge depuis l'API.
//
// Ici le rechargement n'est pas une simplification mais une necessite : le
// serveur ne diffuse que { organizationId, fileId }, car un fichier PRIVATE ou
// RESTRICTED ne doit pas apparaitre a un membre qui n'y a pas acces. Seul
// GET /files sait ce que CE membre a le droit de voir.
export function useFileEvents(organizationId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket()

    const joinOrg = () => socket.emit(ClientEvents.JOIN_ORG, { organizationId })

    // La socket est partagee par toute l'application : on ignore les evenements
    // des autres projets.
    const bump = (payload: FileEventPayload) => {
      if (payload.organizationId !== organizationId) return
      setRevision((r) => r + 1)
    }

    socket.on('connect', joinOrg)
    socket.on(ServerEvents.FILE_CREATED, bump)
    socket.on(ServerEvents.FILE_UPDATED, bump)
    socket.on(ServerEvents.FILE_DELETED, bump)

    // "connect" est deja passe si la socket etait montee avant ce hook.
    if (socket.connected) joinOrg()

    return () => {
      socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      socket.off('connect', joinOrg)
      socket.off(ServerEvents.FILE_CREATED, bump)
      socket.off(ServerEvents.FILE_UPDATED, bump)
      socket.off(ServerEvents.FILE_DELETED, bump)
    }
  }, [organizationId])

  return revision
}
