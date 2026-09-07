// =============================================================================
// validation.ts : les REGLES d'entree communes a tout le backend.
//
// Pourquoi un fichier partage plutot que des nombres ecrits dans chaque DTO :
//   1. la meme notion (un nom, une description) doit avoir la MEME limite partout,
//      sinon deux ecrans acceptent deux choses differentes ;
//   2. certaines limites servent HORS DTO — la longueur d'un message de chat est
//      verifiee dans le gateway WebSocket, ou aucun DTO ne s'applique ;
//   3. le front reprend ces memes valeurs (attribut maxLength) : les avoir a un
//      seul endroit cote serveur rend la divergence facile a reperer.
//
// Regle generale : le front valide pour eviter un aller-retour reseau sur une
// erreur previsible ; le BACKEND valide parce qu'il est la seule autorite. Toute
// limite ci-dessous doit donc exister ici, pas seulement dans l'interface.
// =============================================================================

import { applyDecorators } from '@nestjs/common'
import { Transform } from 'class-transformer'
import { Matches, MaxLength, MinLength } from 'class-validator'

// --- Longueurs -------------------------------------------------------------

export const LIMITS = {
  // 254 = maximum d'une adresse e-mail selon la RFC 5321. Au-dela, ce n'est pas
  // une adresse : c'est du remplissage.
  EMAIL_MAX: 254,

  // Mot de passe. Le MINIMUM protege l'utilisateur ; le MAXIMUM protege le
  // SERVEUR : argon2 est volontairement couteux en CPU et en memoire, hacher une
  // chaine d'un megaoctet a chaque tentative de connexion serait un deni de
  // service gratuit. 128 laisse largement la place a une phrase de passe.
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,

  // Nom affiche. Sert aussi a construire le username (displayName + "#" + suffixe).
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,

  // Username genere : displayName (50) + "#" (1) + suffixe (5) = 56. On arrondit.
  USERNAME_MAX: 60,

  // Nom d'un projet (Organization) : tient sur une ligne d'interface.
  ORGANIZATION_NAME_MAX: 80,
  ORGANIZATION_DESCRIPTION_MAX: 500,

  // Tache : le nom est un titre, la description un paragraphe.
  TASK_NAME_MAX: 120,
  TASK_DESCRIPTION_MAX: 2000,

  // Fichier : 255 est la limite d'un nom de fichier sur la plupart des systemes.
  FILE_NAME_MAX: 255,
  FILE_DESCRIPTION_MAX: 500,

  // Message de chat. Verifie dans le gateway, pas dans un DTO.
  MESSAGE_CONTENT_MAX: 2000,

  // Recherche d'utilisateur : une requete plus longue qu'un username ne peut
  // rien trouver, autant la refuser avant d'interroger la base.
  SEARCH_QUERY_MAX: 60,

  // Nombre d'identifiants acceptes dans un filtre de liste. Empeche une URL de
  // plusieurs kilo-octets de se transformer en clause SQL "IN (...)" geante.
  FILTER_IDS_MAX: 50,
} as const

// --- Formes ----------------------------------------------------------------

// Identifiant de ressource. Tous les id du projet sont des cuid generes par
// Prisma (@default(cuid())) : minuscules et chiffres, longueur fixe.
// La fourchette 20-32 couvre cuid v1 (25 caracteres) comme cuid2 (24), sans
// avoir a la modifier si l'on change de generateur un jour.
// Pourquoi valider une forme d'id plutot que se contenter d'un "non vide" :
// une valeur qui ne peut PAS etre un id n'a rien a faire en base ni dans une
// construction de chemin de fichier. On la refuse au plus tot, en 400 explicite,
// plutot que de la laisser produire un 404 ou un 500 plus loin.
export const RESOURCE_ID_PATTERN = /^[a-z0-9]{20,32}$/

// Caracteres de controle (retours a la ligne, tabulations, caracteres invisibles
// Unicode). Interdits dans les champs d'une seule ligne : ils cassent
// l'affichage, permettent d'usurper visuellement un nom, et n'apportent rien.
// \p{C} = categorie Unicode "Other" (controle, format, non assigne, surrogates).
const SINGLE_LINE_PATTERN = /^[^\p{C}]+$/u

// Idem, en interdisant aussi le "#" : ce caractere est le SEPARATEUR du username
// genere (displayName#suffixe). L'autoriser dans un nom affiche rendrait les
// usernames ambigus a la lecture ("Ana#lyse#a1b2c" : ou commence le suffixe ?).
const DISPLAY_NAME_PATTERN = /^[^\p{C}#]+$/u

// --- Decorateurs composes --------------------------------------------------

// [CONCEPT: transformer AVANT de valider] class-transformer s'execute avant
// class-validator dans le ValidationPipe. En coupant les espaces d'abord, on
// ferme le trou classique : "   " passe @IsNotEmpty() (ce n'est pas une chaine
// vide) mais devient "" apres trim, et echoue alors sur @MinLength(1).
// Sans ca, on stocke des projets nommes "   ", invisibles dans l'interface.
export function Trim() {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
}

// Champ texte d'UNE SEULE LIGNE : trim, longueur bornee, pas de caractere de
// controle. Utilise pour les noms (projet, tache, fichier).
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

// Champ texte MULTILIGNE : trim et longueur bornee, mais les retours a la ligne
// sont legitimes. Utilise pour les descriptions.
export function IsMultiLineText(max: number) {
  return applyDecorators(
    Trim(),
    MaxLength(max, { message: `ce champ ne peut pas depasser ${max} caracteres` }),
  )
}

// Nom affiche d'un utilisateur.
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

// Identifiant de ressource (cuid) recu du client.
export function IsResourceId() {
  return applyDecorators(
    Trim(),
    Matches(RESOURCE_ID_PATTERN, { message: 'identifiant invalide' }),
  )
}
