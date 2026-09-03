// =============================================================================
// HeroIllustration.tsx : illustration d'accueil.
//
// SVG INLINE plutot qu'un fichier image, pour trois raisons :
//   - aucune requete reseau supplementaire ;
//   - le dessin utilise les VARIABLES DU THEME, donc il suit automatiquement la
//     charte si les couleurs changent (impossible avec un PNG) ;
//   - il reste net a toutes les tailles d'ecran.
//
// Motif : une grille d'agenda dont certaines cases portent des barres de couleur
// de projet — exactement la metaphore du produit.
// =============================================================================

export default function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      // Purement decoratif : aria-hidden l'exclut de l'arbre d'accessibilite pour
      // ne pas polluer la lecture d'ecran avec une image sans contenu utile.
      aria-hidden="true"
      focusable="false"
    >
      {/* Fond de carte. */}
      <rect x="8" y="8" width="304" height="184" rx="12"
        fill="var(--color-surface)" stroke="var(--color-rule)" />

      {/* Bandeau d'entete de l'agenda. */}
      <rect x="8" y="8" width="304" height="30" rx="12" fill="var(--color-sunk)" />
      <rect x="8" y="30" width="304" height="8" fill="var(--color-sunk)" />
      <circle cx="28" cy="23" r="4" fill="var(--color-project-1)" />
      <circle cx="42" cy="23" r="4" fill="var(--color-project-3)" />
      <circle cx="56" cy="23" r="4" fill="var(--color-project-4)" />

      {/* Filets verticaux : les colonnes de jours. */}
      {[68, 128, 188, 248].map((x) => (
        <line key={x} x1={x} y1="38" x2={x} y2="192" stroke="var(--color-rule)" />
      ))}

      {/* Barres de taches, chacune coloree par son projet. */}
      <rect x="18" y="52" width="42" height="12" rx="3" fill="var(--color-project-1)" opacity="0.85" />
      <rect x="78" y="52" width="42" height="12" rx="3" fill="var(--color-project-3)" opacity="0.85" />
      <rect x="78" y="72" width="42" height="12" rx="3" fill="var(--color-project-4)" opacity="0.6" />
      <rect x="138" y="72" width="42" height="12" rx="3" fill="var(--color-project-1)" opacity="0.85" />
      <rect x="198" y="52" width="42" height="12" rx="3" fill="var(--color-project-5)" opacity="0.85" />
      <rect x="258" y="92" width="42" height="12" rx="3" fill="var(--color-project-3)" opacity="0.6" />
      <rect x="18" y="112" width="42" height="12" rx="3" fill="var(--color-project-4)" opacity="0.85" />
      <rect x="138" y="112" width="42" height="12" rx="3" fill="var(--color-project-5)" opacity="0.6" />

      {/* Marqueur du jour courant : trait d'encre, jamais une couleur — les
          couleurs restent reservees a l'identite des projets. */}
      <rect x="128" y="38" width="60" height="154" fill="var(--color-ink)" opacity="0.04" />
      <line x1="128" y1="38" x2="188" y2="38" stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  )
}
