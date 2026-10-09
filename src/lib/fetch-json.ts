// GET côté client qui ne lève jamais : renvoie null si le réseau échoue, si la
// réponse n'est pas 2xx, ou si son corps n'est pas du JSON valide (une erreur non
// gérée dans une route API renvoie une 500 au corps vide, sur laquelle
// `response.json()` lève "Unexpected end of JSON input").
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, init).catch(() => null);
  if (!response?.ok) return null;
  return response.json().catch(() => null);
}
