import { IsIn } from 'class-validator'
import { AVATAR_PRESETS } from '../avatar-presets'

export class SelectAvatarDto {
  @IsIn(AVATAR_PRESETS)
  avatarUrl: string
}