// =============================================================================
// presence.registry.ts : qui est connecte, et par combien de sockets.
// Etat EN MEMOIRE (pas en base) : la presence est ephemere et meurt avec le process.
// La persister serait une erreur (des "fantomes" resteraient apres un crash serveur).
// Seul User.isOnline est ecrit en base, et uniquement aux TRANSITIONS (premiere
// socket ouverte / derniere fermee), pas a chaque connexion : c'est ce registre
// qui sait dire s'il s'agit d'une transition ou d'un simple onglet de plus.
// LIMITE ASSUMEE : valable pour UNE instance de backend. Avec plusieurs instances,
// il faudrait un adaptateur Redis (deja identifie comme option future).
// =============================================================================

// Importe @Injectable pour que Nest puisse fournir ce registre par injection.
import { Injectable } from '@nestjs/common'
// Importe le type d'identite publique defini dans le contrat.
import { PresenceUser } from './realtime.events'

// Ce qu'on retient d'une socket connectee.
interface SocketState {
  // L'utilisateur authentifie derriere cette socket, etabli au handshake par
  // verification du jeton (voir realtime.gateway.ts > handleConnection).
  user: PresenceUser
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
    this.sockets.set(socketId, { user })
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

  // Renvoie l'utilisateur associe a une socket (undefined si inconnue).
  getUser(socketId: string): PresenceUser | undefined {
    // Lecture directe dans la Map.
    return this.sockets.get(socketId)?.user
  }

  // Indique si un utilisateur a encore une autre socket connectee, toutes rooms
  // confondues. Sert a ne changer le statut en base qu'au PREMIER onglet ouvert
  // et au DERNIER ferme : sans ce test, fermer un onglet sur trois ferait
  // passer l'utilisateur hors ligne alors qu'il est toujours la.
  hasAnyOtherSocket(userId: string, excludeSocketId: string): boolean {
    for (const [socketId, state] of this.sockets.entries()) {
      if (socketId === excludeSocketId) continue
      if (state.user.userId === userId) return true
    }
    return false
  }
}
