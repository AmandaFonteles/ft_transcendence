// =============================================================================
// presence.registry.ts : qui est connecte, et sur quels tableaux.
// Etat EN MEMOIRE (pas en base) : la presence est ephemere et meurt avec le process.
// La persister serait une erreur (des "fantomes" resteraient apres un crash serveur).
// LIMITE ASSUMEE : valable pour UNE instance de backend. Avec plusieurs instances,
// il faudrait un adaptateur Redis (deja identifie comme option future).
// =============================================================================

// Importe @Injectable pour que Nest puisse fournir ce registre par injection.
import { Injectable } from '@nestjs/common'
// Importe le type d'identite publique defini dans le contrat.
import { PresenceUser } from './realtime.events'

// Ce qu'on retient d'une socket connectee.
interface SocketState {
  // L'utilisateur authentifie derriere cette socket.
  user: PresenceUser
  // Les tableaux rejoints par cette socket.
  // [CONCEPT: Set] collection SANS doublon : rejoindre deux fois le meme tableau
  // n'ajoute qu'une entree, et la suppression est immediate (pas de recherche lineaire).
  boards: Set<string>
}

// Rend le registre injectable dans le gateway.
@Injectable()
export class PresenceRegistry {
  // [CONCEPT: Map] table cle -> valeur. Cle = socket.id (unique par connexion).
  // Pourquoi indexer par socket et non par utilisateur : un meme utilisateur peut
  // ouvrir PLUSIEURS onglets ; chacun est une socket distincte a suivre separement.
  private readonly sockets = new Map<string, SocketState>()

  // Enregistre une nouvelle connexion.
  register(socketId: string, user: PresenceUser): void {
    // On demarre sans aucun tableau : le client rejoindra explicitement ensuite.
    this.sockets.set(socketId, { user, boards: new Set() })
  }

  // Supprime la socket du registre et renvoie son etat (pour prevenir les rooms quittees).
  // Renvoie undefined si la socket etait inconnue (deconnexion avant authentification).
  unregister(socketId: string): SocketState | undefined {
    // Recupere l'etat avant suppression : l'appelant en a besoin pour notifier les autres.
    const state = this.sockets.get(socketId)
    // Retire l'entree : sans cela, la Map grossirait indefiniment (fuite memoire).
    this.sockets.delete(socketId)
    // Renvoie l'etat pour que le gateway diffuse les evenements de depart.
    return state
  }

  // Note qu'une socket a rejoint un tableau.
  joinBoard(socketId: string, boardId: string): void {
    // Ajoute le tableau a l'ensemble ; "?." ne fait rien si la socket est inconnue.
    this.sockets.get(socketId)?.boards.add(boardId)
  }

  // Note qu'une socket a quitte un tableau.
  leaveBoard(socketId: string, boardId: string): void {
    // Retire le tableau de l'ensemble.
    this.sockets.get(socketId)?.boards.delete(boardId)
  }

  // Renvoie l'utilisateur associe a une socket (undefined si inconnue).
  getUser(socketId: string): PresenceUser | undefined {
    // Lecture directe dans la Map.
    return this.sockets.get(socketId)?.user
  }

  // Liste les utilisateurs presents sur un tableau, SANS doublon.
  listBoardMembers(boardId: string): PresenceUser[] {
    // Map temporaire userId -> utilisateur : deduplique les onglets multiples d'une
    // meme personne (sinon elle apparaitrait 3 fois si elle a 3 onglets ouverts).
    const unique = new Map<string, PresenceUser>()
    // Parcourt toutes les sockets connues.
    for (const state of this.sockets.values()) {
      // Ne garde que celles ayant rejoint CE tableau.
      if (state.boards.has(boardId)) {
        // Indexe par userId : les doublons s'ecrasent naturellement.
        unique.set(state.user.userId, state.user)
      }
    }
    // Convertit les valeurs en tableau simple, serialisable en JSON.
    return [...unique.values()]
  }

  // Indique si un utilisateur a ENCORE au moins une socket sur ce tableau.
  // Pourquoi c'est necessaire : fermer un onglet ne veut pas dire "parti" si deux
  // autres restent ouverts. Sans ce test, on annoncerait a tort son depart.
  hasOtherSocketOnBoard(userId: string, boardId: string, excludeSocketId: string): boolean {
    // Parcourt les paires (socketId, etat).
    for (const [socketId, state] of this.sockets.entries()) {
      // Ignore la socket en cours de deconnexion.
      if (socketId === excludeSocketId) continue
      // Trouve une autre socket du meme utilisateur sur le meme tableau.
      if (state.user.userId === userId && state.boards.has(boardId)) return true
    }
    // Aucune autre socket : l'utilisateur quitte reellement le tableau.
    return false
  }
}
