import { Suspense } from "react";
import { AppointmentsList } from "./AppointmentsList";

export default function AppointmentsPage() {
  return (
    <Suspense>
      <AppointmentsList />
    </Suspense>
  );
}
