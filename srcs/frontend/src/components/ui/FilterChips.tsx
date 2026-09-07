import type { ReactNode } from 'react'

// Selecteur de filtre a choix unique. Trois choix deliberes le distinguent d'une
// serie de boutons d'action : un cadre commun qui montre l'appartenance au meme
// ensemble, une option active "enfoncee" plutot que remplie d'encre, et un
// role="radiogroup" qui le fait annoncer comme un choix.

export interface FilterOption {
  value: string | null
  label: string
  adornment?: ReactNode
}

interface FilterChipsProps {
  options: FilterOption[]
  value: string | null
  onChange: (value: string | null) => void
  label: string
}

export default function FilterChips({ options, value, onChange, label }: FilterChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-sunk border border-rule"
    >
      {options.map((opt) => {
        // Comparaison stricte : null (tout) doit se distinguer d'une chaine vide.
        const active = opt.value === value
        return (
          <button
            // La cle doit rester unique meme quand value vaut null.
            key={opt.value ?? '__all__'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] cursor-pointer transition-colors ${
              active
                ? 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {opt.adornment}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
