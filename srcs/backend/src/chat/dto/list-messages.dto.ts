import { IsISO8601, IsOptional } from 'class-validator'

// Curseur de pagination : le createdAt du plus ancien message deja charge.
// @IsISO8601 transforme un "?before=nimportequoi" en 400 explicite, la ou un
// "new Date(...)" invalide faisait remonter une erreur 500 de Prisma.
export class ListMessagesDto {
  @IsOptional()
  @IsISO8601({}, { message: 'le curseur "before" doit etre une date ISO 8601' })
  before?: string
}
