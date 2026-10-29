"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminBar, Skeleton, StatusScreen } from "@/components/ui";
import { ApiError, getInquiryLog } from "@/lib/api";
import { REPLIED_KEY } from "./[key]/thread-detail";
import { formatListTime as when } from "@/lib/format";
import type { InquiryLog, Thread } from "@/lib/types";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; log: InquiryLog };
type Tab = "member" | "visitor";
const TAB_KEY = "bridgecamp:inquiry-tab";

// 문의 내역: 메일함처럼 한 줄에 한 사람. 누르면 대화를 보고 (로그인 수강생이면) 바로 답변한다
export default function InquiriesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [tab, setTab] = useState<Tab>("member");

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (sessionStorage.getItem(TAB_KEY) === "visitor") setTab("visitor");
        // 방금 답변한 대화는 새 목록을 받기 전에도 "답변 완료"로 바로 바꿔 보여 준다
        const replied = sessionStorage.getItem(REPLIED_KEY);
        if (replied) {
          sessionStorage.removeItem(REPLIED_KEY);
          setState((s) =>
            s.status === "ready" ? { status: "ready", log: { ...s.log, member: s.log.member.map((m) => (m.key === replied ? { ...m, status: "answered" } : m)) } } : s,
          );
        }
      } catch {}
    }, 0);
    getInquiryLog()
      .then((log) => setState({ status: "ready", log }))
      .catch((e) => setState({ status: "error", message: e instanceof ApiError ? e.message : "문의 내역을 불러오지 못했어요." }));
    return () => clearTimeout(t);
  }, []);

  const pick = (t: Tab) => {
    setTab(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {}
  };

  const log = state.status === "ready" ? state.log : null;
  const list = log ? log[tab] : [];
  const waiting = log ? log.member.filter((t) => t.status === "waiting").length : 0;

  return (
    <main className="pb-12">
      <AdminBar nav="/admin/inquiries" />
      <section className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">문의 내역</h1>
        {log && <p className="mt-1 text-sm text-ink-soft">{waiting > 0 ? `답변을 기다리는 수강생이 ${waiting}명 있어요.` : "답변을 기다리는 문의가 없어요."}</p>}
      </section>

      <div className="mt-4 flex border-b border-line bg-surface px-5" role="tablist">
        {(
          [
            ["member", "로그인", log?.member.length],
            ["visitor", "비로그인", log?.visitor.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => pick(key)}
            className={`-mb-px flex h-12 flex-1 items-center justify-center gap-1.5 border-b-2 text-[15px] font-semibold ${tab === key ? "border-ink text-ink" : "border-transparent text-ink-soft"}`}
          >
            {label}
            {count !== undefined && <span className={`text-[13px] ${tab === key ? "text-brand-600" : ""}`}>{count}</span>}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="space-y-px">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 bg-white px-5 py-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {state.status === "error" && <StatusScreen emoji="🔌" title="문의 내역을 불러오지 못했어요" body={state.message} />}

      {log && tab === "visitor" && (
        <p className="bg-white px-5 py-3 text-[12px] leading-relaxed text-ink-soft">
          로그인하지 않은 방문자의 챗봇 질문이에요. 답변은 방문자가 같은 브라우저로 챗봇을 열 때 보이고, {log.retentionDays}일이 지나면 대화와 함께 지워져요.
        </p>
      )}

      {log && list.length === 0 && <p className="py-16 text-center text-sm text-ink-soft">{tab === "member" ? "아직 로그인한 수강생의 문의가 없어요." : "아직 비로그인 방문자의 질문이 없어요."}</p>}

      {log && list.length > 0 && (
        <ul className="divide-y divide-line border-y border-line bg-white">
          {list.map((t) => (
            <ThreadRow key={t.key} t={t} />
          ))}
        </ul>
      )}
    </main>
  );
}

function ThreadRow({ t }: { t: Thread }) {
  const waiting = t.status === "waiting";
  return (
    <li>
      <Link href={`/admin/inquiries/${encodeURIComponent(t.key)}`} className="flex items-center gap-3 px-5 py-4 active:bg-surface">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${t.kind === "member" ? "bg-brand-100 text-brand-700" : "bg-[#eceef4] text-ink-soft"}`}
          aria-hidden
        >
          {t.kind === "member" ? t.label.slice(0, 1) : "#"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-[15px] ${waiting ? "font-bold" : "font-semibold"}`}>{t.label}</span>
            <span className="shrink-0 text-[12px] text-ink-soft">{when(t.lastAt)}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-[14px] ${waiting ? "text-ink" : "text-ink-soft"}`}>{t.preview}</span>
            {waiting ? (
              <span className="shrink-0 rounded-full bg-[#e5484d] px-2 py-0.5 text-[11px] font-bold text-white">답변 대기</span>
            ) : t.status === "answered" ? (
              <span className="shrink-0 text-[12px] font-semibold text-moss-600">답변 완료</span>
            ) : (
              <span className="shrink-0 text-[12px] text-ink-soft">질문 {t.count}개</span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
