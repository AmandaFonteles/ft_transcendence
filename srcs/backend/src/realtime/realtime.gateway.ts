// =============================================================================
// realtime.gateway.ts : LE point d'entree WebSocket du projet.
// [CONCEPT: gateway NestJS] Un gateway est a WebSocket ce qu'un controller est a
// HTTP : il declare des handlers d'evenements au lieu de routes. Meme injection de
// dependances, meme cycle de vie.
// =============================================================================

// Importe le logger de Nest (journalisation coherente avec le reste de l'app).
import { Logger } from '@nestjs/common'
// Importe les decorateurs et interfaces WebSocket de Nest.
import {
  // Marque une methode comme handler d'un evenement entrant.
  SubscribeMessage,
  // Declare la classe comme gateway WebSocket.
  WebSocketGateway,
  // Injecte l'instance serveur Socket.IO dans une propriete.
  WebSocketServer,
  // Interfaces de cycle de vie : appelees a la connexion / deconnexion d'un client.
  OnGatewayConnection,
  OnGatewayDisconnect,
  // Extrait la socket cliente dans un handler.
  ConnectedSocket,
  // Extrait le payload (corps) de l'evenement recu.
  MessageBody,
} from '@nestjs/websockets'
// Importe les types Socket.IO (Server = le hub, Socket = une connexion cliente).
import { Server, Socket } from 'socket.io'
// Importe le registre de presence.
import { PresenceRegistry } from './presence.registry'
// Importe le contrat partage (noms d'evenements, helper de room, types de payloads).
import {
  ClientEvents,
  ServerEvents,
  boardRoom,
  BoardScopePayload,
  CardMovedPayload,
  PresenceUser,
} from './realtime.events'

