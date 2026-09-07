import { Matches } from 'class-validator'
import { Trim } from '../../common/validation'

export class ConfirmTwoFactorDto {
  // Six chiffres, rien d'autre. Le trim absorbe les espaces d'un copier-coller
  // depuis l'application d'authentification, frequent sur mobile.
  @Trim()
  @Matches(/^\d{6}$/, { message: 'le code doit contenir exactement 6 chiffres' })
  totpCode: string
}
