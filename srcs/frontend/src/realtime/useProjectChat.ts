import { useEffect, useState } from 'react'
import { getSocket } from './socket'
import { ClientEvents, ServerEvents, ChatMessageEvent } from './events'
import { listMessages } from '../api'
import type { ChatMessage } from '../api'

// Connecte un composant au chat temps reel d'un projet. L'historique vient du
// REST au montage ; le temps reel ne fait qu'ajouter les nouveaux messages.
interface ProjectChatState {
  connected: boolean
  messages: ChatMessage[]
  loadingHistory: boolean
  error: string | null
  sendMessage: (content: string) => void
}

export function useProjectChat(
  organizationId: string,
  accessToken: string,
): ProjectChatState {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Historique via REST, independamment du websocket : on veut les messages meme
  // si la socket met du temps a se (re)connecter.
  useEffect(() => {
    let cancelled = false
    setLoadingHistory(true)
    listMessages(accessToken, organizationId)
      .then((history) => {
        if (cancelled) return
        // Le backend renvoie desc pour la pagination ; l'UI veut l'ordre
        // chronologique.
        setMessages([...history].reverse())
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue') })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [organizationId, accessToken])

  // Branchement temps reel : join a chaque "connect" pour survivre a une
  // reconnexion, nettoyage complet au demontage.
  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => {
      setConnected(true)
      socket.emit(ClientEvents.JOIN_ORG, { organizationId })
    }

    const onDisconnect = () => setConnected(false)

    const onMessageNew = (event: ChatMessageEvent) => {
      // La socket est partagee : elle recoit aussi les evenements d'autres projets.
      if (event.organizationId !== organizationId) return
      setMessages((prev) => [
        ...prev,
        {
          id: event.id,
          content: event.content,
          createdAt: event.createdAt,
          organizationId: event.organizationId,
          authorId: event.author.userId,
          // Forme minimale : le temps reel n'a que userId/displayName, pas l'avatar.
          author: {
            user: {
              id: event.author.userId,
              username: event.author.displayName,
              displayName: event.author.displayName,
              avatarUrl: null,
              createdAt: event.createdAt,
            },
          },
        },
      ])
    }

    const onError = (payload: { message: string }) => setError(payload.message)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on(ServerEvents.MESSAGE_NEW, onMessageNew)
    socket.on(ServerEvents.ERROR, onError)

    if (socket.connected) onConnect()

    return () => {
      socket.emit(ClientEvents.LEAVE_ORG, { organizationId })
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(ServerEvents.MESSAGE_NEW, onMessageNew)
      socket.off(ServerEvents.ERROR, onError)
    }
  }, [organizationId])

  function sendMessage(content: string) {
    if (!content.trim()) return
    const socket = getSocket()
    // Pas d'ajout optimiste : le gateway diffuse a tout le salon, emetteur inclus.
    // Le message revient par onMessageNew avec son vrai id et son horodatage de base.
    socket.emit(ClientEvents.MESSAGE_SEND, { organizationId, content: content.trim() })
  }

  return { connected, messages, loadingHistory, error, sendMessage }
}