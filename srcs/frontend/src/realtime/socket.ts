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

// [SECURITE] Jeton d'acces courant, conserve ICI et non passe en parametre.
// Pourquoi une variable de module : la fonction "auth" ci-dessous est rappelee a
// CHAQUE tentative de connexion, y compris les reconnexions automatiques. Elle
// doit lire le jeton du moment, pas celui qui existait a la creation de la socket.
// Comme l'access token cote React, il ne vit qu'en memoire : ni localStorage ni
// cookie lisible par le JS.
let accessToken: string | null = null

// Renseigne le jeton a utiliser pour les (re)connexions. Appele par AuthContext
// des qu'un jeton est obtenu ou invalide — c'est le seul point d'entree.
export function setSocketAccessToken(token: string | null): void {
  accessToken = token
}

// Renvoie la socket partagee, en la creant au premier appel.
//
// [SECURITE] On n'envoie PLUS { userId, displayName }. Le serveur ne peut pas
// verifier une identite que le client s'attribue lui-meme : n'importe qui
// pouvait se declarer quelqu'un d'autre et recevoir ses evenements prives.
// On envoie donc le meme jeton que pour les appels HTTP ; le serveur en deduit
// l'identite (voir realtime.gateway.ts > handleConnection).
export function getSocket(): Socket {
  // Si elle existe deja, on la reutilise (garantie du singleton).
  if (socket) return socket

  // URL VIDE volontairement : le client se connecte a l'origine de la page,
  // c'est-a-dire https://localhost:8443 (nginx). Pourquoi ne pas viser
  // http://backend:3000 : ce nom n'existe QUE dans le reseau Docker, le
  // navigateur ne peut pas le resoudre. Tout passe par nginx.
  socket = io({
    // Doit correspondre au "path" du gateway ET a la regle nginx /socket.io.
    path: '/socket.io',
    // [CONCEPT: auth en FONCTION plutot qu'en objet] Un objet serait fige a la
    // creation de la socket. Avec un callback, Socket.IO le rappelle avant
    // chaque tentative : apres un rafraichissement de jeton, la reconnexion
    // presente le NOUVEAU jeton. Avec un objet, elle rejouerait indefiniment
    // l'ancien, et le serveur la refuserait une fois celui-ci expire.
    auth: (cb) => cb({ token: accessToken }),
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
  // Oublie le jeton : sans ca, une socket recreee juste apres une deconnexion
  // se reconnecterait avec les identifiants de l'utilisateur precedent.
  accessToken = null
}
