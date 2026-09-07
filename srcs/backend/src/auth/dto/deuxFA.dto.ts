import { Matches } from 'class-validator'
import { Trim } from '../../common/validation'

export class ConfirmTwoFactorDto {
  // Le trim absorbe les espaces d'un copier-coller depuis l'app d'authentification.
  @Trim()
  @Matches(/^\d{6}$/, { message: 'le code doit contenir exactement 6 chiffres' })
  totpCode: string
}
