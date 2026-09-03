import { useEffect } from 'react'
import { getSocket, SocketIdentity } from './socket'
import { ServerEvents } from './events'

export function useFriendshipEvents(identity: SocketIdentity, onChange: () => void) {
  useEffect(() => {
    const socket = getSocket(identity)
    socket.on(ServerEvents.FRIEND_REQUEST_RECEIVED, onChange)
    socket.on(ServerEvents.FRIEND_REQUEST_ACCEPTED, onChange)
    socket.on(ServerEvents.FRIEND_REMOVED, onChange)
    return () => {
      socket.off(ServerEvents.FRIEND_REQUEST_RECEIVED, onChange)
      socket.off(ServerEvents.FRIEND_REQUEST_ACCEPTED, onChange)
      socket.off(ServerEvents.FRIEND_REMOVED, onChange)
    }
  }, [identity.userId, identity.displayName, onChange])
}