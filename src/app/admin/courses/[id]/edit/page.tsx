import { Suspense } from "react";
import EditCoursePage from "./edit-course";

export default function Page() {
  return (
    <Suspense>
      <EditCoursePage />
    </Suspense>
  );
}
