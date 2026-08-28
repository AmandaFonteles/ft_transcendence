// =============================================================================
// Header.tsx : en-tete FIXE, present sur toutes les pages.
// Contenu impose par la structure : logo/accueil a gauche, bouton de connexion,
// menu deroulant a droite pour acceder aux pages.
// =============================================================================

// Hooks pour l'ouverture du menu et la detection des clics exterieurs.
import { useEffect, useRef, useState } from 'react'
// NavLink connait l'etat "actif" ; Link est un lien simple. Les deux naviguent
// sans rechargement complet de la page.
import { Link, NavLink } from 'react-router-dom'

// Entrees du menu deroulant, declarees une fois pour eviter la repetition.
const menuItems = [
  { to: '/tableau-de-bord', label: 'Agenda et projets' },
  { to: '/projets/nouveau', label: 'Créer un projet' },
  { to: '/equipe', label: 'Équipe' },
  { to: '/profil', label: 'Profil' },
]

export default function Header() {
  // Etat d'ouverture du menu.
  const [open, setOpen] = useState(false)
  // Reference sur le conteneur, pour savoir si un clic a eu lieu en dehors.
  const menuRef = useRef<HTMLDivElement>(null)

  // Ferme le menu au clic exterieur ou sur Echap.
  useEffect(() => {
    // Inutile de poser des ecouteurs si le menu est ferme.
    if (!open) return
    // Ferme si le clic est hors du conteneur.
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    // Ferme sur Echap : attendu par tout utilisateur clavier.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    // Nettoyage : sans ce retrait, les ecouteurs s'empileraient a chaque ouverture.
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    // fixed + h-14 (56px) : la hauteur est reprise par le padding du contenu
    // dans AppShell, pour que rien ne passe sous l'en-tete.
    <header className="fixed top-0 inset-x-0 z-20 h-14 flex items-center gap-4 px-4 bg-surface border-b border-rule">
      {/* Logo / retour accueil. */}
      <Link to="/" className="text-base font-semibold tracking-tight text-ink no-underline">
        ft_transcendence
      </Link>

      {/* ml-auto pousse tout ce qui suit vers la droite. */}
      <div className="ml-auto flex items-center gap-2">
        {/* [SEAM: AUTH — Qu] Devra afficher l'utilisateur connecte et "Se deconnecter". */}
        <Link
          to="/connexion"
          className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
        >
          Se connecter
        </Link>

        {/* relative : ancre le panneau du menu, positionne en absolute. */}
        <div className="relative" ref={menuRef}>
          <button
            className="inline-flex items-center rounded-full px-[18px] py-[9px] text-sm font-medium text-ink-soft hover:bg-sunk cursor-pointer"
            // Bascule l'ouverture.
            onClick={() => setOpen((v) => !v)}
            // Annonce l'etat deploye aux lecteurs d'ecran.
            aria-expanded={open}
            // Precise que ce bouton commande un menu.
            aria-haspopup="menu"
          >
            Menu
          </button>

          {/* Panneau affiche uniquement si open vaut true. */}
          {open && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] rounded-lg border border-rule bg-surface p-1"
              role="menu"
            >
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  // Referme le menu apres navigation.
                  onClick={() => setOpen(false)}
                  // NavLink fournit isActive : on marque la page courante.
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm text-ink no-underline hover:bg-sunk ${
                      isActive ? 'bg-sunk font-medium' : ''
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
