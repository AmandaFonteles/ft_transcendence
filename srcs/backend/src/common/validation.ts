import { applyDecorators } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { Matches, MaxLength, MinLength } from 'class-validator'

// Regles d'entree communes a tout le backend : un seul endroit, car certaines
// limites servent hors DTO (chat verifie dans le gateway) et le front reprend
// les memes valeurs.

// --- Longueurs --------------------------------------------------------------

export const LIMITS = {
  // Maximum d'une adresse e-mail selon la RFC 5321.
  EMAIL_MAX: 254,

  // Le maximum protege le serveur : argon2 est couteux, hacher une chaine d'un
  // megaoctet a chaque tentative serait un deni de service gratuit.
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,

  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,

  // displayName (50) + "#" (1) + suffixe (5), arrondi.
  USERNAME_MAX: 60,

  ORGANIZATION_NAME_MAX: 80,
  ORGANIZATION_DESCRIPTION_MAX: 500,

  TASK_NAME_MAX: 120,
  TASK_DESCRIPTION_MAX: 2000,

  FILE_NAME_MAX: 255,
  FILE_DESCRIPTION_MAX: 500,

  // Verifie dans le gateway, pas dans un DTO.
  MESSAGE_CONTENT_MAX: 2000,

  SEARCH_QUERY_MAX: 60,

  // Borne le nombre d'identifiants d'un filtre de liste, donc la taille de la
  // clause SQL "IN (...)" generee.
  FILTER_IDS_MAX: 50,
} as const

// --- Formes -----------------------------------------------------------------

// Tous les id du projet sont des cuid generes par Prisma. La fourchette 20-32
// couvre cuid v1 (25 caracteres) comme cuid2 (24).
export const RESOURCE_ID_PATTERN = /^[a-z0-9]{20,32}$/

// \p{C} = categorie Unicode "Other" (controle, format, non assigne, surrogates).
const SINGLE_LINE_PATTERN = /^[^\p{C}]+$/u

// Le "#" est le separateur du username genere (displayName#suffixe) : l'admettre
// dans un nom affiche rendrait les usernames ambigus.
const DISPLAY_NAME_PATTERN = /^[^\p{C}#]+$/u

// --- Decorateurs composes ---------------------------------------------------

// class-transformer s'execute avant class-validator : en coupant les espaces
// d'abord, "   " devient "" et echoue sur @MinLength au lieu de passer.
export function Trim() {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
}

// Champ texte d'une seule ligne : noms de projet, de tache, de fichier.
export function IsSingleLineText(max: number, min = 1) {
  return applyDecorators(
    Trim(),
    MinLength(min, { message: `ce champ doit contenir au moins ${min} caractere(s)` }),
    MaxLength(max, { message: `ce champ ne peut pas depasser ${max} caracteres` }),
    Matches(SINGLE_LINE_PATTERN, {
      message: 'ce champ ne peut pas contenir de caracteres de controle',
    }),
  )
}

// Champ texte multiligne : descriptions.
export function IsMultiLineText(max: number) {
  return applyDecorators(
    Trim(),
    MaxLength(max, { message: `ce champ ne peut pas depasser ${max} caracteres` }),
  )
}

export function IsDisplayName() {
  return applyDecorators(
    Trim(),
    MinLength(LIMITS.DISPLAY_NAME_MIN, {
      message: `le nom affiche doit contenir au moins ${LIMITS.DISPLAY_NAME_MIN} caracteres`,
    }),
    MaxLength(LIMITS.DISPLAY_NAME_MAX, {
      message: `le nom affiche ne peut pas depasser ${LIMITS.DISPLAY_NAME_MAX} caracteres`,
    }),
    Matches(DISPLAY_NAME_PATTERN, {
      message: 'le nom affiche ne peut contenir ni caractere de controle ni "#"',
    }),
  )
}

export function IsResourceId() {
  return applyDecorators(
    Trim(),
    Matches(RESOURCE_ID_PATTERN, { message: 'identifiant invalide' }),
  )
}
