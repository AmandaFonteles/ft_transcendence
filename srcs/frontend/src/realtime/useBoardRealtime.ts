// =============================================================================
// useBoardRealtime.ts : hook qui connecte un composant au temps reel d'un tableau.
// [CONCEPT: hook personnalise] Une fonction "useX" qui encapsule de la logique a
// etat reutilisable. Ici : rejoindre la room, ecouter la presence, nettoyer en sortie.
// =============================================================================

// Importe les hooks React utilises.
import { useEffect, useState } from 'react'
// Importe le singleton de connexion et le type d'identite.
import { getSocket, SocketIdentity } from './socket'
// Importe le contrat partage.
import { ClientEvents, ServerEvents, PresenceUser, CardMovedEvent } from './events'

// Ce que le hook renvoie au composant appelant.
interface BoardRealtimeState {
  // Vrai quand la socket est connectee (permet d'afficher un indicateur).
  connected: boolean
  // Membres actuellement presents sur le tableau.
  members: PresenceUser[]
  // Dernier deplacement de carte recu (null si aucun).
  lastMove: CardMovedEvent | null
}

// Hook principal : s'abonne au tableau boardId pour l'identite donnee.
export function useBoardRealtime(boardId: string, identity: SocketIdentity): BoardRealtimeState {
  // Etat de connexion.
  const [connected, setConnected] = useState(false)
  // Liste des membres presents.
  const [members, setMembers] = useState<PresenceUser[]>([])
  // Dernier mouvement recu.
  const [lastMove, setLastMove] = useState<CardMovedEvent | null>(null)

  // Effet relance a chaque changement de tableau ou d'identite.
  useEffect(() => {
    // Recupere (ou cree) la connexion partagee.
    const socket = getSocket(identity)

    // --- Handlers nommes (indispensables pour pouvoir les retirer ensuite) ---

    // A la connexion : marque l'etat et rejoint la room du tableau.
    const onConnect = () => {
      setConnected(true)
      // [CONCEPT: piege de la reconnexion] Apres une coupure, Socket.IO reconnecte
      // avec un NOUVEL identifiant de socket, qui n'appartient a AUCUNE room :
      // toutes les adhesions sont silencieusement perdues. On rejoint donc a CHAQUE
      // "connect", pas seulement au premier montage.
      socket.emit(ClientEvents.JOIN_BOARD, { boardId })
    }

    // A la deconnexion : met a jour l'indicateur et vide la presence (elle n'est plus fiable).
    const onDisconnect = () => {
      setConnected(false)
      setMembers([])
    }

    // Etat initial complet de la presence, envoye a l'arrivee.
    const onPresenceState = (users: PresenceUser[]) => setMembers(users)

    // Un membre arrive : on l'ajoute en evitant les doublons.
    const onPresenceJoined = (user: PresenceUser) =>
      setMembers((prev) =>
        // Deja present (autre onglet) ? on ne change rien.
        prev.some((u) => u.userId === user.userId) ? prev : [...prev, user],
      )

    // Un membre part : on le retire de la liste.
    const onPresenceLeft = (user: PresenceUser) =>
      setMembers((prev) => prev.filter((u) => u.userId !== user.userId))

    // Une carte a bouge ailleurs : on stocke l'evenement.
    const onCardMoved = (event: CardMovedEvent) => setLastMove(event)

    // --- Abonnements ---
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on(ServerEvents.PRESENCE_STATE, onPresenceState)
    socket.on(ServerEvents.PRESENCE_JOINED, onPresenceJoined)
    socket.on(ServerEvents.PRESENCE_LEFT, onPresenceLeft)
    socket.on(ServerEvents.CARD_MOVED, onCardMoved)

    // Cas particulier : si la socket est DEJA connectee au montage du composant,
    // l'evenement "connect" est deja passe et ne se redeclenchera pas. On rejoint donc
    // manuellement, sinon on n'entrerait jamais dans la room.
    if (socket.connected) onConnect()

    // [CONCEPT: fonction de nettoyage] Renvoyee par useEffect, React l'appelle au
    // demontage. On quitte la room et on RETIRE chaque ecouteur : sans cela, les
    // handlers s'empileraient a chaque montage (fuite memoire, evenements traites
    // plusieurs fois). On ne ferme PAS la socket : elle est partagee par l'app.
    return () => {
      socket.emit(ClientEvents.LEAVE_BOARD, { boardId })
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off(ServerEvents.PRESENCE_STATE, onPresenceState)
      socket.off(ServerEvents.PRESENCE_JOINED, onPresenceJoined)
      socket.off(ServerEvents.PRESENCE_LEFT, onPresenceLeft)
      socket.off(ServerEvents.CARD_MOVED, onCardMoved)
    }
    // Dependances : on refait tout ce cablage si le tableau ou l'utilisateur change.
  }, [boardId, identity.userId, identity.displayName])

  // Expose l'etat au composant.
  return { connected, members, lastMove }
}
