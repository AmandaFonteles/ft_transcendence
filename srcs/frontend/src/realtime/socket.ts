// =============================================================================
// socket.ts : cree et partage UNE SEULE connexion Socket.IO pour toute l'app.
// [CONCEPT: singleton] Un module ES n'est evalue qu'une fois : toute importation
// recupere la meme instance. Pourquoi c'est important : ouvrir une socket par
// composant multiplierait les connexions et ferait apparaitre le meme utilisateur
// plusieurs fois dans la presence.
// =============================================================================

// Importe la fabrique de connexion et le type de socket.
import { io, Socket } from 'socket.io-client'

// Reference conservee entre les appels (null tant qu'aucune connexion n'existe).
let socket: Socket | null = null

// Identite passee au serveur lors du handshake.
export interface SocketIdentity {
  userId: string
  displayName: string
}

// Renvoie la socket partagee, en la creant au premier appel.
export function getSocket(identity: SocketIdentity): Socket {
  // Si elle existe deja, on la reutilise (garantie du singleton).
  if (socket) return socket

  // URL VIDE volontairement : le client se connecte a l'origine de la page,
  // c'est-a-dire https://localhost:8443 (nginx). Pourquoi ne pas viser
  // http://backend:3000 : ce nom n'existe QUE dans le reseau Docker, le
  // navigateur ne peut pas le resoudre. Tout passe par nginx.
  socket = io({
    // Doit correspondre au "path" du gateway ET a la regle nginx /socket.io.
    path: '/socket.io',
    // [SEAM: AUTH — Qu] "auth" est envoye au HANDSHAKE, avant tout evenement :
    // c'est ce que lit handleConnection cote serveur. A remplacer par
    // { token: <JWT> } quand l'auth de Qu sera prete.
    auth: identity,
    // Force le WebSocket et interdit le repli en long-polling.
    // Pourquoi : si nginx est mal configure, on veut une ERREUR VISIBLE plutot
    // qu'un fonctionnement degrade silencieux.
    transports: ['websocket'],
  })

  // Renvoie la socket nouvellement creee.
  return socket
}

// Ferme la connexion et oublie l'instance (utile a la deconnexion utilisateur).
export function closeSocket(): void {
  // Demande la fermeture cote client si une socket existe.
  socket?.disconnect()
  // Remet a null pour qu'un prochain getSocket cree une connexion neuve.
  socket = null
}
