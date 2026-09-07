import { IsEnum, IsOptional } from 'class-validator'
import { InvitePolicy } from '@prisma/client'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

// Memes regles qu'a la creation : ce qui est refuse a la creation doit l'etre a
// la modification, sinon la contrainte se contourne en deux requetes.
export class UpdateOrganizationDto {
  @IsOptional()
  @IsSingleLineText(LIMITS.ORGANIZATION_NAME_MAX)
  name?: string

  @IsOptional()
  @IsMultiLineText(LIMITS.ORGANIZATION_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsEnum(InvitePolicy)
  invitePolicy?: InvitePolicy
}
