import { Pool } from "pg";

// Une seule instance de pool partagée par toute l'app.
// L'URL vient de la variable d'environnement DATABASE_URL (Clever Cloud, ou local en dev).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
