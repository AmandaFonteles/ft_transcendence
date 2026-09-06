// =============================================================================
// useOnlineStatus.ts : ecoute les changements de statut en ligne/hors ligne des
// amis, diffuses par le serveur des qu'on est connecte au socket (voir
// realtime.gateway.ts : chaque socket rejoint sa propre room au handshake).
// Ne fait AUCUN join explicite : la room "user:<id>" de l'utilisateur courant
// est rejointe automatiquement par le serveur a la connexion.
// =============================================================================

import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ServerEvents, OnlineStatusEvent } from './events'

// Renvoie une Map userId -> isOnline, mise a jour en temps reel.
// Ne prend plus d'identite en parametre : le serveur la deduit du jeton presente
// au handshake (voir socket.ts), le client n'a plus rien a declarer.
export function useOnlineStatus(): Map<string, boolean> {
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    const socket = getSocket()

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
    // Aucune dependance : la socket est un singleton partage et son identite ne
    // change pas en cours de session. A la deconnexion, closeSocket() la detruit
    // et ce composant est demonte par la garde de route.
  }, [])

  return statuses
}