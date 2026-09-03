import { Controller, Get, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { MessageService } from './message.service'

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // Historique du chat. 403 si l'appelant n'est pas membre actif du projet —
  // un id de projet devine ne doit jamais donner acces a sa conversation.
  @Get()
  async list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Query('before') before?: string,
  ) {
    const isMember = await this.messageService.isActiveMember(user.userId, organizationId)
    if (!isMember) throw new ForbiddenException("Vous n'êtes pas membre de ce projet")
    return this.messageService.listMessages(organizationId, { before })
  }
}