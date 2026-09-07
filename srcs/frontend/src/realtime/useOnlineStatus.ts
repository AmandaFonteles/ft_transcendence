import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ServerEvents, OnlineStatusEvent } from './events'

// Renvoie une Map userId -> isOnline, mise a jour en temps reel. Aucun join
// explicite : le serveur fait rejoindre la room "user:<id>" au handshake.
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
    // Aucune dependance : la socket est un singleton dont l'identite ne change pas
    // en cours de session.
  }, [])

  return statuses
}