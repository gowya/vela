/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Les pages du dashboard sont entièrement dynamiques (données patient/consultation
    // par session) : le cache client par défaut (30s) affichait des données obsolètes
    // en revenant sur une page déjà visitée juste après une mutation (ex. dashboard
    // après ajout d'une consultation). On désactive ce cache pour les pages dynamiques.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
