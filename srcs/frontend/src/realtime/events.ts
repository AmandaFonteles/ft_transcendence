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
} as const

// Noms des evenements SORTANTS du serveur (serveur -> client).
export const ServerEvents = {
  BOARD_JOINED: 'board:joined',
  PRESENCE_JOINED: 'presence:joined',
  PRESENCE_LEFT: 'presence:left',
  PRESENCE_STATE: 'presence:state',
  CARD_MOVED: 'card:moved',
  ERROR: 'realtime:error',
} as const

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
