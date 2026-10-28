"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton, StatusScreen, primaryButton, useCurrentPath } from "@/components/ui";
import { useAuth } from "@/lib/auth";

// 운영 화면은 관리자 계정으로 로그인해야 볼 수 있다. (화면에서 막는 것과 별개로 백엔드도 관리자만 허용한다)
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const pathname = useCurrentPath("/admin");

  if (!ready)
    return (
      <main aria-busy="true">
        <div className="h-14 bg-ink" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </main>
    );

  if (user?.role !== "admin")
    return (
      <main>
        <div className="flex h-14 items-center bg-ink px-5 text-white">
          <Link href="/" className="font-bold active:opacity-70">
            브릿지캠프
          </Link>
          <span className="ml-1.5 rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-semibold">운영 모드</span>
        </div>
        <StatusScreen
          emoji="🔒"
          title={user ? "운영 매니저만 볼 수 있어요" : "로그인이 필요해요"}
          body={user ? "수강생 계정으로는 운영 화면에 들어갈 수 없어요.\n운영 매니저 계정으로 다시 로그인해 주세요." : "운영 화면은 운영 매니저 계정으로\n로그인한 뒤에 볼 수 있어요."}
          action={
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={primaryButton}>
              운영 매니저로 로그인
            </Link>
          }
        />
      </main>
    );

  return children;
}
