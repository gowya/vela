import { Suspense } from "react";
import { ConsultationsList } from "./ConsultationsList";

export default function ConsultationsPage() {
  return (
    <Suspense>
      <ConsultationsList />
    </Suspense>
  );
}
