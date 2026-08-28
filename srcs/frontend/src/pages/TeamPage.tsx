// =============================================================================
// TeamPage.tsx : gestion des utilisateurs (liste, recherche, amis, chat).
// La structure prevoit deux vues : utilisateur simple et administrateur.
// =============================================================================

import Card from '../components/ui/Card'
import SeamBlock from '../components/ui/SeamBlock'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'

export default function TeamPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">Équipe</h1>

      {/* Barre de recherche prevue par la structure. */}
      <div className="max-w-[380px] mb-4">
        <TextField label="Rechercher" type="search" placeholder="Nom ou adresse e-mail" />
      </div>

      {/* [SEAM: UTILISATEURS — Qu] Liste reelle depuis l'API, ajout d'amis,
          ouverture d'une conversation, et vue administrateur (droits, projets). */}
      <SeamBlock owner="Module utilisateurs · Qu">
        Liste des personnes connues, ajout d'amis, ouverture d'un chat, et vue
        administrateur sur les droits et projets de chacun.
      </SeamBlock>

      {/* Apercu de la mise en forme d'une ligne de personne. */}
      <Card className="mt-4">
        <div className="flex items-center gap-3">
          <Avatar initials="QU" color={2} />
          <div className="flex-1 min-w-0">
            <div className="font-medium">Qu</div>
            <div className="font-data text-[12.5px] text-ink-soft">Authentification et chat</div>
          </div>
          <Button>Message</Button>
        </div>
      </Card>
    </>
  )
}
