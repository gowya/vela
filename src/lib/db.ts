import { Pool, types } from "pg";

// Les colonnes DATE (ex. birth_date) sont retournées telles quelles ("YYYY-MM-DD")
// plutôt que converties en objet Date par node-postgres, qui les interprète en UTC
// et peut décaler le jour d'une unité selon le fuseau horaire du serveur — problématique
// pour le calcul de l'âge et des rappels d'anniversaire.
const PG_TYPE_DATE = 1082;
types.setTypeParser(PG_TYPE_DATE, (value) => value);

// Une seule instance de pool partagée par toute l'app.
// L'URL vient de la variable d'environnement DATABASE_URL (Clever Cloud, ou local en dev).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
