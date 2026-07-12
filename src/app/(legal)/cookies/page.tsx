import type { Metadata } from "next";
import { Section, P, LegalTable } from "../_components";

export const metadata: Metadata = {
  title: "Politique de cookies — Vela",
};

export default function CookiesPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">Politique de cookies</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : 10 juillet 2026</p>
      </header>

      <P>
        Vela utilise le strict nécessaire. Nous ne pratiquons pas de suivi publicitaire.
      </P>

      <Section title="Ce qu'est un cookie">
        <P>
          Un cookie est un petit fichier déposé sur votre appareil quand vous utilisez le
          service. Il permet notamment de vous garder connecté d&apos;une page à l&apos;autre.
        </P>
      </Section>

      <Section title="Les cookies que nous utilisons">
        <P>
          <strong>Cookies strictement nécessaires.</strong> Ils font fonctionner le service et
          ne peuvent pas être désactivés. Ils gèrent votre session et votre connexion sécurisée.
          Aucun consentement n&apos;est requis pour ces cookies.
        </P>
        <LegalTable
          headers={["Cookie", "Rôle", "Durée"]}
          rows={[
            ["Session d'authentification", "Vous garder connecté et sécuriser l'accès", "30 jours"],
            ["Sécurité (protection anti-fraude)", "Prévenir les accès non autorisés", "Session"],
          ]}
        />
        <P>
          <strong>Cookies de mesure d&apos;audience.</strong> Nous n&apos;utilisons actuellement
          aucun cookie de mesure d&apos;audience ni de publicité.
        </P>
      </Section>

      <Section title="Gérer vos préférences">
        <P>
          Vous pouvez configurer votre navigateur pour refuser ou supprimer les cookies. Le
          refus des cookies strictement nécessaires peut empêcher le service de fonctionner
          correctement.
        </P>
        <P>Un bandeau de gestion des cookies sera mis en place au lancement du service.</P>
      </Section>

      <Section title="Contact">
        <P>Pour toute question : margaux.francillard@gmail.com.</P>
      </Section>
    </article>
  );
}
