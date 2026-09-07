import { IsEnum, IsOptional } from 'class-validator'
import { VisibilityPolicy } from '@prisma/client'
import { IsMultiLineText, IsSingleLineText, LIMITS } from '../../common/validation'

export class UpdateFileDto {
  // 255 : la limite d'un nom de fichier sur la plupart des systemes de fichiers.
  // Ce nom est un LIBELLE affiche, pas le nom sur disque — celui-ci est regenere
  // en UUID au televersement, precisement pour qu'aucune saisie utilisateur ne
  // se retrouve dans un chemin.
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
