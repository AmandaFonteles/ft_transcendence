import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sans cette memorisation, apres fermeture le focus retombe en haut de page et
    // un utilisateur au clavier perd sa position.
    previouslyFocused.current = document.activeElement as HTMLElement
    panelRef.current?.focus()

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 bg-ink/30 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        // Focusable par programme, sans entrer dans l'ordre de tabulation naturel.
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Un clic DANS le panneau ne doit pas le fermer.
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
