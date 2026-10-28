import { Suspense } from "react";
import { CourseDetailPage, DetailSkeleton } from "@/components/course-detail";

export default function Page() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CourseDetailPage mode="user" />
    </Suspense>
  );
}
