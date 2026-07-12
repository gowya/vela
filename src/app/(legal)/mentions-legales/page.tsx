import type { Metadata } from "next";
import { Section, P, LegalLink } from "../_components";

export const metadata: Metadata = {
  title: "Mentions légales — Vela",
};

export default function MentionsLegalesPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">Mentions légales</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : 10 juillet 2026</p>
      </header>

      <Section title="Éditeur">
        <P>Le service Vela (site et application) est édité par :</P>
        <P>
          <strong>Margaux FRANCILLARD</strong>, exerçant sous le statut d&apos;Entrepreneur
          Individuel (EI), sans capital social.
        </P>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Siège social : 1 place Charles de Gaulle C33, 34170 Castelnau-le-Lez</li>
          <li>
            Immatriculée au Répertoire National des Entreprises (RNE) sous le SIRET 912 070 976
            00028
          </li>
          <li>
            Numéro de TVA intracommunautaire : Non applicable — franchise en base de TVA
            (article 293 B du CGI)
          </li>
          <li>Adresse e-mail : margaux.francillard@gmail.com</li>
          <li>Téléphone : 06 86 34 40 08</li>
        </ul>
      </Section>

      <Section title="Directeur de la publication">
        <P>
          Margaux FRANCILLARD, en qualité d&apos;Entrepreneur Individuel, fondatrice de Vela.
        </P>
      </Section>

      <Section title="Hébergement du site et de l'application">
        <P>
          Aucun hébergeur n&apos;est souscrit à ce jour : le site et l&apos;application sont en
          développement local. Cette section sera complétée avant la mise en production.
        </P>
      </Section>

      <Section title="Hébergement des données de santé">
        <P>
          Les données de santé traitées via Vela seront hébergées par un hébergeur certifié «
          Hébergeur de Données de Santé » (HDS), conformément à l&apos;article L.1111-8 du Code
          de la santé publique :
        </P>
        <P>
          Aucun hébergeur HDS n&apos;est souscrit à ce jour (service en développement, non encore
          déployé en production). Cette section sera complétée avant tout traitement de données
          de santé réelles.
        </P>
      </Section>

      <Section title="Propriété intellectuelle">
        <P>
          La marque Vela, son logo, son interface, ses textes et son code source sont la
          propriété exclusive de Margaux FRANCILLARD (EI), ou font l&apos;objet de licences
          autorisant leur usage. Toute reproduction ou réutilisation, totale ou partielle, sans
          autorisation écrite est interdite.
        </P>
      </Section>

      <Section title="Contact">
        <P>Pour toute question relative au service : margaux.francillard@gmail.com.</P>
        <P>
          Pour toute question relative aux données personnelles : voir la{" "}
          <LegalLink href="/confidentialite">Politique de confidentialité</LegalLink>.
        </P>
      </Section>
    </article>
  );
}
