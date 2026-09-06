// =============================================================================
// realtime.gateway.ts : LE point d'entree WebSocket du projet.
// [CONCEPT: gateway NestJS] Un gateway est a WebSocket ce qu'un controller est a
// HTTP : il declare des handlers d'evenements au lieu de routes. Meme injection de
// dependances, meme cycle de vie.
// =============================================================================

// Importe le logger de Nest (journalisation coherente avec le reste de l'app).
import { Logger, Inject, forwardRef } from '@nestjs/common'
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
// Importe le service JWT : c'est lui qui verifie le jeton presente au handshake.
import { JwtService } from '@nestjs/jwt'
// Importe le registre de presence.
import { PresenceRegistry } from './presence.registry'
// Importe le contrat partage (noms d'evenements, helper de room, types de payloads).
import { MessageService } from '../chat/message.service'
import {
  ClientEvents,
  ServerEvents,
  orgRoom,
  OrgScopePayload,
  MessageSendPayload,
  PresenceUser,
  userRoom
} from './realtime.events'

import { UsersService } from '../users/users.service'
import { FriendshipService } from '../friendship/friendship.service'

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
  constructor(
    private readonly presence: PresenceRegistry,
    private readonly messages: MessageService,
    // Verification du jeton d'acces presente au handshake (voir handleConnection).
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => UsersService))
    private readonly users: UsersService,
    @Inject(forwardRef(() => FriendshipService))
    private readonly friendship: FriendshipService,
  ) {}

  // -------------------------------------------------------------------------
  // Cycle de vie
  // -------------------------------------------------------------------------

  // Refuse une socket en expliquant pourquoi AVANT de la fermer.
  // L'ordre compte : en appelant disconnect() d'abord, le client ne recevrait
  // jamais le message et verrait une coupure silencieuse, impossible a
  // diagnostiquer. Le "true" ferme la connexion sous-jacente au lieu de la
  // laisser ouverte en attente.
  private rejectConnection(client: Socket, message: string): void {
    client.emit(ServerEvents.ERROR, { message })
    client.disconnect(true)
  }

  // [SECURITE] Le handshake est le SEUL endroit ou l'identite d'une socket est
  // etablie : tout le reste du gateway lit ensuite cette identite dans le
  // PresenceRegistry. Il doit donc etre aussi strict qu'un guard HTTP.
  //
  // AVANT, le client envoyait { userId, displayName } et on le croyait sur
  // parole. N'importe qui pouvait alors ouvrir une socket en se declarant
  // quelqu'un d'autre : lire le chat des projets de sa cible, y poster en son
  // nom, et manipuler son statut en ligne. Une room n'est PAS une protection si
  // l'identite qui y entre n'est pas verifiee.
  //
  // MAINTENANT, le client envoie { token } : le meme jeton d'acces que pour les
  // routes HTTP. On le verifie ici exactement comme le fait JwtStrategy cote
  // HTTP (meme secret, signature + expiration), et l'identite vient de la BASE,
  // jamais du client.
  async handleConnection(client: Socket): Promise<void> {
    const { token } = client.handshake.auth as { token?: string }

    if (!token) {
      this.rejectConnection(client, 'authentification requise')
      return
    }

    let userId: string
    try {
      // Meme secret que l'access token signe par AuthService.issueTokens().
      // verifyAsync leve si la signature est invalide OU si le jeton a expire :
      // un jeton perime ne donne donc pas plus de droits qu'un jeton forge.
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })
      userId = payload.sub
    } catch {
      this.rejectConnection(client, 'jeton invalide ou expire')
      return
    }

    // Le displayName vient de la BASE, pas du handshake : le client ne choisit
    // plus le nom sous lequel il apparait aux autres. Ca ferme au passage
    // l'usurpation d'affichage (se connecter avec le nom de quelqu'un d'autre).
    // Un compte supprime entre l'emission du jeton et la connexion tombe ici.
    const account = await this.users.findById(userId)
    if (!account) {
      this.rejectConnection(client, 'compte introuvable')
      return
    }

    const user: PresenceUser = {
      userId: account.id,
      displayName: account.displayName,
    }

    this.presence.register(client.id, user)
    // Room personnelle : c'est par la que ses amis recevront son changement de statut.
    await client.join(userRoom(user.userId))

    // Passe en ligne UNIQUEMENT a la premiere socket connectee (evite les
    // ecritures redondantes si l'utilisateur a plusieurs onglets ouverts).
    if (!this.presence.hasAnyOtherSocket(user.userId, client.id)) {
      await this.users.setOnlineStatus(user.userId, true)
      const friendIds = await this.friendship.getFriendIds(user.userId)
      for (const friendId of friendIds) {
        this.server.to(userRoom(friendId)).emit(ServerEvents.USER_ONLINE, { userId: user.userId, isOnline: true })
      }
    }

    this.logger.log(`connexion ${client.id} (user ${user.userId})`)
  }

  // Appele automatiquement quand un client se deconnecte (fermeture, reseau, onglet ferme).
  async handleDisconnect(client: Socket): Promise<void> {
    // Retire la socket du registre et recupere son etat pour prevenir les amis.
    const state = this.presence.unregister(client.id)
    // Rien a faire si la socket n'etait pas enregistree (refusee a la connexion).
    if (!state) return

    // Passe hors ligne seulement si aucune autre socket ne reste : fermer un
    // onglet sur trois ne doit pas faire disparaitre l'utilisateur.
    if (!this.presence.hasAnyOtherSocket(state.user.userId, client.id)) {
      await this.users.setOnlineStatus(state.user.userId, false)
      const friendIds = await this.friendship.getFriendIds(state.user.userId)
      for (const friendId of friendIds) {
        this.server.to(userRoom(friendId)).emit(ServerEvents.USER_OFFLINE, { userId: state.user.userId, isOnline: false })
      }
    }
    // Trace de deconnexion.
    this.logger.log(`deconnexion ${client.id}`)
    // NB : Socket.IO retire automatiquement la socket de ses rooms a la deconnexion.
  }

  // -------------------------------------------------------------------------
  // Handlers d'evenements
  // -------------------------------------------------------------------------

  // Handler de "org:join" : rejoindre la room de chat d'un projet.
  @SubscribeMessage(ClientEvents.JOIN_ORG)
  async handleJoinOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OrgScopePayload,
  ): Promise<void> {
    const user = this.presence.getUser(client.id)
    if (!user) return

    if (!payload?.organizationId) {
      client.emit(ServerEvents.ERROR, { message: 'organizationId manquant' })
      return
    }

    const isMember = await this.messages.isActiveMember(user.userId, payload.organizationId)
    if (!isMember) {
      client.emit(ServerEvents.ERROR, { message: 'accès refusé à ce projet' })
      return
    }

    await client.join(orgRoom(payload.organizationId))
    client.emit(ServerEvents.ORG_JOINED, { organizationId: payload.organizationId })
  }

  // Handler de "org:leave".
  @SubscribeMessage(ClientEvents.LEAVE_ORG)
  async handleLeaveOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OrgScopePayload,
  ): Promise<void> {
    if (!payload?.organizationId) return
    await client.leave(orgRoom(payload.organizationId))
  }

  // Handler de "message:send" : le coeur du chat.
  @SubscribeMessage(ClientEvents.MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessageSendPayload,
  ): Promise<void> {
    const user = this.presence.getUser(client.id)
    if (!user) return

    if (!payload?.organizationId || !payload?.content?.trim()) {
      client.emit(ServerEvents.ERROR, { message: 'payload message:send invalide' })
      return
    }

    const member = await this.messages.getMembership(user.userId, payload.organizationId)
    if (!member || member.leftAt) {
      client.emit(ServerEvents.ERROR, { message: 'accès refusé à ce projet' })
      return
    }

    const saved = await this.messages.createMessage(
      payload.organizationId,
      member.id,
      payload.content.trim(),
    )

    this.server.to(orgRoom(payload.organizationId)).emit(ServerEvents.MESSAGE_NEW, {
      id: saved.id,
      content: saved.content,
      createdAt: saved.createdAt.toISOString(),
      organizationId: payload.organizationId,
      author: {
        userId: saved.author.user.id,
        displayName: saved.author.user.displayName,
      },
    })
  }

  // Permet a d'autres modules (friendship) de pousser un evenement cible a UN
  // utilisateur, sans connaitre Socket.IO : ils appellent juste cette methode.
  // Diffuse un evenement a TOUS les membres presents dans le salon d'un projet.
  // Pendant de notifyUser, mais a l'echelle d'une organisation.
  // Le salon n'est peuple que de sockets ayant passe le controle d'appartenance
  // de handleJoinOrg : diffuser ici ne fuite donc rien a un non-membre.
  notifyOrganization(organizationId: string, event: string, payload: unknown): void {
    this.server.to(orgRoom(organizationId)).emit(event, payload)
  }

  notifyUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload)
  }

}
