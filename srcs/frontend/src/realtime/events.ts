// =============================================================================
// events.ts : copie CLIENT du contrat d'evenements (backend/src/realtime/realtime.events.ts).
// Les deux fichiers doivent rester identiques : toute modification se fait des DEUX cotes.
// Pourquoi dupliquer plutot que partager : front et back sont deux paquets npm distincts,
// dans deux conteneurs ; un vrai partage exigerait un monorepo (workspace), complexite
// non justifiee ici. Le contrat est court et stable.
// =============================================================================

// Noms des evenements ENTRANTS pour le serveur (client -> serveur).
export const ClientEvents = {
  JOIN_BOARD: 'board:join',
  LEAVE_BOARD: 'board:leave',
  CARD_MOVED: 'card:moved',

  JOIN_ORG: 'org:join',
  LEAVE_ORG: 'org:leave',
  MESSAGE_SEND: 'message:send',
} as const

// Noms des evenements SORTANTS du serveur (serveur -> client).
export const ServerEvents = {
  BOARD_JOINED: 'board:joined',
  PRESENCE_JOINED: 'presence:joined',
  PRESENCE_LEFT: 'presence:left',
  PRESENCE_STATE: 'presence:state',
  CARD_MOVED: 'card:moved',
  ERROR: 'realtime:error',

  ORG_JOINED: 'org:joined',
  MESSAGE_NEW: 'message:new',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend:request_accepted',
  FRIEND_REMOVED: 'friend:removed',

  // Gestion des membres d'un projet, diffusee dans le salon du projet.
  // DOIT rester identique au contrat backend (realtime.events.ts).
  MEMBER_ADDED: 'member:added',
  MEMBER_REMOVED: 'member:removed',
  MEMBER_ROLE_CHANGED: 'member:role_changed',
} as const


export interface OnlineStatusEvent {
  userId: string
  isOnline: boolean
}

// Identite publique d'un membre presente dans l'UI.
export interface PresenceUser {
  userId: string
  displayName: string
}

// Payload d'un deplacement de carte, enrichi de l'auteur au retour du serveur.
export interface CardMovedEvent {
  boardId: string
  cardId: string
  toListId: string
  // Position fractionnaire (LexoRank) : chaine, pas nombre.
  position: string
  // Present uniquement sur l'evenement RECU (le serveur ajoute l'auteur).
  movedBy?: PresenceUser
}

export interface OrgScopePayload {
  organizationId: string
}

export interface MessageSendPayload {
  organizationId: string
  content: string
}

export interface ChatMessageEvent {
  id: string
  content: string
  createdAt: string
  organizationId: string
  author: PresenceUser
}
