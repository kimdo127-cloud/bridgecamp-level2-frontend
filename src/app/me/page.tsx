"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CategoryThumb, Chip, Skeleton, StatusScreen, TopBar, primaryButton, useAdminRedirect } from "@/components/ui";
import { ApiError, cancelApplication, myApplications, myInquiries } from "@/lib/api";
import { logout, useAuth } from "@/lib/auth";
import { cohortStatusLabel, formatChatTime, formatDot, formatPrice, formatRange, todayString } from "@/lib/format";
import type { Application, MyInquiryItem } from "@/lib/types";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: Application[] };

// 내 신청: 로그인한 수강생 본인의 신청만 보인다 (백엔드도 본인 것만 돌려준다)
export default function MyApplicationsPage() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const redirecting = useAdminRedirect("/admin");
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [inquiries, setInquiries] = useState<MyInquiryItem[]>([]);

  useEffect(() => {
    if (!ready || user?.role !== "member") return;
    myApplications()
      .then((items) => setState({ status: "ready", items }))
      .catch((e) => setState({ status: "error", message: e instanceof ApiError ? e.message : "내 신청을 불러오지 못했어요." }));
    myInquiries()
      .then(setInquiries)
      .catch(() => setInquiries([]));
  }, [ready, user, reloadKey]);

  if (!ready || redirecting) return <Loading />;
  if (user?.role !== "member")
    return (
      <main>
        <TopBar title="내 신청" backHref="/" />
        <StatusScreen
          emoji="🙋"
          title={user ? "수강생 계정으로 로그인해 주세요" : "로그인이 필요해요"}
          body={"내 신청은 수강생 계정으로\n로그인한 뒤에 볼 수 있어요."}
          action={
            <Link href="/login?next=/me" className={primaryButton}>
              로그인
            </Link>
          }
        />
      </main>
    );

  const cancel = async (a: Application) => {
    if (!window.confirm(`${a.course.title} ${a.cohort.cohortNo}기 신청을 취소할까요?\n취소하면 자리가 다른 분께 돌아가요.`)) return;
    setBusy(a.id);
    setNotice(null);
    try {
      await cancelApplication(a.id);
      setNotice({ tone: "ok", text: "신청을 취소했어요." });
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof ApiError ? e.message : "취소하지 못했어요. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(null);
      setReloadKey((k) => k + 1);
    }
  };

  const items = state.status === "ready" ? state.items : [];
  const active = items.filter((a) => a.status === "applied");
  const past = items.filter((a) => a.status === "cancelled");

  return (
    <main className="pb-10">
      <TopBar
        title="내 신청"
        backHref="/"
        right={
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="px-3 py-2 text-[13px] font-medium text-ink-soft"
          >
            로그아웃
          </button>
        }
      />
      <section className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">{user.name}님의 신청</h1>
        <p className="mt-1 text-sm text-ink-soft">개강 전까지는 여기서 직접 취소할 수 있어요.</p>
      </section>

      {notice && (
        <p role="status" className={`mx-5 mt-4 rounded-2xl px-4 py-3 text-[14px] font-medium ${notice.tone === "ok" ? "bg-moss-100 text-moss-600" : "bg-[#fff1f1] text-[#c23b3b]"}`}>
          {notice.tone === "ok" ? "✓" : "⚠︎"} {notice.text}
        </p>
      )}

      {state.status === "loading" && (
        <div className="mt-6 space-y-2.5 px-5">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      )}
      {state.status === "error" && <StatusScreen emoji="🔌" title="내 신청을 불러오지 못했어요" body={state.message} />}

      {state.status === "ready" && items.length === 0 && (
        <StatusScreen
          emoji="📝"
          title="아직 신청한 과정이 없어요"
          body="관심 있는 과정을 둘러보고 신청해 보세요."
          action={
            <Link href="/" className={primaryButton}>
              과정 둘러보기
            </Link>
          }
        />
      )}

      {active.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-lg font-bold">
            신청 중 <span className="text-brand-600">{active.length}</span>
          </h2>
          <ul className="space-y-2.5">
            {active.map((a) => (
              <ApplicationCard key={a.id} a={a} busy={busy === a.id} onCancel={() => cancel(a)} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-8 px-5">
          <h2 className="mb-3 text-lg font-bold text-ink-soft">취소한 신청</h2>
          <ul className="space-y-2.5 opacity-60">
            {past.map((a) => (
              <ApplicationCard key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}
      {/* 운영팀 문의와 답변: 챗봇에서 남긴 문의에 운영팀이 답하면 여기에 표시된다 */}
      {inquiries.length > 0 && (
        <section className="mt-8 px-5">
          <h2 className="mb-3 text-lg font-bold">
            운영팀 답변 <span className="text-brand-600">{inquiries.filter((i) => i.type === "reply").length}</span>
          </h2>
          <ol className="space-y-2.5 rounded-2xl bg-white p-4">
            {inquiries.map((i) => (
              <li key={`${i.type}-${i.id}`} className={`flex flex-col ${i.type === "reply" ? "items-start" : "items-end"}`}>
                <span className="mb-1 px-1 text-[11px] text-ink-soft">
                  {i.type === "reply" ? "브릿지캠프 운영팀" : "내 문의"} · {formatChatTime(i.at)}
                </span>
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${i.type === "reply" ? "rounded-bl-md bg-brand-50 text-ink" : "rounded-br-md bg-[#eceef4] text-ink"}`}
                >
                  {i.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

function ApplicationCard({ a, busy, onCancel }: { a: Application; busy?: boolean; onCancel?: () => void }) {
  const started = a.cohort.startDate <= todayString();
  return (
    <li className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(24,27,43,0.06)]">
      <Link href={`/courses/${a.course.id}`} className="flex gap-3">
        <CategoryThumb category={a.course.category} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Chip tone={a.status === "cancelled" ? "gray" : started ? "brand" : "moss"}>
              {a.status === "cancelled" ? "취소됨" : started ? "수강 중" : cohortStatusLabel({ ...a.cohort, courseId: a.course.id, capacity: 0, appliedCount: 0, remaining: 0 })}
            </Chip>
            <span className="text-[12px] text-ink-soft">{a.course.format}</span>
          </div>
          <p className="mt-1 truncate text-[15px] font-bold">
            {a.course.title} {a.cohort.cohortNo}기
          </p>
          <p className="text-[13px] text-ink-soft">
            {formatRange(a.cohort.startDate, a.cohort.endDate)}
            {a.cohort.schedule && ` · ${a.cohort.schedule}`}
          </p>
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <span className="text-ink-soft">
          {formatPrice(a.course.price)} · 신청일 {formatDot(a.createdAt.slice(0, 10))}
        </span>
        {onCancel && !started && (
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg px-3 py-1.5 font-semibold text-[#c23b3b] ring-1 ring-[#f3c4c4] active:bg-[#fff1f1] disabled:opacity-50">
            {busy ? "취소하는 중…" : "신청 취소"}
          </button>
        )}
      </div>
    </li>
  );
}

function Loading() {
  return (
    <main aria-busy="true">
      <TopBar title="내 신청" backHref="/" />
      <div className="space-y-2.5 p-5">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </main>
  );
}
