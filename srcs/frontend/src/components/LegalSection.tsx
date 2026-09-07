import type { ReactNode } from 'react'

// Bloc titre + contenu des pages legales : garantit la meme hierarchie
// typographique dans les deux pages.
interface LegalSectionProps {
  title: string
  children: ReactNode
}

export default function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="text-ink-soft max-w-[68ch] space-y-2">{children}</div>
    </section>
  )
}
