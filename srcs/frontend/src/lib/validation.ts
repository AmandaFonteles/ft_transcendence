// Copie client des limites de saisie du backend.
// Source de verite : srcs/backend/src/common/validation.ts, a modifier des deux
// cotes. Ces valeurs renseignent l'utilisateur via maxLength/minLength ; elles ne
// protegent rien, un attribut HTML se retire en deux clics. Le backend refait tout.
export const LIMITS = {
  EMAIL_MAX: 254,

  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,

  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,

  USERNAME_MAX: 60,

  ORGANIZATION_NAME_MAX: 80,
  ORGANIZATION_DESCRIPTION_MAX: 500,

  TASK_NAME_MAX: 120,
  TASK_DESCRIPTION_MAX: 2000,

  FILE_NAME_MAX: 255,
  FILE_DESCRIPTION_MAX: 500,

  MESSAGE_CONTENT_MAX: 2000,

  SEARCH_QUERY_MAX: 60,
} as const

// Un champ rempli de "   " satisfait l'attribut HTML "required" : ce helper
// permet de desactiver le bouton avant l'envoi plutot que d'attendre le refus.
export function isBlank(value: string): boolean {
  return value.trim().length === 0
}
