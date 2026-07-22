// L'âge et le rappel d'anniversaire ne sont jamais stockés : ils se calculent
// à l'affichage à partir de `birth_date`, pour rester toujours exacts au jour près.

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Recherche client (la liste des patients est déjà entièrement chargée) sur
// tous les champs texte pertinents, y compris les valeurs de champs
// personnalisés — insensible à la casse et aux accents.
export function patientMatchesSearch(
  patient: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    identifiedIssue: string | null;
    intakeNotes: string | null;
    status: string | null;
    genderIdentity: string | null;
    address: string | null;
    customFieldValues?: Record<string, string>;
  },
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystack = normalizeSearchText(
    [
      patient.firstName,
      patient.lastName,
      patient.email,
      patient.phone,
      patient.identifiedIssue,
      patient.intakeNotes,
      patient.status,
      patient.genderIdentity,
      patient.address,
      ...Object.values(patient.customFieldValues ?? {}),
    ]
      .filter(Boolean)
      .join(" ")
  );

  return haystack.includes(normalizeSearchText(trimmed));
}

export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const [year, month, day] = birthDate.split("-").map(Number);
  const today = new Date();

  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

export function isBirthdaySoon(birthDate: string | null, withinDays = 7): boolean {
  if (!birthDate) return false;

  const [, month, day] = birthDate.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextBirthday = new Date(today.getFullYear(), month - 1, day);
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffInDays = Math.round(
    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffInDays >= 0 && diffInDays <= withinDays;
}
