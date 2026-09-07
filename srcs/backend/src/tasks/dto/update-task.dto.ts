import { IsDateString, IsOptional, ValidateIf } from 'class-validator'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

// Le service distingue undefined ("ne touche pas a ce champ") de null
// ("efface-le"). Les champs effacables passent par @ValidateIf pour n'appliquer
// les regles de forme que si une valeur reelle est fournie.
export class UpdateTaskDto {
  @IsOptional()
  @IsSingleLineText(LIMITS.TASK_NAME_MAX)
  name?: string

  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsMultiLineText(LIMITS.TASK_DESCRIPTION_MAX)
  description?: string | null

  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsDateString({}, { message: 'date invalide (format ISO 8601 attendu)' })
  startDate?: string | null

  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsDateString({}, { message: 'date invalide (format ISO 8601 attendu)' })
  dueDate?: string | null
}
