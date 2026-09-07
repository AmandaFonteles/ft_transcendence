// Copie client du contrat d'evenements (backend/src/realtime/realtime.events.ts).
// Les deux fichiers doivent rester identiques : toute modification se fait des
// deux cotes, front et back etant deux paquets npm distincts.

// --- Evenements entrants (client -> serveur) --------------------------------

export const ClientEvents = {
  JOIN_ORG: 'org:join',
  LEAVE_ORG: 'org:leave',
  MESSAGE_SEND: 'message:send',
} as const

// --- Evenements sortants (serveur -> client) --------------------------------

export const ServerEvents = {
  ERROR: 'realtime:error',

  ORG_JOINED: 'org:joined',
  MESSAGE_NEW: 'message:new',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend:request_accepted',
  FRIEND_REMOVED: 'friend:removed',

  MEMBER_ADDED: 'member:added',
  MEMBER_REMOVED: 'member:removed',
  MEMBER_ROLE_CHANGED: 'member:role_changed',

  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_UNASSIGNED: 'task:unassigned',

  FILE_CREATED: 'file:created',
  FILE_UPDATED: 'file:updated',
  FILE_DELETED: 'file:deleted',
} as const

// --- Formes des payloads ----------------------------------------------------

export interface OnlineStatusEvent {
  userId: string
  isOnline: boolean
}

// Etablie par le serveur a partir du jeton verifie au handshake : le client ne
// la declare jamais.
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

// Payload minimal : juste de quoi savoir qu'il faut recharger depuis l'API.
export interface TaskEventPayload {
  organizationId: string
  taskId: string
}

export interface FileEventPayload {
  organizationId: string
  fileId: string
}
