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
// "string" mais exactement "board:join", ce qui permet a TypeScript de les verifier.
export const ClientEvents = {
  // Le client demande a rejoindre la "room" d'un tableau (pour en recevoir les mises a jour).
  JOIN_BOARD: 'board:join',
  // Le client quitte la room d'un tableau (ex. il navigue ailleurs).
  LEAVE_BOARD: 'board:leave',
  // Le client signale qu'il a deplace une carte (sera persiste PUIS rediffuse).
  CARD_MOVED: 'card:moved',
  // AJOUT tchat
  JOIN_ORG: 'org:join',
  LEAVE_ORG: 'org:leave',
  MESSAGE_SEND: 'message:send',
} as const

// Noms d'evenements SORTANTS (serveur -> client).
export const ServerEvents = {
  // Confirme au client qu'il est bien entre dans la room (accuse de reception).
  BOARD_JOINED: 'board:joined',
  // Un membre a rejoint le tableau (diffuse aux AUTRES membres).
  PRESENCE_JOINED: 'presence:joined',
  // Un membre a quitte le tableau ou s'est deconnecte.
  PRESENCE_LEFT: 'presence:left',
  // Liste complete des membres presents (envoyee a l'arrivee).
  PRESENCE_STATE: 'presence:state',
  // Une carte a bouge : rediffusion aux autres membres du tableau.
  CARD_MOVED: 'card:moved',
  // Erreur applicative (ex. acces refuse) renvoyee au seul client concerne.
  ERROR: 'realtime:error',
  //ajout tchat
  ORG_JOINED: 'org:joined',
  MESSAGE_NEW: 'message:new',

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

// [CONCEPT: convention de nommage des rooms] Une "room" Socket.IO est juste une
// chaine ; on centralise sa construction pour que TOUT LE MONDE cible la meme.
// Pourquoi prefixer par "board:" : on aura d'autres familles de rooms plus tard
// (ex. "org:<id>", "user:<id>") ; le prefixe evite toute collision d'identifiants.
export function boardRoom(boardId: string): string {
  // Construit le nom canonique de la room d'un tableau.
  return `board:${boardId}`
}

// --- Formes des payloads (verifiees a la compilation) -----------------------

// Payload envoye par le client pour rejoindre/quitter un tableau.
export interface BoardScopePayload {
  // Identifiant du tableau concerne (cuid, cf. schema.prisma).
  boardId: string
}

// Payload d'un deplacement de carte.
export interface CardMovedPayload {
  // Tableau auquel appartient la carte (sert a cibler la room).
  boardId: string
  // Carte deplacee.
  cardId: string
  // Liste de destination.
  toListId: string
  // Position dans la liste de destination. STRING et non number : l'equipe a choisi
  // l'indexation fractionnaire (LexoRank), qui evite les conflits de reordonnancement
  // quand deux utilisateurs deplacent des cartes simultanement.
  position: string
}

// Identite minimale d'un membre presente aux autres (jamais l'email : donnee privee).
export interface PresenceUser {
  // Identifiant de l'utilisateur.
  userId: string
  // Nom affichable dans l'UI (avatars, "X est en train de regarder ce tableau").
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
