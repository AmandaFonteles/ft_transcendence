// =============================================================================
// validation.ts : COPIE CLIENT des limites de saisie du backend.
// Source de verite : srcs/backend/src/common/validation.ts — toute modification
// se fait des DEUX cotes (meme raison que le contrat d'evenements temps reel :
// front et back sont deux paquets npm distincts, dans deux conteneurs).
//
// [CONCEPT: role de chaque cote] Ces valeurs servent a poser des attributs
// maxLength/minLength sur les champs. Ca RENSEIGNE l'utilisateur — le navigateur
// l'empeche de taper au-dela plutot que de le laisser rediger 3000 caracteres
// avant de recevoir un refus — mais ca ne PROTEGE rien : un attribut HTML se
// retire depuis les outils de developpement en deux clics.
// La verification qui compte est celle du backend, qui refait tout.
// =============================================================================

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

// [CONCEPT: espaces seulement] Un champ rempli de "   " n'est pas vide au sens
// de l'attribut HTML "required" : le formulaire part, et c'est le backend qui
// refuse. Ce petit helper permet de desactiver le bouton avant l'envoi, pour que
// l'utilisateur comprenne tout de suite plutot que de recevoir une erreur.
export function isBlank(value: string): boolean {
  return value.trim().length === 0
}
