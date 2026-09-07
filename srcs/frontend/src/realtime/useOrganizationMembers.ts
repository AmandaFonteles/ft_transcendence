import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents } from './events'

// Previent quand la composition d'un projet change. Le hook n'expose pas les
// membres mais un compteur : l'appelant s'en sert comme dependance d'effet pour
// recharger depuis l'API, car le backend applique des regles que le client ignore
// (dernier administrateur non retrogradable, projet supprime au depart du dernier
// membre).
export function useOrganizationMembers(organizationId: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket()

    // Le backend verifie l'appartenance avant d'accepter : aucune diffusion ne
    // fuite a un non-membre.
    const joinOrg = () => socket.emit(ClientEvents.JOIN_ORG, { organizationId })

    const bump = () => setRevision((r) => r + 1)

    socket.on('connect', joinOrg)
    socket.on(ServerEvents.MEMBER_ADDED, bump)
    socket.on(ServerEvents.MEMBER_REMOVED, bump)
    socket.on(ServerEvents.MEMBER_ROLE_CHANGED, bump)

    // Si la socket est deja connectee au montage, "connect" est passe et ne se
    // redeclenchera pas : on rejoint donc manuellement.
    if (socket.connected) joinOrg()

    return () => {
      socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      // Retrait de chaque ecouteur : sans cela ils s'empileraient a chaque montage.
      socket.off('connect', joinOrg)
      socket.off(ServerEvents.MEMBER_ADDED, bump)
      socket.off(ServerEvents.MEMBER_REMOVED, bump)
      socket.off(ServerEvents.MEMBER_ROLE_CHANGED, bump)
    }
  }, [organizationId])

  return revision
}
