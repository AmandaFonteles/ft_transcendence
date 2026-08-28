// =============================================================================
// Header.tsx : en-tete FIXE, present sur toutes les pages.
// Contenu impose par la structure : logo/accueil a gauche, bouton de connexion,
// menu deroulant a droite pour acceder aux pages.
// =============================================================================

// Importe les hooks React utilises pour l'ouverture du menu.
import { useEffect, useRef, useState } from 'react'
// NavLink connait l'etat "actif" ; Link est un lien simple. Les deux evitent le
// rechargement complet de la page (navigation cote client).
import { Link, NavLink } from 'react-router-dom'

// Composant d'en-tete.
export default function Header() {
  // Etat d'ouverture du menu deroulant.
  const [open, setOpen] = useState(false)
  // Reference sur le conteneur du menu, pour detecter les clics exterieurs.
  const menuRef = useRef<HTMLDivElement>(null)

  // Ferme le menu quand on clique ailleurs ou qu'on appuie sur Echap.
  useEffect(() => {
    // Ne pose les ecouteurs que si le menu est ouvert (inutile sinon).
    if (!open) return
    // Ferme si le clic a lieu hors du conteneur du menu.
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    // Ferme sur Echap : attendu par tout utilisateur clavier.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Abonne les deux ecouteurs au document.
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    // Nettoyage : sans ce retrait, les ecouteurs s'empileraient a chaque ouverture.
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Rendu de l'en-tete.
  return (
    <header className="app-header">
      {/* Logo / retour accueil, a gauche. */}
      <Link to="/" className="brand">ft_transcendence</Link>

      {/* Pousse tout ce qui suit vers la droite. */}
      <span className="spacer" />

      {/* [SEAM: AUTH — Qu] Ce bouton devra afficher l'utilisateur connecte et
          "Se deconnecter" une fois l'authentification en place. */}
      <NavLink to="/connexion" className="btn btn-secondary">Se connecter</NavLink>

      {/* Menu deroulant d'acces aux pages. */}
      <div className="menu" ref={menuRef}>
        <button
          className="btn btn-ghost"
          // Bascule l'ouverture a chaque clic.
          onClick={() => setOpen((v) => !v)}
          // Indique aux lecteurs d'ecran si le menu est deploye.
          aria-expanded={open}
          // Precise que ce bouton commande un menu.
          aria-haspopup="menu"
        >
          Menu
        </button>

        {/* Panneau affiche uniquement quand open vaut true. */}
        {open && (
          <div className="menu-panel" role="menu">
            {/* NavLink ajoute la classe "is-active" sur la page courante. */}
            <NavLink to="/tableau-de-bord" role="menuitem" onClick={() => setOpen(false)}
              className={({ isActive }) => 'menu-item' + (isActive ? ' is-active' : '')}>
              Agenda et projets
            </NavLink>
            <NavLink to="/projets/nouveau" role="menuitem" onClick={() => setOpen(false)}
              className={({ isActive }) => 'menu-item' + (isActive ? ' is-active' : '')}>
              Créer un projet
            </NavLink>
            <NavLink to="/equipe" role="menuitem" onClick={() => setOpen(false)}
              className={({ isActive }) => 'menu-item' + (isActive ? ' is-active' : '')}>
              Équipe
            </NavLink>
            <NavLink to="/profil" role="menuitem" onClick={() => setOpen(false)}
              className={({ isActive }) => 'menu-item' + (isActive ? ' is-active' : '')}>
              Profil
            </NavLink>
          </div>
        )}
      </div>
    </header>
  )
}
