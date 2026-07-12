import type { Metadata } from "next";
import { Section, P, Ul, LegalLink, LegalTable } from "../_components";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Vela",
};

export default function ConfidentialitePage() {
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : 10 juillet 2026</p>
      </header>

      <P>
        Cette politique explique comment Vela traite les données personnelles. Elle concerne
        d&apos;abord les praticiens qui utilisent le service. Le traitement des données de vos
        patients suit des règles distinctes, décrites à la section 4.
      </P>

      <Section title="1. Qui traite vos données">
        <P>Le responsable du traitement est :</P>
        <P>
          <strong>Margaux FRANCILLARD (Entrepreneur Individuel)</strong>
          <br />
          1 place Charles de Gaulle C33, 34170 Castelnau-le-Lez
          <br />
          margaux.francillard@gmail.com
        </P>
        <P>
          Aucun délégué à la protection des données (DPO) n&apos;a été désigné à ce stade. Pour
          toute demande, adressez-vous à margaux.francillard@gmail.com.
        </P>
      </Section>

      <Section title="2. Deux situations à distinguer">
        <P>Vela n&apos;a pas le même rôle selon les données concernées.</P>
        <P>
          <strong>Vos données de praticien.</strong> Pour les informations liées à votre compte
          et à votre abonnement, Vela est <strong>responsable de traitement</strong>. Cette
          politique s&apos;applique.
        </P>
        <P>
          <strong>Les données de vos patients.</strong> Pour les données que vous saisissez sur
          vos patients, c&apos;est vous qui êtes responsable de traitement. Vela agit comme{" "}
          <strong>sous-traitant</strong>, uniquement sur vos instructions. Ce cadre est défini
          dans l&apos;<LegalLink href="/sous-traitance">Accord de sous-traitance</LegalLink>, qui
          fait partie de votre contrat.
        </P>
      </Section>

      <Section title="3. Données de praticien : ce que nous collectons et pourquoi">
        <LegalTable
          headers={["Données", "Finalité", "Base légale", "Conservation"]}
          rows={[
            [
              "Identité (nom, prénom), e-mail, mot de passe (haché)",
              "Créer et sécuriser votre compte",
              "Exécution du contrat",
              "Durée du compte, puis 3 mois",
            ],
            [
              "Données de connexion et logs techniques",
              "Sécurité, prévention des accès non autorisés",
              "Intérêt légitime",
              "12 mois",
            ],
            [
              "Données de facturation",
              "Gérer l'abonnement et respecter les obligations comptables",
              "Exécution du contrat, obligation légale",
              "10 ans (obligation comptable)",
            ],
            [
              "Preuve du consentement RGPD recueilli à l'inscription",
              "Démontrer le respect de nos obligations",
              "Obligation légale",
              "Durée du compte, puis 3 ans",
            ],
            [
              "Échanges avec le support",
              "Répondre à vos demandes",
              "Intérêt légitime",
              "3 ans après le dernier contact",
            ],
          ]}
        />
        <P>
          Nous ne vendons aucune donnée. Nous n&apos;utilisons pas vos données à des fins
          publicitaires.
        </P>
      </Section>

      <Section title="4. Données de vos patients">
        <P>
          Vous restez maître de ces données. Vela les héberge et les traite pour vous, sans les
          exploiter à d&apos;autres fins. Nos équipes n&apos;y accèdent pas, sauf demande
          explicite de votre part (support technique) ou obligation légale, et toujours sous
          obligation de confidentialité.
        </P>
        <P>
          Ces données seront hébergées chez un hébergeur certifié HDS, en Union européenne. Les
          conditions détaillées figurent dans l&apos;
          <LegalLink href="/sous-traitance">Accord de sous-traitance</LegalLink>.
        </P>
        <P>
          Le secret professionnel qui s&apos;applique à votre pratique reste le vôtre. Vela met
          en place les moyens techniques pour le préserver, mais ne s&apos;y substitue pas.
        </P>
      </Section>

      <Section title="5. Qui a accès aux données">
        <P>Vos données peuvent être communiquées à :</P>
        <Ul
          items={[
            "Nos prestataires techniques (hébergement, envoi d'e-mails, paiement), agissant comme sous-traitants et liés par contrat.",
            "Les autorités compétentes, en cas d'obligation légale.",
          ]}
        />
        <P>
          La liste des sous-traitants techniques est disponible sur demande à
          margaux.francillard@gmail.com.
        </P>
      </Section>

      <Section title="6. Localisation des données">
        <P>
          Vos données et celles de vos patients sont hébergées en Union européenne. Nous ne
          procédons à aucun transfert hors de l&apos;Union européenne. Si un transfert devenait
          nécessaire, il serait encadré par les garanties prévues par le RGPD et vous en seriez
          informé au préalable.
        </P>
      </Section>

      <Section title="7. Sécurité">
        <P>
          Nous appliquons des mesures techniques et organisationnelles adaptées : chiffrement des
          données en transit et au repos, mots de passe hachés, contrôle des accès,
          journalisation, sauvegardes régulières. Aucun système n&apos;est infaillible, mais nous
          nous engageons à maintenir un niveau de protection à la hauteur de la sensibilité des
          données de santé.
        </P>
      </Section>

      <Section title="8. Vos droits">
        <P>
          Vous disposez des droits suivants sur vos données de praticien : accès, rectification,
          effacement, limitation, opposition, portabilité, et retrait de votre consentement
          quand le traitement repose dessus.
        </P>
        <P>
          Pour les exercer, écrivez à margaux.francillard@gmail.com. Nous répondons sous un mois.
        </P>
        <P>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL
          (www.cnil.fr).
        </P>
      </Section>

      <Section title="9. Droits des patients">
        <P>
          Vos patients exercent leurs droits directement auprès de vous, qui êtes responsable de
          leur traitement. Vela vous fournit les fonctions nécessaires pour y répondre (export,
          rectification, suppression) et vous assiste si besoin, dans le cadre de l&apos;accord
          de sous-traitance.
        </P>
      </Section>

      <Section title="10. Cookies">
        <P>
          Le service utilise des cookies. Le détail figure dans la{" "}
          <LegalLink href="/cookies">Politique de cookies</LegalLink>.
        </P>
      </Section>

      <Section title="11. Modifications">
        <P>
          Cette politique peut évoluer. En cas de changement significatif, nous vous en
          informons par e-mail ou dans l&apos;application. La date en haut du document indique
          la dernière version.
        </P>
      </Section>

      <Section title="12. Contact">
        <P>Pour toute question : margaux.francillard@gmail.com.</P>
        <P>Délégué à la protection des données : Non désigné à ce stade.</P>
      </Section>
    </article>
  );
}