// [CONCEPT: chemin Socket.IO] "path" doit correspondre EXACTEMENT a la regle nginx
// qui proxifie le WebSocket. Socket.IO utilise /socket.io/ par defaut ; on l'ecrit
// explicitement pour rendre le couplage avec nginx.conf visible et intentionnel.
// Pas de "cors" ici : tout passe par nginx en meme origine, donc aucun CORS a gerer.
@WebSocketGateway({ path: '/socket.io' })
// Implemente les deux hooks de cycle de vie pour gerer connexion et deconnexion.
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Injecte l'instance du serveur Socket.IO (permet d'emettre vers n'importe quelle room).
  @WebSocketServer()
  private server!: Server

  // Logger nomme : les messages apparaitront prefixes par "RealtimeGateway".
  private readonly logger = new Logger(RealtimeGateway.name)

  // Injection du registre de presence (fourni par RealtimeModule).
  constructor(private readonly presence: PresenceRegistry) {}

  // -------------------------------------------------------------------------
  // Cycle de vie
  // -------------------------------------------------------------------------

  // Appele automatiquement des qu'un client etablit la connexion WebSocket.
  handleConnection(client: Socket): void {
    // [SEAM: AUTH — Qu] Aujourd'hui l'identite arrive dans le "handshake" (auth.userId).
    // A remplacer par la verification du JWT de Qu :
    //   const payload = this.jwtService.verify(client.handshake.auth.token)
    // Pourquoi valider ICI et pas dans chaque handler : une socket non authentifiee
    // ne doit jamais entrer dans une room. On filtre une fois, a la porte.
    const auth = client.handshake.auth as { userId?: string; displayName?: string }

    // Refuse la connexion si l'identite est absente.
    if (!auth?.userId) {
      // Informe le client de la raison avant de fermer (sinon il ne saurait pas pourquoi).
      client.emit(ServerEvents.ERROR, { message: 'authentification requise' })
      // Ferme la connexion cote serveur.
      client.disconnect(true)
      // Arrete le traitement.
      return
    }

    // Construit l'identite publique (jamais l'email : donnee privee).
    const user: PresenceUser = {
      userId: auth.userId,
      // Repli sur l'identifiant si aucun nom d'affichage n'est fourni.
      displayName: auth.displayName ?? auth.userId,
    }

    // Memorise la socket dans le registre de presence.
    this.presence.register(client.id, user)
    // Trace utile au debogage (visible via "make logs").
    this.logger.log(`connexion ${client.id} (user ${user.userId})`)
  }

  // Appele automatiquement quand un client se deconnecte (fermeture, reseau, onglet ferme).
  handleDisconnect(client: Socket): void {
    // Retire la socket du registre et recupere son etat pour prevenir les rooms.
    const state = this.presence.unregister(client.id)
    // Rien a faire si la socket n'etait pas enregistree (refusee a la connexion).
    if (!state) return

    // Previent chaque tableau que cette socket avait rejoint.
    for (const boardId of state.boards) {
      // N'annonce le depart que si l'utilisateur n'a plus AUCUNE autre socket ici.
      // Sans ce test, fermer un onglet sur trois ferait disparaitre l'utilisateur a tort.
      if (!this.presence.hasOtherSocketOnBoard(state.user.userId, boardId, client.id)) {
        // Diffuse le depart aux membres restants du tableau.
        this.server.to(boardRoom(boardId)).emit(ServerEvents.PRESENCE_LEFT, state.user)
      }
    }

    // Trace de deconnexion.
    this.logger.log(`deconnexion ${client.id}`)
    // NB : Socket.IO retire automatiquement la socket de ses rooms a la deconnexion.
  }

  // -------------------------------------------------------------------------
  // Handlers d'evenements
  // -------------------------------------------------------------------------

  // Handler de "board:join" (nom pris dans le contrat, jamais ecrit en dur).
  @SubscribeMessage(ClientEvents.JOIN_BOARD)
  async handleJoinBoard(
    // Socket emettrice, injectee par Nest.
    @ConnectedSocket() client: Socket,
    // Payload envoye par le client, type par le contrat.
    @MessageBody() payload: BoardScopePayload,
  ): Promise<void> {
    // Recupere l'utilisateur authentifie associe a cette socket.
    const user = this.presence.getUser(client.id)
    // Securite : socket inconnue (ne devrait pas arriver apres handleConnection).
    if (!user) return

    // Valide le payload : un client malveillant peut envoyer n'importe quoi.
    if (!payload?.boardId) {
      // Signale l'erreur au seul emetteur.
      client.emit(ServerEvents.ERROR, { message: 'boardId manquant' })
      return
    }

    // [SEAM: PERMISSIONS — Am] Verifier ici que l'utilisateur a acces a ce tableau :
    //   if (!await this.permissions.canViewBoard(user.userId, payload.boardId)) { ... }
    // Pourquoi c'est CRITIQUE : sans ce controle, n'importe qui connaissant un boardId
    // recoit en direct toutes ses mises a jour. Une room n'est PAS une protection.

    // Calcule le nom canonique de la room.
    const room = boardRoom(payload.boardId)
    // Abonne la socket a la room : elle recevra les emissions destinees a ce tableau.
    await client.join(room)
    // Met a jour le registre de presence.
    this.presence.joinBoard(client.id, payload.boardId)

    // Envoie a l'arrivant la liste complete des presents (etat initial).
    client.emit(ServerEvents.PRESENCE_STATE, this.presence.listBoardMembers(payload.boardId))
    // Accuse reception de l'entree dans la room.
    client.emit(ServerEvents.BOARD_JOINED, { boardId: payload.boardId })

    // [CONCEPT: client.to(...) vs server.to(...)] "client.to(room)" exclut l'emetteur,
    // "this.server.to(room)" l'inclut. Ici on previent les AUTRES : l'arrivant vient
    // deja de recevoir PRESENCE_STATE, il n'a pas besoin d'etre annonce a lui-meme.
    client.to(room).emit(ServerEvents.PRESENCE_JOINED, user)
  }

  // Handler de "board:leave".
  @SubscribeMessage(ClientEvents.LEAVE_BOARD)
  async handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: BoardScopePayload,
  ): Promise<void> {
    // Identite de l'emetteur.
    const user = this.presence.getUser(client.id)
    // Ignore si socket inconnue ou payload invalide.
    if (!user || !payload?.boardId) return

    // Nom de la room a quitter.
    const room = boardRoom(payload.boardId)
    // Desabonne la socket : elle ne recevra plus les emissions de ce tableau.
    await client.leave(room)
    // Met a jour le registre.
    this.presence.leaveBoard(client.id, payload.boardId)

    // N'annonce le depart que si l'utilisateur n'a plus d'autre onglet sur ce tableau.
    if (!this.presence.hasOtherSocketOnBoard(user.userId, payload.boardId, client.id)) {
      // Previent les membres restants.
      client.to(room).emit(ServerEvents.PRESENCE_LEFT, user)
    }
  }

  // Handler de "card:moved" : le cas d'usage principal du temps reel produit.
  @SubscribeMessage(ClientEvents.CARD_MOVED)
  async handleCardMoved(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CardMovedPayload,
  ): Promise<void> {
    // Identite de l'emetteur.
    const user = this.presence.getUser(client.id)
    // Securite.
    if (!user) return

    // Valide le payload avant tout traitement.
    if (!payload?.boardId || !payload?.cardId || !payload?.toListId) {
      client.emit(ServerEvents.ERROR, { message: 'payload card:moved invalide' })
      return
    }

    // [SEAM: PERMISSIONS — Am] Verifier le droit d'ECRITURE (pas seulement de lecture) :
    //   if (!await this.permissions.canEditBoard(user.userId, payload.boardId)) { ... }

    // [SEAM: PERSISTANCE — Ai] Enregistrer le deplacement AVANT de le diffuser :
    //   await this.cardsService.move(payload.cardId, payload.toListId, payload.position)
    // [CONCEPT: le serveur est la source de verite] Diffuser sans persister ferait
    // diverger les clients de la base : la carte "bougerait" a l'ecran puis reviendrait
    // au rechargement. On persiste D'ABORD, on diffuse ENSUITE. Si l'ecriture echoue,
    // on n'emet rien et on renvoie une erreur a l'emetteur.

    // [SEAM: EVENT BACKBONE — Am] Emettre ici un activity_event pour l'analytics
    // et les notifications d'Ai (ex. "X a deplace la carte Y").

    // Diffuse le deplacement aux AUTRES membres du tableau.
    // Pourquoi exclure l'emetteur : son interface a deja applique le mouvement en
    // optimiste ; le lui renvoyer provoquerait un scintillement visuel.
    client.to(boardRoom(payload.boardId)).emit(ServerEvents.CARD_MOVED, {
      // On rediffuse le payload valide, enrichi de l'auteur.
      ...payload,
      // Permet a l'UI d'afficher "deplace par ...".
      movedBy: user,
    })
  }
}
