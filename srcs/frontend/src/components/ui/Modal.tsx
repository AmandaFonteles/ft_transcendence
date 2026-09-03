// =============================================================================
// Modal.tsx : fenetre de dialogue, utilisee pour le detail d'une tache.
// =============================================================================

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  // Titre du dialogue, annonce aux lecteurs d'ecran.
  title: string
  // Appele a la fermeture (Echap, clic sur le fond, bouton fermer).
  onClose: () => void
  // Contenu du dialogue.
  children: ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  // Memorise l'element qui avait le focus avant l'ouverture.
  const previouslyFocused = useRef<HTMLElement | null>(null)
  // Reference du panneau, pour y placer le focus a l'ouverture.
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // [CONCEPT: gestion du focus] Sans cela, apres fermeture le focus retombe en
    // haut de page : un utilisateur au clavier perd completement sa position.
    previouslyFocused.current = document.activeElement as HTMLElement
    panelRef.current?.focus()

    // Fermeture au clavier : attendu de tout dialogue.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    // Empeche la page derriere de defiler pendant que le dialogue est ouvert.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      // Restaure le defilement ET le focus d'origine.
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [onClose])

  return (
    // Fond assombri. Le clic dessus ferme le dialogue.
    <div
      className="fixed inset-0 z-40 bg-ink/30 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        // tabIndex={-1} rend le panneau focusable par programme sans l'ajouter
        // a l'ordre de tabulation naturel.
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // stopPropagation : un clic DANS le panneau ne doit pas le fermer.
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] bg-surface border border-rule rounded-xl p-5 outline-none"
      >
        <div className="flex items-start gap-3 mb-4">
          <h2 className="text-lg font-semibold flex-1">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-ink-soft hover:text-ink cursor-pointer text-xl leading-none px-1"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
