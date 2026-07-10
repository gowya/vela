import { Suspense } from "react";
import { PatientsList } from "./PatientsList";

export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsList />
    </Suspense>
  );
}
