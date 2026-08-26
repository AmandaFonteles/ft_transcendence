// [CONCEPT: controller de feature] UsersController mappe les routes HTTP vers le
// service. Il ne contient AUCUNE logique : il recoit, delegue, renvoie.

import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { SelectAvatarDto } from './dto/select-avatar.dto'
import { AVATAR_PRESETS } from './avatar-presets'
// AJOUT : necessaires pour proteger la route PATCH /users/me/avatar.
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto)
  }

  @Get()
  findAll() {
    return this.users.findAll()
  }

  // AJOUT : route PUBLIQUE (pas de @UseGuards), pas besoin d'etre connecte pour
  // voir la liste des avatars disponibles. Renvoie simplement le tableau tel quel.
  @Get('avatar-presets')
  avatarPresets() {
    return AVATAR_PRESETS
  }

  // IMPORTANT : 'avatar-presets' doit rester declare AVANT toute future route
  // @Get(':id'), sinon Nest interpreterait "avatar-presets" comme une valeur de :id.

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    const found = await this.users.findById(user.userId)
    if (!found) throw new NotFoundException('utilisateur introuvable')
    return found
  }

  // AJOUT : route PROTEGEE (@UseGuards(JwtAuthGuard)) : il faut un access token
  // valide dans le header Authorization pour l'appeler.
  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  selectAvatar(@CurrentUser() user: { userId: string }, @Body() dto: SelectAvatarDto) {
    // dto.avatarUrl a DEJA ete verifie par @IsIn(AVATAR_PRESETS) (etape 3) avant
    // meme d'arriver ici : si la requete est invalide, Nest a repondu 400 en amont.
    return this.users.updateAvatar(user.userId, dto.avatarUrl)
  }
}