import type { ButtonHTMLAttributes } from 'react'

// Regle de retenue : une seule action "primary" par ecran.
type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center rounded-full px-[18px] py-[9px] ' +
  'text-sm font-medium whitespace-nowrap border transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

// Classes ecrites en toutes lettres (scan Tailwind, voir lib/projectColors.ts).
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white border-transparent hover:bg-action-hover',
  secondary: 'bg-surface text-ink border-rule hover:border-ink-faint',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-sunk',
}

// Tout le reste est transmis au <button> natif : le composant reste utilisable
// comme un bouton ordinaire.
export default function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
