import { IsOptional, MaxLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

// Passer la query string par un DTO lui applique le ValidationPipe global, ce
// qu'un @Query('q') brut n'aurait pas. La borne compte ici : la recherche fait
// un "contains" en base, qu'une chaine geante ferait travailler pour rien.
export class SearchUsersDto {
  @IsOptional()
  @Trim()
  @MaxLength(LIMITS.SEARCH_QUERY_MAX, {
    message: `la recherche ne peut pas depasser ${LIMITS.SEARCH_QUERY_MAX} caracteres`,
  })
  q?: string
}
