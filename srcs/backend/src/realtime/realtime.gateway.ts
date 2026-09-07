// Point d'entree WebSocket du projet : un gateway est a WebSocket ce qu'un
// controller est a HTTP (handlers d'evenements au lieu de routes).

import { Logger, Inject, forwardRef } from '@nestjs/common'
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { PresenceRegistry } from './presence.registry'
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

import { LIMITS, RESOURCE_ID_PATTERN } from '../common/validation'
import { UsersService } from '../users/users.service'
import { FriendshipService } from '../friendship/friendship.service'

// "path" doit correspondre exactement a la regle nginx qui proxifie le
// WebSocket. Pas de "cors" : tout passe par nginx en meme origine.
@WebSocketGateway({ path: '/socket.io' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server

  private readonly logger = new Logger(RealtimeGateway.name)

  constructor(
    private readonly presence: PresenceRegistry,
    private readonly messages: MessageService,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => UsersService))
    private readonly users: UsersService,
    @Inject(forwardRef(() => FriendshipService))
    private readonly friendship: FriendshipService,
  ) {}

  // --- Cycle de vie ---------------------------------------------------------

  // Emettre AVANT de fermer : dans l'autre ordre le client ne recevrait jamais
  // le message et verrait une coupure silencieuse.
  private rejectConnection(client: Socket, message: string): void {
    client.emit(ServerEvents.ERROR, { message })
    client.disconnect(true)
  }

  // Le handshake est le seul endroit ou l'identite d'une socket est etablie :
  // le reste du gateway la lit ensuite dans le PresenceRegistry. Le client
  // envoie un jeton d'acces, jamais un userId qu'on croirait sur parole.
  async handleConnection(client: Socket): Promise<void> {
    const { token } = client.handshake.auth as { token?: string }

    if (!token) {
      this.rejectConnection(client, 'authentification requise')
      return
    }

    let userId: string
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })
      userId = payload.sub
    } catch {
      this.rejectConnection(client, 'jeton invalide ou expire')
      return
    }

    // Le displayName vient de la base, pas du handshake : ferme l'usurpation
    // d'affichage et attrape un compte supprime depuis l'emission du jeton.
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
    // Room personnelle : c'est par la que ses amis recoivent son changement de statut.
    await client.join(userRoom(user.userId))

    // Passe en ligne uniquement a la premiere socket (plusieurs onglets possibles).
    if (!this.presence.hasAnyOtherSocket(user.userId, client.id)) {
      await this.users.setOnlineStatus(user.userId, true)
      const friendIds = await this.friendship.getFriendIds(user.userId)
      for (const friendId of friendIds) {
        this.server.to(userRoom(friendId)).emit(ServerEvents.USER_ONLINE, { userId: user.userId, isOnline: true })
      }
    }

    this.logger.log(`connexion ${client.id} (user ${user.userId})`)
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const state = this.presence.unregister(client.id)
    if (!state) return

    if (!this.presence.hasAnyOtherSocket(state.user.userId, client.id)) {
      await this.users.setOnlineStatus(state.user.userId, false)
      const friendIds = await this.friendship.getFriendIds(state.user.userId)
      for (const friendId of friendIds) {
        this.server.to(userRoom(friendId)).emit(ServerEvents.USER_OFFLINE, { userId: state.user.userId, isOnline: false })
      }
    }

    // Socket.IO retire automatiquement la socket de ses rooms a la deconnexion.
    this.logger.log(`deconnexion ${client.id}`)
  }

  // --- Handlers d'evenements ------------------------------------------------

  // Le ValidationPipe global ne s'applique qu'au HTTP : chaque handler valide a
  // la main ce qu'un DTO ferait automatiquement. On ne branche pas de pipe sur
  // @MessageBody() a dessein, il leverait une WsException sur l'evenement
  // "exception" alors que le client ecoute "realtime:error".
  private isValidResourceId(value: unknown): value is string {
    return typeof value === 'string' && RESOURCE_ID_PATTERN.test(value)
  }

  @SubscribeMessage(ClientEvents.JOIN_ORG)
  async handleJoinOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OrgScopePayload,
  ): Promise<void> {
    const user = this.presence.getUser(client.id)
    if (!user) return

    if (!this.isValidResourceId(payload?.organizationId)) {
      client.emit(ServerEvents.ERROR, { message: 'organizationId manquant ou invalide' })
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

  @SubscribeMessage(ClientEvents.LEAVE_ORG)
  async handleLeaveOrg(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OrgScopePayload,
  ): Promise<void> {
    if (!payload?.organizationId) return
    await client.leave(orgRoom(payload.organizationId))
  }

  @SubscribeMessage(ClientEvents.MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessageSendPayload,
  ): Promise<void> {
    const user = this.presence.getUser(client.id)
    if (!user) return

    if (!this.isValidResourceId(payload?.organizationId)) {
      client.emit(ServerEvents.ERROR, { message: 'organizationId manquant ou invalide' })
      return
    }

    // Sans ce test, un objet ou un nombre ferait echouer .trim() plus bas.
    if (typeof payload?.content !== 'string') {
      client.emit(ServerEvents.ERROR, { message: 'contenu de message invalide' })
      return
    }

    const content = payload.content.trim()

    if (content.length === 0) {
      client.emit(ServerEvents.ERROR, { message: 'un message ne peut pas etre vide' })
      return
    }

    // Message.content est un "text" PostgreSQL, donc sans borne : sans ce plafond,
    // une socket authentifiee peut remplir la base depuis la console du navigateur.
    if (content.length > LIMITS.MESSAGE_CONTENT_MAX) {
      client.emit(ServerEvents.ERROR, {
        message: `un message ne peut pas depasser ${LIMITS.MESSAGE_CONTENT_MAX} caracteres`,
      })
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
      content,
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

  // --- Diffusion depuis les autres modules ----------------------------------

  // Le salon n'est peuple que de sockets ayant passe le controle d'appartenance
  // de handleJoinOrg : diffuser ici ne fuite rien a un non-membre.
  notifyOrganization(organizationId: string, event: string, payload: unknown): void {
    this.server.to(orgRoom(organizationId)).emit(event, payload)
  }

  notifyUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload)
  }

}
