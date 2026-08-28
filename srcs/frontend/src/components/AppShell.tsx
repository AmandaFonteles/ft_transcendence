// =============================================================================
// AppShell.tsx : ossature commune (en-tete + contenu + pied de page).
// Toutes les pages sont rendues a l'interieur : personne n'a a reconstruire
// le chrome, donc il ne peut pas diverger d'un ecran a l'autre.
// =============================================================================

// [CONCEPT: route imbriquee] <Outlet/> est l'emplacement ou react-router injecte
// la page correspondant a l'URL courante.
import { Outlet } from 'react-router-dom'
// Chrome fixe.
import Header from './Header'
import Footer from './Footer'

// Composant d'ossature.
export default function AppShell() {
  return (
    <>
      {/* En-tete fixe. */}
      <Header />
      {/* Contenu de la page courante. <main> est la balise semantique attendue. */}
      <main className="page">
        <Outlet />
      </main>
      {/* Pied de page fixe. */}
      <Footer />
    </>
  )
}
