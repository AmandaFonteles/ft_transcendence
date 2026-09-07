import { io, Socket } from 'socket.io-client'

// Une seule connexion Socket.IO pour toute l'application : un module ES n'etant
// evalue qu'une fois, toute importation recupere la meme instance. Ouvrir une
// socket par composant ferait apparaitre le meme utilisateur plusieurs fois dans
// la presence.
let socket: Socket | null = null

// Variable de module et non parametre : le callback "auth" ci-dessous est rappele
// a chaque tentative de connexion, reconnexions comprises, et doit lire le jeton
// du moment. Comme cote React, il ne vit qu'en memoire.
let accessToken: string | null = null

export function setSocketAccessToken(token: string | null): void {
  accessToken = token
}

// Renvoie la socket partagee, en la creant au premier appel. On envoie le meme
// jeton que pour les appels HTTP : le serveur en deduit l'identite plutot que de
// croire un userId que le client s'attribuerait lui-meme.
export function getSocket(): Socket {
  if (socket) return socket

  // URL vide volontairement : le client vise l'origine de la page (nginx). Le nom
  // "backend:3000" n'existe que dans le reseau Docker, le navigateur ne le resout pas.
  socket = io({
    path: '/socket.io',
    // Une fonction et non un objet : un objet serait fige a la creation, et la
    // reconnexion rejouerait indefiniment un jeton expire.
    auth: (cb) => cb({ token: accessToken }),
    // Pas de repli en long-polling : si nginx est mal configure, on veut une erreur
    // visible plutot qu'un fonctionnement degrade silencieux.
    transports: ['websocket'],
  })

  return socket
}

export function closeSocket(): void {
  socket?.disconnect()
  socket = null
  // Oublier le jeton : sans ca, une socket recreee juste apres une deconnexion se
  // reconnecterait avec les identifiants de l'utilisateur precedent.
  accessToken = null
}
