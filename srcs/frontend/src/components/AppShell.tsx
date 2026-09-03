// =============================================================================
// AppShell.tsx : ossature commune (en-tete + contenu + pied de page).
// Toutes les pages sont rendues a l'interieur : personne n'a a reconstruire le
// chrome, donc il ne peut pas diverger d'un ecran a l'autre.
// =============================================================================

// [CONCEPT: route imbriquee] <Outlet/> est l'emplacement ou react-router injecte
// la page correspondant a l'URL courante.
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useAuth } from '../auth/AuthContext'
import { getSocket } from '../realtime/socket'
import { useEffect } from 'react'

export default function AppShell() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    getSocket({ userId: user.id, displayName: user.displayName })
  }, [user?.id, user?.displayName])
  return (
    <>
      <Header />
      {/* pt-14 / pb-11 reservent exactement la hauteur de l'en-tete (h-14) et du
          pied de page (h-11) : sans eux, le contenu passerait dessous.
          mx-auto max-w-[980px] centre la colonne de lecture. */}
      <main className="pt-14 pb-11">
        <div className="mx-auto max-w-[980px] px-4 py-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  )
}
