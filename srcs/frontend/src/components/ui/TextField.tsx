// =============================================================================
// TextField.tsx : champ de saisie avec son libelle.
// =============================================================================

import type { InputHTMLAttributes } from 'react'
// useId genere un identifiant unique et stable.
import { useId } from 'react'

// Props = attributs natifs d'un <input>, plus le libelle.
interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  // Texte du libelle affiche au-dessus du champ.
  label: string
}

export default function TextField({ label, className = '', ...rest }: TextFieldProps) {
  // [CONCEPT: liaison libelle/champ] useId fournit un id unique ; htmlFor le relie
  // a l'input. Sans cette liaison, cliquer le libelle ne focalise pas le champ et
  // les lecteurs d'ecran n'annoncent pas a quoi correspond la saisie.
  const id = useId()

  return (
    <div className="grid gap-1">
      {/* Libelle discret, au-dessus du champ. */}
      <label htmlFor={id} className="text-[13.5px] text-ink-soft">{label}</label>
      {/* Champ : surface blanche cerclee, coins moyens. */}
      <input
        id={id}
        className={`w-full bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] placeholder:text-ink-faint disabled:bg-sunk ${className}`}
        {...rest}
      />
    </div>
  )
}
