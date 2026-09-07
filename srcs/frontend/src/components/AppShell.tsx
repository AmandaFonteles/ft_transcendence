// Ossature commune : toutes les pages sont rendues dans l'<Outlet/>, personne
// n'a a reconstruire l'en-tete ni le pied de page.
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { useAuth } from '../auth/AuthContext'
import { getSocket } from '../realtime/socket'
import { useEffect } from 'react'

export default function AppShell() {
  const { user } = useAuth()
  // Ouvre la connexion temps reel des qu'une session existe. Le jeton a deja ete
  // depose dans le module socket par AuthContext, donc le handshake part authentifie.
  useEffect(() => {
    if (!user) return
    getSocket()
  }, [user?.id])
  return (
    <>
      <Header />
      {/* pt-14 / pb-11 reservent la hauteur de l'en-tete (h-14) et du pied de page
          (h-11) : sans eux, le contenu passerait dessous. */}
      <main className="pt-14 pb-11">
        <div className="mx-auto max-w-[980px] px-4 py-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  )
}
