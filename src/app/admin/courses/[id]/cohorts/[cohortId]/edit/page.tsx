import { Suspense } from "react";
import { CohortForm } from "@/components/cohort-form";

export default function Page() {
  return (
    <Suspense>
      <CohortForm />
    </Suspense>
  );
}
