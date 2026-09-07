import { Body, Controller, Get, NotFoundException, Patch, UseGuards, Delete, UploadedFile, UseInterceptors, Param, StreamableFile } from '@nestjs/common'
import { createReadStream } from 'fs'
import { UsersService } from './users.service'
import { SelectAvatarDto } from './dto/select-avatar.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AVATAR_PRESETS } from './avatar-presets'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { FileInterceptor } from '@nestjs/platform-express'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()

  // Route protegee : l'annuaire n'est pas public.
  findAll() {
    return this.users.findAll()
  }

  // Route publique. Doit rester declaree avant toute future route @Get(':id'),
  // sinon Nest interpreterait "avatar-presets" comme une valeur de :id.
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
    // dto.avatarUrl a deja ete verifie par @IsIn(AVATAR_PRESETS) : une valeur hors
    // presets a ete rejetee en 400 avant d'arriver ici.
    return this.users.updateAvatar(user.userId, dto.avatarUrl)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: { userId: string }, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  changePassword(@CurrentUser() user: { userId: string }, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.userId, dto)
  }

  @Patch('me/avatar/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {limits: { fileSize: 5 * 1000000 + 1 }})) // 5 Mo max
  uploadAvatar(@CurrentUser() user: { userId: string }, @UploadedFile() file: Express.Multer.File) {
    return this.users.uploadAvatar(user.userId, file)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteAccount(@CurrentUser() user: { userId: string }) {
    return this.users.deleteAccount(user.userId)
  }

  @Get('avatars/:userId/:filename')
  async serveAvatar(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
  ) {
    const filePath = await this.users.resolveAvatarFilePath(userId, filename)
    return new StreamableFile(createReadStream(filePath), { type: 'image/png' })
  }
}
