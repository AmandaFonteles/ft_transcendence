import { useEffect } from 'react'
import { getSocket } from './socket'
import { ServerEvents } from './events'

// L'identite n'est pas un parametre : le serveur la lit dans le jeton du handshake.
export function useFriendshipEvents(onChange: () => void) {
  useEffect(() => {
    const socket = getSocket()
    socket.on(ServerEvents.FRIEND_REQUEST_RECEIVED, onChange)
    socket.on(ServerEvents.FRIEND_REQUEST_ACCEPTED, onChange)
    socket.on(ServerEvents.FRIEND_REMOVED, onChange)
    return () => {
      socket.off(ServerEvents.FRIEND_REQUEST_RECEIVED, onChange)
      socket.off(ServerEvents.FRIEND_REQUEST_ACCEPTED, onChange)
      socket.off(ServerEvents.FRIEND_REMOVED, onChange)
    }
  }, [onChange])
}