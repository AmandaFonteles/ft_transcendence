// =============================================================================
// ProjectCreatePage.tsx : creation d'un projet (nom, membres, echeance, couleur).
// Coquille visuelle : la logique appartient au module d'Ai.
// =============================================================================

import Card from '../components/ui/Card'
import SeamBlock from '../components/ui/SeamBlock'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import { projectBg, projectColors } from '../lib/projectColors'

export default function ProjectCreatePage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">Créer un projet</h1>

      <Card className="max-w-[520px]">
        {/* [SEAM: PROJETS — Ai] Formulaire reel : nom, membres depuis la liste
            d'amis, echeance, couleur, puis envoi vers l'API. */}
        <SeamBlock owner="Module projets · Ai">
          Nom du projet, membres depuis la liste d'amis, échéance, et choix de la
          couleur d'identité qui suivra toutes ses tâches.
        </SeamBlock>

        {/* Apercu de la mise en forme attendue (champs desactives). */}
        <div className="grid gap-3 mt-4">
          <TextField label="Nom du projet" placeholder="Refonte du site" disabled />

          <div>
            <p className="text-[13.5px] text-ink-soft mb-2">Couleur du projet</p>
            <div className="flex gap-2">
              {/* Les six couleurs d'identite, prises dans la table de classes. */}
              {projectColors.map((n) => (
                <button
                  key={n}
                  type="button"
                  // aria-label : la couleur seule n'est pas une information
                  // accessible ; il faut un libelle textuel.
                  aria-label={`Couleur ${n}`}
                  className={`size-7 rounded-full cursor-pointer ${projectBg[n]}`}
                />
              ))}
            </div>
          </div>

          <Button variant="primary" disabled>Créer le projet</Button>
        </div>
      </Card>
    </>
  )
}
