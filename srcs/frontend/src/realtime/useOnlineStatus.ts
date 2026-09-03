// =============================================================================
// useOnlineStatus.ts : ecoute les changements de statut en ligne/hors ligne des
// amis, diffuses par le serveur des qu'on est connecte au socket (voir
// realtime.gateway.ts : chaque socket rejoint sa propre room au handshake).
// Ne fait AUCUN join explicite : la room "user:<id>" de l'utilisateur courant
// est rejointe automatiquement par le serveur a la connexion.
// =============================================================================

import { useEffect, useState } from 'react'
import { getSocket, SocketIdentity } from './socket'
import { ServerEvents, OnlineStatusEvent } from './events'

// Renvoie une Map userId -> isOnline, mise a jour en temps reel.
export function useOnlineStatus(identity: SocketIdentity): Map<string, boolean> {
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    const socket = getSocket(identity)

    const onOnline = (event: OnlineStatusEvent) =>
      setStatuses((prev) => new Map(prev).set(event.userId, true))

    const onOffline = (event: OnlineStatusEvent) =>
      setStatuses((prev) => new Map(prev).set(event.userId, false))

    socket.on(ServerEvents.USER_ONLINE, onOnline)
    socket.on(ServerEvents.USER_OFFLINE, onOffline)

    return () => {
      socket.off(ServerEvents.USER_ONLINE, onOnline)
      socket.off(ServerEvents.USER_OFFLINE, onOffline)
    }
  }, [identity.userId, identity.displayName])

  return statuses
}