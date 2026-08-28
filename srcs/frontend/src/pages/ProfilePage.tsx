// =============================================================================
// ProfilePage.tsx : profil personnel.
// =============================================================================

import SeamBlock from '../components/ui/SeamBlock'

export default function ProfilePage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">Profil</h1>
      {/* [SEAM: PROFIL — Qu] Informations du compte, avatar, preferences. */}
      <SeamBlock owner="Module profil · Qu">
        Informations du compte, avatar, préférences et sécurité.
      </SeamBlock>
    </>
  )
}
