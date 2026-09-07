import { IsEnum, IsOptional } from 'class-validator'
import { InvitePolicy } from '@prisma/client'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class CreateOrganizationDto {
  // Le trim prealable ferme le cas "   ", que @IsNotEmpty() laissait passer.
  @IsSingleLineText(LIMITS.ORGANIZATION_NAME_MAX)
  name: string

  @IsOptional()
  @IsMultiLineText(LIMITS.ORGANIZATION_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsEnum(InvitePolicy)
  invitePolicy?: InvitePolicy
}
