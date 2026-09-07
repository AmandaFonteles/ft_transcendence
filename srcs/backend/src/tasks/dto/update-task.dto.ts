import { IsDateString, IsOptional, ValidateIf } from 'class-validator'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

// [CONCEPT: null vs undefined] Le service distingue les deux : "undefined" signifie
// "ne touche pas a ce champ", "null" signifie "efface-le". Les champs effacables
// utilisent donc @ValidateIf(...) pour n'appliquer les regles de forme QUE si une
// valeur reelle est fournie — sinon @IsDateString refuserait le null explicite.
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
