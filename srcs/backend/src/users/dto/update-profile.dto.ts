// [CONCEPT: DTO tout-optionnel] Contrairement a SignupDto ou tous les champs sont
// obligatoires, ici TOUT est @IsOptional : l'utilisateur peut vouloir changer
// SEULEMENT son displayName, ou SEULEMENT son email, ou les deux a la fois.
// Le username n'apparait PAS ici : il est genere une seule fois au signup et ne
// change jamais (voir schema.prisma), on ne l'expose donc pas comme modifiable.

import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string
}