import { Controller, Get, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { MessageService } from './message.service'
import { ListMessagesDto } from './dto/list-messages.dto'

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
    // DTO plutot que @Query('before') brut : le curseur est ainsi verifie comme
    // une vraie date ISO avant d'atteindre "new Date(...)" dans le service.
    @Query() query: ListMessagesDto,
  ) {
    const isMember = await this.messageService.isActiveMember(user.userId, organizationId)
    if (!isMember) throw new ForbiddenException("Vous n'êtes pas membre de ce projet")
    return this.messageService.listMessages(organizationId, { before: query.before })
  }
}