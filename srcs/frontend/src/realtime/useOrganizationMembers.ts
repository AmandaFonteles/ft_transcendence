// =============================================================================
// useOrganizationMembers.ts : previent quand la composition d'un projet change.
//
// Le hook n'expose pas les membres : il expose un COMPTEUR qui s'incremente a
// chaque evenement. L'appelant s'en sert comme dependance d'effet pour recharger
// sa liste depuis l'API.
//
// POURQUOI ce detour plutot que transmettre les donnees du message : le backend
// applique des regles que le client ignore — un dernier administrateur ne peut
// pas etre retrograde, un projet disparait quand son dernier membre le quitte.
// Un client qui bricolerait sa liste a partir du payload divergerait de la
// verite serveur. Recharger coute un appel et garantit l'exactitude.
// =============================================================================

import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents } from './events'
import type { SocketIdentity } from './socket'

export function useOrganizationMembers(organizationId: string, identity: SocketIdentity): number {
  // Incremente a chaque changement recu. Sa valeur n'a pas de sens en soi ;
  // seul son CHANGEMENT compte, comme signal de rechargement.
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const socket = getSocket(identity)

    // Rejoint le salon du projet. Le backend verifie l'appartenance avant
    // d'accepter, donc aucune diffusion ne fuite a un non-membre.
    const joinOrg = () => socket.emit(ClientEvents.JOIN_ORG, { organizationId })

    // Un seul handler pour les trois evenements : dans les trois cas, la reponse
    // est la meme — recharger.
    const bump = () => setRevision((r) => r + 1)

    socket.on('connect', joinOrg)
    socket.on(ServerEvents.MEMBER_ADDED, bump)
    socket.on(ServerEvents.MEMBER_REMOVED, bump)
    socket.on(ServerEvents.MEMBER_ROLE_CHANGED, bump)

    // Si la socket est DEJA connectee au montage, l'evenement "connect" est
    // passe et ne se redeclenchera pas : on rejoint donc manuellement.
    // Sans cela, on n'entrerait jamais dans le salon.
    if (socket.connected) joinOrg()

    return () => {
      socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      // Retrait de CHAQUE ecouteur : sans cela ils s'empileraient a chaque
      // montage, et un evenement declencherait plusieurs rechargements.
      socket.off('connect', joinOrg)
      socket.off(ServerEvents.MEMBER_ADDED, bump)
      socket.off(ServerEvents.MEMBER_REMOVED, bump)
      socket.off(ServerEvents.MEMBER_ROLE_CHANGED, bump)
    }
  }, [organizationId, identity.userId, identity.displayName])

  return revision
}
