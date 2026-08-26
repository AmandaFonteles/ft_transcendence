import { IsIn } from 'class-validator'
import { AVATAR_PRESETS } from '../avatar-presets'

export class SelectAvatarDto {
  // AVATAR_PRESETS est un tableau readonly (grace au "as const" dans avatar-presets.ts) ;
  // @IsIn accepte un tableau de valeurs autorisees, donc ca marche directement.
  @IsIn(AVATAR_PRESETS)
  avatarUrl: string
}