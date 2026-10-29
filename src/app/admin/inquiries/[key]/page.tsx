import { Suspense } from "react";
import { ThreadDetail } from "./thread-detail";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ThreadDetail />
    </Suspense>
  );
}
