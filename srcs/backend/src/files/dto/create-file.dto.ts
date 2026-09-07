import { IsEnum, IsOptional } from 'class-validator'
import { VisibilityPolicy } from '@prisma/client'
import { IsMultiLineText, LIMITS } from '../../common/validation'

export class CreateFileDto {
  @IsOptional()
  @IsMultiLineText(LIMITS.FILE_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsEnum(VisibilityPolicy)
  visibilityPolicy?: VisibilityPolicy
}
