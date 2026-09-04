// =============================================================================
// Header.tsx : en-tete FIXE, present sur toutes les pages.
// Affiche l'utilisateur connecte quand il y en a un, sinon un bouton de connexion.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Entrees du menu, declarees une fois pour eviter la repetition.
const menuItems = [
  // Libelle aligne sur le bouton d'accueil ("Ouvrir mon tableau de bord") :
  // deux noms differents pour la meme page desorientaient l'utilisateur.
  { to: '/tableau-de-bord', label: 'Tableau de bord' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/projets/nouveau', label: 'Créer un projet' },
  { to: '/amis', label: 'Amis' },
  { to: '/profil', label: 'Profil' },
]

export default function Header() {
  // Etat d'ouverture du menu deroulant.
  const [open, setOpen] = useState(false)
  // Reference du conteneur, pour detecter les clics exterieurs.
  const menuRef = useRef<HTMLDivElement>(null)
  // Utilisateur connecte et action de deconnexion.
  const { user, logout } = useAuth()
  // Permet de rediriger apres deconnexion.
  const navigate = useNavigate()

  // Ferme le menu au clic exterieur ou sur Echap.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    // Nettoyage : sans ce retrait, les ecouteurs s'empileraient a chaque ouverture.
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Deconnecte puis ramene a l'accueil.
  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    // h-14 (56px) : hauteur reprise par le padding du contenu dans AppShell.
    <header className="fixed top-0 inset-x-0 z-20 h-14 flex items-center gap-4 px-4 bg-surface border-b border-rule">
      <Link to="/" className="text-base font-semibold tracking-tight text-ink no-underline">
        Aqan
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            {/* Nom affiche, masque sur tres petit ecran pour laisser la place. */}
            <span className="hidden sm:inline font-data text-[13px] text-ink-soft">
              {user.displayName}
            </span>
            {/* [ACCES AU PROFIL] L'avatar est un LIEN vers /profil. C'est la
                convention attendue : partout ailleurs sur le web, cliquer sur sa
                propre photo mene a son compte. Le passer par le menu deroulant
                obligeait a chercher.
                Un repli sur les initiales est affiche quand aucun avatar n'a ete
                choisi : sans lui, ces utilisateurs n'auraient aucun raccourci. */}
            <Link
              to="/profil"
              title="Mon profil"
              className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-rule transition-shadow"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Mon profil" className="size-7 rounded-full object-cover block" />
              ) : (
                <span className="grid place-items-center size-7 rounded-full bg-sunk text-ink-soft text-[11px] font-semibold">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          </>
        ) : (
          <Link
            to="/connexion"
            className="inline-flex items-center rounded-full border border-rule bg-surface px-[18px] py-[9px] text-sm font-medium text-ink no-underline hover:border-ink-faint"
          >
            Se connecter
          </Link>
        )}

        {/* relative : ancre le panneau du menu, positionne en absolute. */}
        <div className="relative" ref={menuRef}>
          <button
            className="inline-flex items-center rounded-full px-[18px] py-[9px] text-sm font-medium text-ink-soft hover:bg-sunk cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            Menu
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] rounded-lg border border-rule bg-surface p-1" role="menu">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm text-ink no-underline hover:bg-sunk ${isActive ? 'bg-sunk font-medium' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Deconnexion seulement si quelqu'un est connecte. */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="block w-full text-left rounded-md px-3 py-2 text-sm text-danger hover:bg-sunk cursor-pointer"
                  role="menuitem"
                >
                  Se déconnecter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
