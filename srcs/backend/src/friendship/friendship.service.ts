import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ServerEvents } from '../realtime/realtime.events'

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isOnline: true,
} as const;

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtime: RealtimeGateway,
  ) {}

  async searchByUsername(query: string, currentUserId: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        username: { contains: query.trim(), mode: 'insensitive' },
        id: { not: currentUserId },
      },
      select: PUBLIC_USER_SELECT,
      take: 10,
    });
  }

  async sendFriendRequest(requesterId: string, receiverUsername: string) {
    const receiver = await this.prisma.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!receiver) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (receiver.id === requesterId) {
      throw new BadRequestException("Impossible de s'ajouter soi-même");
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Vous êtes déjà amis');
      }
      throw new ConflictException('Une demande est déjà en attente');
    }

    const friendship = await this.prisma.friendship.create({
      data: { requesterId, receiverId: receiver.id },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });

    this.realtime.notifyUser(receiver.id, ServerEvents.FRIEND_REQUEST_RECEIVED, {
      friendshipId: friendship.id,
      requester: friendship.requester,
    });

    return friendship;
  }

  async acceptFriendRequest(friendshipId: string, currentUserId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Demande introuvable');
    }

    if (friendship.receiverId !== currentUserId) {
      throw new ForbiddenException(
        "Vous n'êtes pas le destinataire de cette demande",
      );
    }

    if (friendship.status === 'ACCEPTED') {
      throw new ConflictException('Demande déjà acceptée');
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });

    this.realtime.notifyUser(updated.requesterId, ServerEvents.FRIEND_REQUEST_ACCEPTED, {
      friendshipId: updated.id,
      user: updated.receiver,
    });

    return updated;
  }

  async removeFriendship(friendshipId: string, currentUserId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Relation introuvable');
    }

    if (
      friendship.requesterId !== currentUserId &&
      friendship.receiverId !== currentUserId
    ) {
      throw new ForbiddenException(
        "Vous ne faites pas partie de cette relation",
      );
    }

    await this.prisma.friendship.delete({ where: { id: friendshipId } });

    const otherUserId =
      friendship.requesterId === currentUserId ? friendship.receiverId : friendship.requesterId;
    this.realtime.notifyUser(otherUserId, ServerEvents.FRIEND_REMOVED, { friendshipId });

    return { success: true };
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });

    return friendships.map((f) => ({
      friendshipId: f.id,
      user: f.requesterId === userId ? f.receiver : f.requester,
    }));
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
      },
    });
  }

  async getSentRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: {
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });
  }

  async areFriends(userAId: string, userBId: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userAId, receiverId: userBId },
          { requesterId: userBId, receiverId: userAId },
        ],
      },
    });
    return friendship !== null;
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId,
    );
  }
}