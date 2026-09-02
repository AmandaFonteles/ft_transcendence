// =============================================================================
// TermsPage.tsx : conditions d'utilisation.
//
// La grille d'evaluation exige des pages Privacy Policy ET Terms of Service, avec
// un contenu pertinent. Une page vide ou generique entraine le rejet du projet.
// =============================================================================

import { Link } from 'react-router-dom'
import LegalSection from '../components/LegalSection'

export default function TermsPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">
        Conditions d'utilisation
      </h1>
      <p className="font-data text-[13px] text-ink-soft mb-6">
        Dernière mise à jour : septembre 2026
      </p>

      <LegalSection title="Objet du service">
        <p>
          Cette application permet de créer des projets, d'y inviter des membres, d'y
          gérer des tâches avec des dates et des statuts, et de consulter un agenda
          partagé. Elle est développée par des étudiants de l'école 42 dans le cadre du
          projet <em>ft_transcendence</em>, à des fins strictement pédagogiques.
        </p>
      </LegalSection>

      <LegalSection title="Création de compte">
        <p>
          L'accès requiert un compte, créé avec une adresse e-mail et un mot de passe,
          ou via un fournisseur externe (42, GitHub). Vous vous engagez à fournir une
          adresse e-mail valide et à ne pas usurper l'identité d'un tiers.
        </p>
        <p>
          Vous êtes responsable de la confidentialité de votre mot de passe et de
          l'activité menée depuis votre compte. Nous recommandons d'activer la double
          authentification depuis votre <Link to="/profil">profil</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Usage acceptable">
        <p>En utilisant ce service, vous vous engagez à ne pas :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            publier de contenu illégal, haineux, harcelant, ou portant atteinte aux
            droits d'autrui ;
          </li>
          <li>
            tenter d'accéder à des projets, tâches ou comptes dont vous n'êtes pas
            membre ;
          </li>
          <li>
            perturber le fonctionnement du service, notamment par des requêtes
            automatisées massives ou l'exploitation de failles ;
          </li>
          <li>
            utiliser le service pour stocker des données sensibles, confidentielles ou
            à caractère personnel appartenant à des tiers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Votre contenu">
        <p>
          Vous restez propriétaire des textes que vous saisissez (noms et descriptions
          de projets et de tâches). Vous nous accordez uniquement le droit technique de
          les stocker et de les afficher aux membres concernés, afin de faire
          fonctionner le service.
        </p>
        <p>
          Les membres d'un projet peuvent voir et, selon leur rôle, modifier les tâches
          de ce projet. Les administrateurs d'un projet disposent de droits étendus,
          notamment la gestion des membres et la suppression du projet.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilité et absence de garantie">
        <p>
          Le service est fourni « en l'état », sans garantie de disponibilité, de
          continuité ni de préservation des données. S'agissant d'un projet étudiant,
          il peut être interrompu, réinitialisé ou modifié à tout moment, y compris
          sans préavis. Conservez une copie de toute information à laquelle vous
          tenez : nous ne pouvons être tenus responsables d'une perte de données.
        </p>
      </LegalSection>

      <LegalSection title="Suspension et suppression">
        <p>
          Nous pouvons suspendre ou supprimer un compte qui ne respecte pas les
          présentes conditions. Vous pouvez de votre côté demander la suppression de
          votre compte à tout moment ; les effets de cette suppression sont décrits
          dans la <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement de vos données est détaillé dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>, qui fait
          partie intégrante des présentes conditions.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Ces conditions peuvent évoluer avec l'application. La date de dernière mise à
          jour figure en haut de cette page. Toute question peut être adressée via la
          page <Link to="/contact">Contact</Link>.
        </p>
      </LegalSection>
    </>
  )
}
