// [CONCEPT: DTO validé] Meme logique que SignupDto, en plus simple : on ne verifie PAS
// la forme du password ici (une regle "MinLength(8)" sur le login serait un faux indice
// pour un attaquant essayant de deviner la politique de mot de passe). On se contente
// de verifier que c'est bien une string non vide.

import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  password: string
}