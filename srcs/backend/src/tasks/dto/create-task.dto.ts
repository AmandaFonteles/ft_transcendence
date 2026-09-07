import { IsBoolean, IsDateString, IsOptional } from 'class-validator'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class CreateTaskDto {
  @IsSingleLineText(LIMITS.TASK_NAME_MAX)
  name: string

  @IsOptional()
  @IsMultiLineText(LIMITS.TASK_DESCRIPTION_MAX)
  description?: string

  // @IsDateString impose le format ISO 8601. Sans lui, une chaine quelconque
  // arriverait jusqu'a "new Date(...)" dans le service, produirait une Invalid
  // Date, et Prisma repondrait par une erreur 500 illisible au lieu d'un 400.
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
