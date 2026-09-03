// =============================================================================
// FilterChips.tsx : selecteur de filtre a choix unique.
//
// POURQUOI CE COMPOSANT EXISTE : sur la page Agenda, "Tous les projets" etait un
// <button> arrondi identique visuellement a une action de creation. L'utilisateur
// pouvait croire qu'il CREAIT quelque chose en cliquant. Un filtre et une action
// ne doivent pas se ressembler.
//
// Ce composant se distingue par trois choix deliberes :
//   1. il est regroupe dans un cadre unique, ce qui montre que les options
//      appartiennent au meme ensemble (contrairement a des boutons isoles) ;
//   2. l'option active est enfoncee (fond blanc sur fond creux) plutot que
//      remplie d'encre, reservee aux actions principales ;
//   3. il est balise role="radiogroup", donc annonce comme un CHOIX et non comme
//      une serie d'actions par les lecteurs d'ecran.
// =============================================================================

import type { ReactNode } from 'react'

// Une option du selecteur.
export interface FilterOption {
  // Valeur renvoyee a la selection ; null represente "tout".
  value: string | null
  // Libelle affiche.
  label: string
  // Element decoratif optionnel affiche avant le libelle (ex. pastille de projet).
  adornment?: ReactNode
}

interface FilterChipsProps {
  // Les options proposees.
  options: FilterOption[]
  // Option actuellement selectionnee.
  value: string | null
  // Appele quand l'utilisateur change de filtre.
  onChange: (value: string | null) => void
  // Libelle du groupe, lu par les lecteurs d'ecran.
  label: string
}

export default function FilterChips({ options, value, onChange, label }: FilterChipsProps) {
  return (
    // role="radiogroup" + aria-label : le groupe est annonce comme un choix unique.
    <div
      role="radiogroup"
      aria-label={label}
      // Le cadre commun et le fond creux signalent "zone de filtre", pas "actions".
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
            // role="radio" + aria-checked : etat de selection expose a l'assistance.
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] cursor-pointer transition-colors ${
              active
                // Actif : surface blanche "enfoncee", jamais l'encre pleine des actions.
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
