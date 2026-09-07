// Contrat d'evenements temps reel : un seul endroit definit les noms et les
// formes des messages WebSocket, partages par le gateway et le front.

// --- Evenements entrants (client -> serveur) --------------------------------

export const ClientEvents = {
  JOIN_ORG: 'org:join',
  LEAVE_ORG: 'org:leave',
  MESSAGE_SEND: 'message:send',
} as const

// --- Evenements sortants (serveur -> client) --------------------------------

export const ServerEvents = {
  // Renvoye au seul client concerne, jamais diffuse dans une room.
  ERROR: 'realtime:error',

  ORG_JOINED: 'org:joined',
  MESSAGE_NEW: 'message:new',

  // Diffuses dans la room personnelle de chaque ami.
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  FRIEND_REQUEST_RECEIVED: 'friend:request_received',
  FRIEND_REQUEST_ACCEPTED: 'friend:request_accepted',
  FRIEND_REMOVED: 'friend:removed',

  // Diffuses dans le salon du projet (orgRoom), pas a un utilisateur precis.
  MEMBER_ADDED: 'member:added',
  MEMBER_REMOVED: 'member:removed',
  MEMBER_ROLE_CHANGED: 'member:role_changed',

  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_UNASSIGNED: 'task:unassigned',
} as const

// --- Formes des payloads (verifiees a la compilation) -----------------------

// Identite etablie au handshake a partir du jeton verifie, jamais declaree par
// le client. Pas d'email : cette forme est diffusee aux autres.
export interface PresenceUser {
  userId: string
  displayName: string
}

export function orgRoom(organizationId: string): string {
  return `org:${organizationId}`
}

// --- Chat par projet --------------------------------------------------------

export interface OrgScopePayload {
  organizationId: string
}

export interface MessageSendPayload {
  organizationId: string
  content: string
}

// Message diffuse apres persistance, jamais avant (voir gateway).
export interface ChatMessage {
  id: string
  content: string
  createdAt: string
  organizationId: string
  author: PresenceUser
}

// Room personnelle : cible "tous les amis de X" sans qu'ils rejoignent une room
// par ami.
export function userRoom(userId: string): string {
  return `user:${userId}`
}

export interface OnlineStatusEvent {
  userId: string
  isOnline: boolean
}

// Payload minimal : le client recharge la liste depuis l'API en recevant
// l'evenement, car le backend applique des regles qu'il ignore (dernier
// administrateur non retrogradable, projet supprime au depart du dernier membre).
export interface MemberEventPayload {
  organizationId: string
  userId: string
  role?: 'ADMIN' | 'MEMBER'
}

// Meme raisonnement : de quoi savoir quoi recharger, pas la tache entiere.
export interface TaskEventPayload {
  organizationId: string
  taskId: string
}
