import { IsOptional, MaxLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

// [CONCEPT: valider aussi la query string] Un @Query('q') brut arrive dans le
// controller sans AUCUNE verification : ni type, ni longueur. Le passer par un DTO
// lui applique le meme ValidationPipe global que les corps de requete.
// Ici la borne compte vraiment : la recherche fait un "contains" en base, et une
// chaine de plusieurs megaoctets ferait travailler PostgreSQL pour un resultat
// vide garanti (aucun username ne peut etre aussi long).
export class SearchUsersDto {
  @IsOptional()
  @Trim()
  @MaxLength(LIMITS.SEARCH_QUERY_MAX, {
    message: `la recherche ne peut pas depasser ${LIMITS.SEARCH_QUERY_MAX} caracteres`,
  })
  q?: string
}
