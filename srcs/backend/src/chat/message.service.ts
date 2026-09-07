import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const AUTHOR_INCLUDE = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
} as const

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  // Fait autorite sur "qui peut parler dans ce chat" : la gateway et le
  // controller REST l'appellent tous les deux plutot que de dupliquer la regle.
  async getMembership(userId: string, organizationId: string) {
    return this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    })
  }

  async isActiveMember(userId: string, organizationId: string): Promise<boolean> {
    const member = await this.getMembership(userId, organizationId)
    return member !== null && member.leftAt === null
  }

  // Pagination par curseur temporel : "before" remonte dans le temps.
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

  // authorMemberId est l'id de la ligne OrganizationMember, pas le userId :
  // c'est la cle etrangere reelle de Message.authorId.
  async createMessage(organizationId: string, authorMemberId: string, content: string) {
    return this.prisma.message.create({
      data: { organizationId, authorId: authorMemberId, content },
      include: { author: { include: AUTHOR_INCLUDE } },
    })
  }
}