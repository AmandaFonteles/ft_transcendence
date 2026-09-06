// =============================================================================
// realtime.events.ts : LE CONTRAT d'evenements temps reel.
// Un seul endroit definit les NOMS et les FORMES des messages WebSocket.
// Pourquoi un fichier dedie : le gateway (Ny), le chat (Qu), les notifications (Ai)
// et l'event backbone (Am) doivent parler EXACTEMENT la meme langue. Une chaine
// magique tapee a la main dans deux modules = un bug silencieux (rien ne se passe,
// aucune erreur). Ici, une faute de frappe casse la COMPILATION.
// =============================================================================

// [CONCEPT: objet-constante comme enum] Regroupe les noms d'evenements ENTRANTS
// (client -> serveur). "as const" fige les valeurs en litteraux : leur type n'est pas
// "string" mais exactement "org:join", ce qui permet a TypeScript de les verifier.
export const ClientEvents = {
  // Le client demande a rejoindre la "room" d'un projet : il y recevra le chat,
  // les changements de membres et les changements de taches.
  JOIN_ORG: 'org:join',
  // Le client quitte la room d'un projet (ex. il navigue ailleurs).
  LEAVE_ORG: 'org:leave',
  // Le client poste un message dans le chat du projet.
  MESSAGE_SEND: 'message:send',
} as const

// Noms d'evenements SORTANTS (serveur -> client).
export const ServerEvents = {
  // Erreur applicative (acces refuse, jeton invalide...) renvoyee au seul client
  // concerne, jamais diffusee dans une room.
  ERROR: 'realtime:error',

  // Confirme au client qu'il est bien entre dans le salon d'un projet.
  ORG_JOINED: 'org:joined',
  // Nouveau message de chat, diffuse a tout le salon du projet (emetteur inclus).
  MESSAGE_NEW: 'message:new',

  // Statut de presence, diffuse dans la room personnelle de chaque AMI.
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend:request_accepted',
  FRIEND_REMOVED: 'friend:removed',

  // Gestion des membres d'un projet. Diffuses dans le SALON DU PROJET (orgRoom),
  // pas a un utilisateur precis : tous les membres presents doivent voir la
  // liste evoluer, pas seulement la personne concernee.
  MEMBER_ADDED: 'member:added',
  MEMBER_REMOVED: 'member:removed',
  MEMBER_ROLE_CHANGED: 'member:role_changed',

  // Gestion des taches d'un projet. Meme convention que les evenements de
  // membres : diffuses dans le salon du projet (orgRoom), payload minimal
  // (identifiants seulement), le client RECHARGE la liste depuis l'API.
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_UNASSIGNED: 'task:unassigned',
} as const

// --- Formes des payloads (verifiees a la compilation) -----------------------

// [CONCEPT: convention de nommage des rooms] Une "room" Socket.IO est juste une
// chaine ; on centralise sa construction pour que TOUT LE MONDE cible la meme.
// Le prefixe evite toute collision entre les deux familles de rooms du projet :
// "org:<id>" (un projet) et "user:<id>" (une personne).

// Identite minimale d'un utilisateur derriere une socket. Etablie au handshake a
// partir du jeton verifie, jamais declaree par le client. L'EMAIL N'Y FIGURE PAS :
// cette forme est diffusee aux autres (auteur d'un message, par exemple).
export interface PresenceUser {
  // Identifiant de l'utilisateur.
  userId: string
  // Nom affichable dans l'UI, relu en base au handshake.
  displayName: string
}

export function orgRoom(organizationId: string): string {
  return `org:${organizationId}`
}

// --- Chat par projet ---------------------------------------------------------

// Payload pour rejoindre/quitter la room de chat d'un projet.
export interface OrgScopePayload {
  organizationId: string
}

// Payload envoye par le client pour poster un message.
export interface MessageSendPayload {
  organizationId: string
  content: string
}

// Forme d'un message diffuse (apres persistance, jamais avant : voir gateway).
export interface ChatMessage {
  id: string
  content: string
  createdAt: string
  organizationId: string
  author: PresenceUser
}

// Room personnelle : permet de cibler "tous les amis de X" sans que chacun
// ait a rejoindre une room par ami.
export function userRoom(userId: string): string {
  return `user:${userId}`
}

export interface OnlineStatusEvent {
  userId: string
  isOnline: boolean
}

// Payload des evenements de membres. On ne transmet que l'identifiant et le role :
// le client RECHARGE la liste depuis l'API en recevant l'evenement, plutot que de
// reconstituer son etat a partir du message.
// Pourquoi : le backend applique des regles que le client ignore (dernier
// administrateur non retrogradable, projet supprime quand le dernier membre part).
// Un client qui bricolerait sa liste divergerait de la verite serveur.
export interface MemberEventPayload {
  organizationId: string
  userId: string
  role?: 'ADMIN' | 'MEMBER'
}

// Payload des evenements de taches. Meme raisonnement que MemberEventPayload :
// pas la tache entiere, juste de quoi savoir QUOI recharger. Les regles de
// visibilite (qui voit quelle tache) restent arbitrees par le backend au
// prochain GET, jamais deduites du payload cote client.
export interface TaskEventPayload {
  organizationId: string
  taskId: string
}
