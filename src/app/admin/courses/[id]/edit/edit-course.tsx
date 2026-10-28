"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CourseForm } from "@/components/course-form";
import { HomeLink, Skeleton, StatusScreen, TopBar } from "@/components/ui";
import { getCourse } from "@/lib/api";
import type { CourseWithCohorts } from "@/lib/types";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; item: CourseWithCohorts };

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    getCourse(Number(id))
      .then((item) => setState(item ? { status: "ready", item } : { status: "missing" }))
      .catch(() => setState({ status: "missing" }));
  }, [id]);

  if (state.status === "ready") return <CourseForm course={state.item} />;
  return (
    <main>
      <TopBar title="과정 수정" backHref="/admin" />
      {state.status === "loading" ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      ) : (
        <StatusScreen emoji="🔍" title="찾는 과정이 없어요" body="목록에서 과정을 다시 골라 주세요." action={<HomeLink />} />
      )}
    </main>
  );
}
