// [CONCEPT: DTO tout-optionnel] Contrairement a SignupDto ou tous les champs sont
// obligatoires, ici TOUT est @IsOptional : l'utilisateur peut vouloir changer
// SEULEMENT son displayName, ou SEULEMENT son email, ou les deux a la fois.
// Le username n'apparait PAS ici : il est genere une seule fois au signup et ne
// change jamais (voir schema.prisma), on ne l'expose donc pas comme modifiable.
//
// Les regles de forme sont EXACTEMENT celles du signup : il serait absurde
// d'interdire un nom a l'inscription et de l'autoriser a la modification.
// D'ou les decorateurs partages (voir common/validation.ts).

import { IsEmail, IsOptional, MaxLength } from 'class-validator'
import { IsDisplayName, LIMITS, Trim } from '../../common/validation'

export class UpdateProfileDto {
  @IsOptional()
  @Trim()
  @IsEmail({}, { message: 'adresse e-mail invalide' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email?: string

  @IsOptional()
  @IsDisplayName()
  displayName?: string
}
