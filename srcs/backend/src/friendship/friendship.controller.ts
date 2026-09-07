import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FriendshipService } from './friendship.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@UseGuards(JwtAuthGuard)
@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  // @Query() SANS nom de parametre : Nest passe TOUTE la query string dans le DTO,
  // qui est alors valide par le ValidationPipe global (longueur, trim). Avec
  // @Query('q'), la chaine arrivait brute, sans aucune verification.
  @Get('search')
  search(
    @Query() dto: SearchUsersDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.friendshipService.searchByUsername(dto.q ?? '', user.userId);
  }

  @Post('request')
  sendRequest(
    @Body() dto: SendFriendRequestDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.friendshipService.sendFriendRequest(user.userId, dto.username);
  }

  @Patch(':id/accept')
  accept(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.friendshipService.acceptFriendRequest(id, user.userId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.friendshipService.removeFriendship(id, user.userId);
  }

  @Get()
  getFriends(@CurrentUser() user: { userId: string }) {
    return this.friendshipService.getFriends(user.userId);
  }

  @Get('pending')
  getPending(@CurrentUser() user: { userId: string }) {
    return this.friendshipService.getPendingRequests(user.userId);
  }

  @Get('sent')
  getSent(@CurrentUser() user: { userId: string }) {
    return this.friendshipService.getSentRequests(user.userId);
  }
}