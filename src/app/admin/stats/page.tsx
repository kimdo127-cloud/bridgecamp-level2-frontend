"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminBar, Skeleton, StatusScreen, primaryButton } from "@/components/ui";
import { ApiError, getStats, resetData } from "@/lib/api";
import { deadlineLabel, formatDot } from "@/lib/format";
import type { Stats } from "@/lib/types";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; stats: Stats };

// 운영 현황: 숫자 3개(오늘 신청, 남은 자리, 마감 임박 기수) + 과정별 신청 전환 현황 + 가상 데이터 리셋
export default function StatsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then((stats) => setState({ status: "ready", stats }))
      .catch((e) => setState({ status: "error", message: e instanceof ApiError ? e.message : "현황을 불러오지 못했어요." }));
  }, [reloadKey]);

  const reset = async () => {
    if (!window.confirm("가상 데이터를 처음 상태로 다시 채울까요?\n지금까지 들어온 신청·문의·등록한 과정이 모두 처음 상태로 돌아가요.")) return;
    setResetting(true);
    setNotice(null);
    try {
      const r = await resetData();
      setNotice(r.message);
      setState({ status: "loading" });
      setReloadKey((k) => k + 1);
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "다시 채우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="pb-12">
      <AdminBar userHref="/" nav="/admin/stats" />
      <section className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">운영 현황</h1>
        <p className="mt-1 text-sm text-ink-soft">{state.status === "ready" ? `${formatDot(state.stats.today)} 기준` : "오늘 기준"} · 신청·취소가 바로 반영돼요</p>
      </section>

      {notice && (
        <p role="status" className="mx-5 mt-4 rounded-2xl bg-moss-100 px-4 py-3 text-[14px] font-medium text-moss-600">
          ✓ {notice}
        </p>
      )}

      {state.status === "loading" && (
        <div className="mt-5 grid grid-cols-3 gap-2 px-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}
      {state.status === "error" && <StatusScreen emoji="🔌" title="현황을 불러오지 못했어요" body={state.message} />}

      {state.status === "ready" && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2 px-5">
            <Metric label="오늘 신청" value={state.stats.todayApplications} unit="건" tone="brand" />
            <Metric label="남은 자리" value={state.stats.remainingSeats} unit="석" hint="모집 중 기수 합계" />
            <Metric label="마감 임박" value={state.stats.closingSoonCount} unit="개 기수" hint="신청 마감 7일 이내" tone="red" />
          </div>

          {state.stats.closingSoon.length > 0 && (
            <section className="mx-5 mt-4 rounded-3xl bg-white p-5">
              <h2 className="text-base font-bold">🔥 마감 임박 기수</h2>
              <ul className="mt-3 divide-y divide-line">
                {state.stats.closingSoon.map((x) => (
                  <li key={x.cohortId}>
                    <Link href={`/admin/courses/${x.courseId}`} className="flex items-center justify-between gap-3 py-2.5 text-[14px] active:opacity-60">
                      <span className="min-w-0 truncate font-semibold">
                        {x.courseTitle} {x.cohortNo}기
                      </span>
                      <span className="shrink-0 text-[13px]">
                        <b className="text-[#c23b3b]">{deadlineLabel(x.applyDeadline)}</b>
                        <span className="text-ink-soft"> · 남은 {x.remaining}석</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ConversionCard rows={state.stats.conversion} />
        </>
      )}

      <section className="mx-5 mt-4 rounded-3xl border border-dashed border-line bg-white/60 p-5">
        <h2 className="text-base font-bold">가상 데이터 다시 채우기</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">시연 중에 바뀐 신청·문의·과정을 처음 상태(과정 6개, 기수 10개, 신청 38건)로 되돌려요. 날짜는 오늘을 기준으로 다시 맞춰져요.</p>
        <button type="button" onClick={reset} disabled={resetting} className={`${primaryButton} mt-4 !bg-ink`}>
          {resetting ? "다시 채우는 중…" : "가상 데이터 다시 채우기"}
        </button>
      </section>
    </main>
  );
}

function Metric({ label, value, unit, hint, tone }: { label: string; value: number; unit: string; hint?: string; tone?: "brand" | "red" }) {
  const color = tone === "brand" ? "text-brand-600" : tone === "red" ? "text-[#c23b3b]" : "text-ink";
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(24,27,43,0.04)]">
      <p className="text-[12px] font-semibold text-ink-soft">{label}</p>
      <p className={`mt-1 text-[26px] leading-none font-extrabold ${color}`}>
        {value.toLocaleString("ko-KR")}
        <span className="ml-0.5 text-[12px] font-semibold text-ink-soft">{unit}</span>
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-tight text-ink-soft">{hint}</p>}
    </div>
  );
}

// 신청 전환 현황: 과정 상세를 본 사람 중 신청까지 이어진 비율
function ConversionCard({ rows }: { rows: Stats["conversion"] }) {
  const maxViews = Math.max(1, ...rows.map((r) => r.views));
  return (
    <section className="mx-5 mt-4 rounded-3xl bg-white p-5">
      <h2 className="text-base font-bold">신청 전환 현황</h2>
      <p className="mt-0.5 text-[13px] text-ink-soft">상세 조회 → 신청 (신청 중 인원 기준)</p>
      <ul className="mt-4 space-y-3.5">
        {rows.map((r) => (
          <li key={r.courseId}>
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <Link href={`/admin/courses/${r.courseId}`} className="min-w-0 truncate font-semibold active:opacity-60">
                {r.title}
              </Link>
              <span className="shrink-0 font-bold text-brand-700">{r.rate}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
              <div className="h-full rounded-full bg-brand-200" style={{ width: `${(r.views / maxViews) * 100}%` }}>
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${r.views ? Math.min((r.applications / r.views) * 100, 100) : 0}%` }} />
              </div>
            </div>
            <p className="mt-1 text-[12px] text-ink-soft">
              조회 {r.views}회 · 신청 {r.applications}명
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
