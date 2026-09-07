// Politique de confidentialite. Le texte decrit les donnees reellement stockees,
// telles que definies dans srcs/backend/prisma/schema.prisma : a mettre a jour
// quand le schema evolue.

import { Link } from 'react-router-dom'
import LegalSection from '../components/LegalSection'

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">
        Politique de confidentialité
      </h1>
      <p className="font-data text-[13px] text-ink-soft mb-6">
        Dernière mise à jour : septembre 2026
      </p>

      <LegalSection title="En deux mots">
        <p>
          Nous gardons le strict minimum pour faire tourner l'application, personne
          d'autre que vous et les membres de vos projets n'y a accès, et rien n'est
          vendu ni analysé. Le détail est en dessous, écrit pour être lu.
        </p>
      </LegalSection>

      <LegalSection title="Qui sommes-nous">
        <p>
          <strong>Aqan</strong> est un projet étudiant réalisé à l'école 42 dans le
          cadre de <em>ft_transcendence</em>. L'application permet à une équipe
          d'organiser ses projets, ses tâches et son agenda partagé. Elle n'a aucune
          finalité commerciale, ne rapporte d'argent à personne, et n'est pas conçue
          pour un usage en production.
        </p>
      </LegalSection>

      <LegalSection title="Ce que nous stockons">
        <p>
          Uniquement ce dont l'application a besoin pour fonctionner. Concrètement :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Votre compte</strong> : votre adresse e-mail, votre nom affiché,
            un identifiant public généré à partir de ce nom, et votre avatar.
          </li>
          <li>
            <strong>De quoi vous authentifier</strong> : une empreinte de votre mot de
            passe. Le mot de passe lui-même n'est jamais enregistré — nous serions
            incapables de vous le rappeler, et c'est voulu.
          </li>
          <li>
            <strong>La double authentification</strong>, si vous l'activez : une clé
            secrète qui permet de vérifier les codes de votre application
            d'authentification.
          </li>
          <li>
            <strong>Votre connexion via 42 ou GitHub</strong>, si vous l'utilisez :
            l'identifiant que ce service nous transmet, pour rattacher la connexion au
            bon compte. Nous ne récupérons rien d'autre au passage.
          </li>
          <li>
            <strong>Ce que vous créez</strong> : projets, descriptions, tâches, dates
            de début et d'échéance, statuts, ainsi que les rôles et affectations qui
            vous relient aux projets et aux tâches.
          </li>
        </ul>
        <p>
          Et voilà tout. Pas de localisation, pas d'identifiant publicitaire, pas
          d'historique de navigation, aucun outil de mesure d'audience installé sur le
          site.
        </p>
      </LegalSection>

      <LegalSection title="Pourquoi nous en avons besoin">
        <p>
          Pour vous connecter, afficher vos projets et vos tâches, vous rendre
          identifiable auprès des autres membres de votre équipe, et appliquer les
          droits liés à votre rôle. Rien de tout cela ne sert à établir un profil ou à
          vous montrer de la publicité : ce serait sans objet dans un projet d'école,
          et nous n'avons ni l'envie ni les moyens de le faire.
        </p>
      </LegalSection>

      <LegalSection title="Ce que les autres voient de vous">
        <p>
          Les autres membres connectés voient votre <strong>nom affiché</strong>, votre
          identifiant public et votre avatar. <strong>Jamais votre adresse
          e-mail</strong> : l'annuaire ne la renvoie tout simplement pas. À l'intérieur
          d'un projet, ses membres voient les tâches et les personnes qui y sont
          affectées — c'est le principe même d'un outil d'équipe.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Un seul, et il est indispensable : un jeton de session qui vous garde
          connecté d'une visite à l'autre. Il est <em>httpOnly</em> — le JavaScript de
          la page ne peut pas le lire — et ne circule qu'en HTTPS. Aucun cookie
          publicitaire, aucun traceur, et donc aucune bannière à cliquer.
        </p>
      </LegalSection>

      <LegalSection title="Partage avec des tiers">
        <p>
          Aucun. Vos données ne sont ni vendues, ni louées, ni transmises à qui que ce
          soit. Les seuls échanges avec l'extérieur sont ceux que vous déclenchez
          vous-même en choisissant de vous connecter via 42 ou GitHub.
        </p>
      </LegalSection>

      <LegalSection title="Comment nous les protégeons">
        <p>
          Les mots de passe sont hachés et salés avec Argon2, un algorithme conçu pour
          rendre les attaques par force brute très coûteuses. Tout passe par HTTPS
          entre votre navigateur et le serveur, et chaque entrée est validée côté
          serveur avant d'être enregistrée.
        </p>
        <p>
          Cela dit, soyons honnêtes : c'est un travail d'étudiants, relu par des
          étudiants. Nous ne pouvons pas promettre le niveau de sécurité d'un service
          professionnel audité. N'y saisissez rien de sensible ou de confidentiel, et
          si vous repérez une faille,{' '}
          <Link to="/contact">dites-le-nous</Link> — c'est le meilleur service que
          vous puissiez nous rendre.
        </p>
      </LegalSection>

      <LegalSection title="Combien de temps nous les gardons">
        <p>
          Tant que votre compte existe. Quand il est supprimé, tout ce qui y est
          rattaché — identifiants de connexion, comptes externes liés, appartenances
          aux projets et affectations de tâches — part avec lui, automatiquement. Les
          projets et les tâches que vous avez créés peuvent rester si l'équipe qui les
          porte est toujours active : ils appartiennent alors au collectif.
        </p>
        <p>
          Une précision qui compte : le projet est encore en développement, et la base
          de données peut être remise à zéro à tout moment. Ne comptez pas sur Aqan
          pour conserver quelque chose à long terme.
        </p>
      </LegalSection>

      <LegalSection title="Ce que vous pouvez faire">
        <p>
          Votre nom affiché, votre adresse e-mail et votre avatar se modifient depuis
          votre <Link to="/profil">page de profil</Link>, et votre mot de passe peut
          être changé quand vous le souhaitez. Pour tout le reste — savoir ce que nous
          avons sur vous, en demander une copie ou la suppression de votre compte —
          passez par la page <Link to="/contact">Contact</Link> : une vraie personne
          vous répondra.
        </p>
      </LegalSection>

      <LegalSection title="Si ce texte change">
        <p>
          L'application évolue, cette page aussi. La date de dernière mise à jour, en
          haut, vous dit toujours de quand date la version que vous lisez.
        </p>
      </LegalSection>
    </>
  )
}
