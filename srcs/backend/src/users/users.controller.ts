// [CONCEPT: controller de feature] UsersController mappe les routes HTTP vers le
// service. Il ne contient AUCUNE logique : il recoit, delegue, renvoie.

import { Body, Controller, Get, NotFoundException, Patch, UseGuards, Delete } from '@nestjs/common'
import { UsersService } from './users.service'
import { SelectAvatarDto } from './dto/select-avatar.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AVATAR_PRESETS } from './avatar-presets'
// AJOUT : necessaires pour proteger la route PATCH /users/me/avatar.
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // [SECURITE] Route PROTEGEE : l'annuaire n'est pas public.
  // Avant : aucune garde -> un simple `curl https://.../api/users` renvoyait TOUS
  // les utilisateurs, adresses e-mail comprises, sans etre connecte.
  @UseGuards(JwtAuthGuard)
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

  // AJOUT : modifie displayName et/ou email du user connecte.
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: { userId: string }, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto)
  }

  // AJOUT : change le mot de passe du user connecte (403 si compte OAuth pur,
  // 401 si currentPassword incorrect — voir UsersService.changePassword).
  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  changePassword(@CurrentUser() user: { userId: string }, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.userId, dto)
  }
  //pour supprimer un comte
  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteAccount(@CurrentUser() user: { userId: string }) {
    return this.users.deleteAccount(user.userId)
  }
}
