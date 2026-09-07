import { IsEnum, IsOptional } from 'class-validator'
import { VisibilityPolicy } from '@prisma/client'
import { IsMultiLineText, LIMITS } from '../../common/validation'

// Ce DTO decrit les champs TEXTE accompagnant le televersement (multipart) ; le
// fichier lui-meme est valide separement dans FilesService (taille, extension,
// et surtout type REEL du contenu lu dans les octets d'en-tete).
export class CreateFileDto {
  @IsOptional()
  @IsMultiLineText(LIMITS.FILE_DESCRIPTION_MAX)
  description?: string

  @IsOptional()
  @IsEnum(VisibilityPolicy)
  visibilityPolicy?: VisibilityPolicy
}
