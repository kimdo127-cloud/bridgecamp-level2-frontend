"use client";

import { useEffect, useState } from "react";
import { AdminBar, Chip, Skeleton, StatusScreen } from "@/components/ui";
import { ApiError, getInquiryLog } from "@/lib/api";
import type { InquiryLog } from "@/lib/types";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; log: InquiryLog };

function when(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 문의·챗봇 기록: 수강생이 남긴 문의와 챗봇 질문을 보고, 자주 묻는 내용을 화면 개선에 반영한다
export default function InquiriesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [tab, setTab] = useState<"inquiries" | "chats">("inquiries");

  useEffect(() => {
    getInquiryLog()
      .then((log) => setState({ status: "ready", log }))
      .catch((e) => setState({ status: "error", message: e instanceof ApiError ? e.message : "기록을 불러오지 못했어요." }));
  }, []);

  const log = state.status === "ready" ? state.log : null;
  const handoff = log ? log.chats.filter((c) => c.needsHuman).length : 0;

  return (
    <main className="pb-12">
      <AdminBar userHref="/" nav="/admin/inquiries" />
      <section className="px-5 pt-5">
        <h1 className="text-[22px] font-bold">문의·챗봇 기록</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {log ? `챗봇 질문 ${log.chats.length}건 중 ${handoff}건은 운영팀 확인이 필요했어요.` : "수강생 문의와 챗봇 질문을 모아 봐요."}
        </p>
      </section>

      <div className="mx-5 mt-4 grid grid-cols-2 rounded-2xl bg-white p-1" role="tablist">
        {(
          [
            ["inquiries", `운영팀 문의 ${log?.inquiries.length ?? ""}`],
            ["chats", `챗봇 질문 ${log?.chats.length ?? ""}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-10 rounded-xl text-[14px] font-semibold ${tab === key ? "bg-ink text-white" : "text-ink-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {state.status === "loading" && (
        <div className="mt-4 space-y-2.5 px-5">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}
      {state.status === "error" && <StatusScreen emoji="🔌" title="기록을 불러오지 못했어요" body={state.message} />}

      {log && tab === "inquiries" && (
        <ul className="mt-4 space-y-2.5 px-5">
          {log.inquiries.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">아직 들어온 문의가 없어요.</p>}
          {log.inquiries.map((q) => (
            <li key={q.id} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-2 text-[12px] text-ink-soft">
                <span>
                  <b className="text-ink">{q.userName}</b>
                  {q.courseTitle && ` · ${q.courseTitle}`}
                </span>
                <span>{when(q.createdAt)}</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed">{q.message}</p>
              {q.chatQuestion && <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-[12px] text-ink-soft">💬 챗봇에 먼저 물어본 질문: {q.chatQuestion}</p>}
            </li>
          ))}
        </ul>
      )}

      {log && tab === "chats" && (
        <ul className="mt-4 space-y-2.5 px-5">
          {log.chats.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between gap-2 text-[12px] text-ink-soft">
                <span>{c.userName ?? "로그인 전 방문자"}</span>
                <span className="flex items-center gap-1.5">
                  {c.needsHuman && <Chip tone="gray">운영팀 확인 필요</Chip>}
                  {when(c.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-semibold">Q. {c.question}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">A. {c.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
