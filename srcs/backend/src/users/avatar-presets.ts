// [CONCEPT: liste fixe] Un simple tableau : pas besoin de table DB pour une liste
// qui ne change quasiment jamais. "as const" fige les valeurs pour IsIn() ci-dessous.
export const AVATAR_PRESETS = [
  '/avatars/preset-01.png',
  '/avatars/preset-02.png',
   '/avatars/preset-03.png',
   '/avatars/preset-04.png',
   '/avatars/preset-05.png',
   '/avatars/preset-06.png'
] as const
