import { Injectable } from '@nestjs/common'
import { PresenceUser } from './realtime.events'

// Etat en memoire : la presence est ephemere et meurt avec le process. Seul
// User.isOnline est ecrit en base, et uniquement aux transitions (premiere
// socket ouverte / derniere fermee).
// Limite assumee : valable pour une seule instance de backend.

interface SocketState {
  user: PresenceUser
}

@Injectable()
export class PresenceRegistry {
  // Indexe par socket et non par utilisateur : un meme utilisateur peut ouvrir
  // plusieurs onglets, chacun etant une socket distincte.
  private readonly sockets = new Map<string, SocketState>()

  register(socketId: string, user: PresenceUser): void {
    this.sockets.set(socketId, { user })
  }

  // Renvoie l'etat avant suppression : l'appelant en a besoin pour prevenir les
  // rooms quittees. undefined si la socket n'etait pas authentifiee.
  unregister(socketId: string): SocketState | undefined {
    const state = this.sockets.get(socketId)
    this.sockets.delete(socketId)
    return state
  }

  getUser(socketId: string): PresenceUser | undefined {
    return this.sockets.get(socketId)?.user
  }

  // Sans ce test, fermer un onglet sur trois ferait passer l'utilisateur hors
  // ligne alors qu'il est toujours connecte.
  hasAnyOtherSocket(userId: string, excludeSocketId: string): boolean {
    for (const [socketId, state] of this.sockets.entries()) {
      if (socketId === excludeSocketId) continue
      if (state.user.userId === userId) return true
    }
    return false
  }
}
