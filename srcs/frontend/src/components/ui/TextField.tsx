import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export default function TextField({ label, className = '', ...rest }: TextFieldProps) {
  // useId fournit un id unique ; htmlFor le relie a l'input. Sans cette liaison,
  // cliquer le libelle ne focalise pas le champ et les lecteurs d'ecran
  // n'annoncent pas a quoi correspond la saisie.
  const id = useId()

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[13.5px] text-ink-soft">{label}</label>
      <input
        id={id}
        className={`w-full bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] placeholder:text-ink-faint disabled:bg-sunk ${className}`}
        {...rest}
      />
    </div>
  )
}
