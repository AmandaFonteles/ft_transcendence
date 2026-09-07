import { IsBoolean, IsDateString, IsOptional } from 'class-validator'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class CreateTaskDto {
  @IsSingleLineText(LIMITS.TASK_NAME_MAX)
  name: string

  @IsOptional()
  @IsMultiLineText(LIMITS.TASK_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsDateString({}, { message: 'date invalide (format ISO 8601 attendu)' })
  startDate?: string

  @IsOptional()
  @IsDateString({}, { message: 'date invalide (format ISO 8601 attendu)' })
  dueDate?: string

  @IsOptional()
  @IsBoolean()
  assignToSelf?: boolean
}
