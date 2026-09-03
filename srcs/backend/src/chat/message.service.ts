import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// Champs publics de l'auteur d'un message, jamais l'email.
const AUTHOR_INCLUDE = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
} as const

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  // Renvoie la ligne OrganizationMember de ce user dans ce projet, ou null s'il
  // n'y a jamais appartenu. C'est CE service qui fait autorite sur "qui peut
  // parler dans ce chat" — la gateway et le controller REST l'appellent tous
  // les deux plutot que de dupliquer la logique.
  async getMembership(userId: string, organizationId: string) {
    return this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    })
  }

  // Membre actif = existe ET n'a pas quitte (leftAt null).
  async isActiveMember(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.getMembership(userId, organizationId)
    return member !== null && member.leftAt === null
  }

  // Historique paginé par curseur temporel (before = createdAt du plus ancien
  // message deja charge, pour "charger plus" en remontant dans le temps).
  async listMessages(organizationId: string, options?: { take?: number; before?: string }) {
    return this.prisma.message.findMany({
      where: {
        organizationId,
        ...(options?.before ? { createdAt: { lt: new Date(options.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.take ?? 50,
      include: { author: { include: AUTHOR_INCLUDE } },
    })
  }

  // Cree un message. authorMemberId = l'id de la ligne OrganizationMember
  // (pas le userId) : c'est la cle etrangere reelle de Message.authorId.
  async createMessage(organizationId: string, authorMemberId: string, content: string) {
    return this.prisma.message.create({
      data: { organizationId, authorId: authorMemberId, content },
      include: { author: { include: AUTHOR_INCLUDE } },
    })
  }
}