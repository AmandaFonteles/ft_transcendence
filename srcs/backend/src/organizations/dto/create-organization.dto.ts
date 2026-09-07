import { IsEnum, IsOptional } from 'class-validator'
import { InvitePolicy } from '@prisma/client'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class CreateOrganizationDto {
  // @IsNotEmpty() seul laissait passer "   " : ce n'est pas une chaine vide, donc
  // la validation reussissait et on creait un projet au nom invisible, impossible
  // a distinguer des autres dans la liste. Le trim prealable ferme ce cas.
  @IsSingleLineText(LIMITS.ORGANIZATION_NAME_MAX)
  name: string

  // Multiligne : une description de projet peut legitimement contenir des sauts
  // de ligne. Seule la longueur est bornee.
  @IsOptional()
  @IsMultiLineText(LIMITS.ORGANIZATION_DESCRIPTION_MAX)
  description?: string

  // Enumeration Prisma : toute autre valeur est refusee en 400. C'est ce qui
  // empeche d'inventer une politique d'invitation qui n'existe pas.
  @IsOptional()
  @IsEnum(InvitePolicy)
  invitePolicy?: InvitePolicy
}
