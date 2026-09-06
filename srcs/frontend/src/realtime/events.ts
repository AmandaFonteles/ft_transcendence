// =============================================================================
// events.ts : copie CLIENT du contrat d'evenements (backend/src/realtime/realtime.events.ts).
// Les deux fichiers doivent rester identiques : toute modification se fait des DEUX cotes.
// Pourquoi dupliquer plutot que partager : front et back sont deux paquets npm distincts,
// dans deux conteneurs ; un vrai partage exigerait un monorepo (workspace), complexite
// non justifiee ici. Le contrat est court et stable.
// =============================================================================

// Noms des evenements ENTRANTS pour le serveur (client -> serveur).
export const ClientEvents = {
  JOIN_ORG: 'org:join',
  LEAVE_ORG: 'org:leave',
  MESSAGE_SEND: 'message:send',
} as const

// Noms des evenements SORTANTS du serveur (serveur -> client).
export const ServerEvents = {
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

  // Gestion des taches d'un projet, diffusee dans le salon du projet.
  // DOIT rester identique au contrat backend (realtime.events.ts).
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_UNASSIGNED: 'task:unassigned',
} as const


export interface OnlineStatusEvent {
  userId: string
  isOnline: boolean
}

// Identite publique d'un utilisateur telle qu'elle arrive dans les evenements
// (auteur d'un message, par exemple). Etablie par le serveur a partir du jeton
// verifie au handshake : le client ne la declare jamais.
export interface PresenceUser {
  userId: string
  displayName: string
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

// Payload minimal des evenements de taches : juste de quoi savoir qu'il faut
// recharger la liste depuis l'API (voir useTaskEvents.ts).
export interface TaskEventPayload {
  organizationId: string
  taskId: string
}
