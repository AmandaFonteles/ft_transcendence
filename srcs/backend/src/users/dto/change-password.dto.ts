// [CONCEPT: DTO de securite] currentPassword est OBLIGATOIRE (pas de @IsOptional) :
// on ne change JAMAIS un mot de passe sans reverifier l'ancien, meme si la requete
// porte deja un access token valide. Pourquoi : un access token vole (XSS, session
// laissee ouverte...) ne doit pas suffire a lui seul pour prendre le controle total
// du compte en changeant le mot de passe.

import { IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string

  @IsString()
  @MinLength(8)
  newPassword: string
}