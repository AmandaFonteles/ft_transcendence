// =============================================================================
// EmptyIllustration.tsx : petit dessin pour les etats vides.
// Un etat vide accompagne d'un visuel se lit comme un espace en attente, pas
// comme une panne.
// =============================================================================

// Deux motifs disponibles selon le contexte.
type Variant = 'tasks' | 'projects' | 'search'

export default function EmptyIllustration({
  variant = 'tasks',
  className = '',
}: { variant?: Variant; className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true" focusable="false">
      {variant === 'tasks' && (
        <>
          {/* Trois lignes de tache vides, dont une esquissee. */}
          <rect x="14" y="18" width="92" height="16" rx="5"
            fill="var(--color-surface)" stroke="var(--color-rule)" />
          <rect x="18" y="22" width="3" height="8" rx="1.5" fill="var(--color-project-1)" opacity="0.5" />
          <rect x="28" y="24" width="40" height="4" rx="2" fill="var(--color-rule)" />

          <rect x="14" y="40" width="92" height="16" rx="5"
            fill="var(--color-surface)" stroke="var(--color-rule)" />
          <rect x="18" y="44" width="3" height="8" rx="1.5" fill="var(--color-project-3)" opacity="0.5" />
          <rect x="28" y="46" width="52" height="4" rx="2" fill="var(--color-rule)" />

          {/* Ligne en tirets : l'emplacement libre, l'invitation a ajouter. */}
          <rect x="14" y="62" width="92" height="16" rx="5"
            fill="none" stroke="var(--color-ink-faint)" strokeDasharray="4 3" />
          <line x1="56" y1="70" x2="64" y2="70" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
          <line x1="60" y1="66" x2="60" y2="74" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
        </>
      )}

      {variant === 'projects' && (
        <>
          {/* Deux cartes de projet et un emplacement libre. */}
          <rect x="10" y="26" width="44" height="38" rx="7"
            fill="var(--color-surface)" stroke="var(--color-rule)" />
          <circle cx="22" cy="38" r="4" fill="var(--color-project-1)" opacity="0.6" />
          <rect x="18" y="48" width="28" height="4" rx="2" fill="var(--color-rule)" />

          <rect x="66" y="26" width="44" height="38" rx="7"
            fill="none" stroke="var(--color-ink-faint)" strokeDasharray="4 3" />
          <line x1="84" y1="45" x2="92" y2="45" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
          <line x1="88" y1="41" x2="88" y2="49" stroke="var(--color-ink-faint)" strokeWidth="1.5" />
        </>
      )}

      {variant === 'search' && (
        <>
          {/* Loupe stylisee. */}
          <circle cx="52" cy="40" r="20" fill="var(--color-surface)" stroke="var(--color-rule)" strokeWidth="2" />
          <line x1="67" y1="55" x2="82" y2="70" stroke="var(--color-ink-faint)" strokeWidth="3" strokeLinecap="round" />
          <line x1="44" y1="40" x2="60" y2="40" stroke="var(--color-rule)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
