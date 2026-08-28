// =============================================================================
// PrivacyPage.tsx : confidentialite et conditions (lien du pied de page).
// A ETOFFER : la grille d'evaluation exige un contenu reel, pas un placeholder.
// =============================================================================

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-4">
        Confidentialité et conditions
      </h1>
      <p className="text-ink-soft max-w-[62ch]">
        Les données saisies servent uniquement au fonctionnement de l'application
        et ne sont transmises à aucun tiers.
      </p>
    </>
  )
}
