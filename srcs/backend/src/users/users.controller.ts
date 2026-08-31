// [CONCEPT: controller de feature] UsersController mappe les routes HTTP vers le
// service. Il ne contient AUCUNE logique : il recoit, delegue, renvoie.

import { Body, Controller, Get, NotFoundException, Patch, Post, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { SelectAvatarDto } from './dto/select-avatar.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AVATAR_PRESETS } from './avatar-presets'
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

  @Get('avatar-presets')
  avatarPresets() {
    return AVATAR_PRESETS
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    const found = await this.users.findById(user.userId)
    if (!found) throw new NotFoundException('utilisateur introuvable')
    return found
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  selectAvatar(@CurrentUser() user: { userId: string }, @Body() dto: SelectAvatarDto) {
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
}