// =============================================================================
// Button.tsx : bouton reutilisable, en pilule (signature de la direction).
// Regle de retenue : UNE SEULE action "primary" par ecran.
// =============================================================================

// ButtonHTMLAttributes fournit tous les attributs natifs (onClick, disabled...).
import type { ButtonHTMLAttributes } from 'react'

// Les trois intentions visuelles disponibles.
type Variant = 'primary' | 'secondary' | 'ghost'

// Props = les attributs natifs d'un <button>, plus notre variante.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

// Classes communes a toutes les variantes.
// rounded-full = la pilule ; transition-colors adoucit le survol.
const base =
  'inline-flex items-center justify-center rounded-full px-[18px] py-[9px] ' +
  'text-sm font-medium whitespace-nowrap border transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

// Classes propres a chaque variante. Ecrites en toutes lettres (scan Tailwind).
const variants: Record<Variant, string> = {
  // Action principale : encre pleine, texte blanc.
  primary: 'bg-ink text-white border-transparent hover:bg-action-hover',
  // Action secondaire : surface blanche cerclee.
  secondary: 'bg-surface text-ink border-rule hover:border-ink-faint',
  // Action discrete : ni fond ni bordure (ex. "Annuler").
  ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-sunk',
}

// Composant. On extrait variant et className, et on transmet TOUT le reste au
// <button> natif : le composant reste utilisable comme un bouton ordinaire.
export default function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
