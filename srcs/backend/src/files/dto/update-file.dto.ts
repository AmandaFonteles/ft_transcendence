import { IsEnum, IsOptional } from 'class-validator'
import { VisibilityPolicy } from '@prisma/client'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class UpdateFileDto {
  @IsOptional()
  @IsSingleLineText(LIMITS.FILE_NAME_MAX)
  name?: string

  @IsOptional()
  @IsMultiLineText(LIMITS.FILE_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsEnum(VisibilityPolicy)
  visibilityPolicy?: VisibilityPolicy
}
