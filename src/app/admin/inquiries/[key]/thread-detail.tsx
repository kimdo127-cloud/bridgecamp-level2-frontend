"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Skeleton, StatusScreen } from "@/components/ui";
import { ApiError, getInquiryLog, replyToThread } from "@/lib/api";
import { formatChatTime } from "@/lib/format";
import type { Thread } from "@/lib/types";

export const REPLIED_KEY = "bridgecamp:replied";

type State = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; thread: Thread };

// 문의 내역 상세: 한 사람의 대화를 메신저처럼 보여 주고, 아래에서 바로 답변을 보낸다 (비로그인 방문자는 챗봇에서 받아 봄)
export function ThreadDetail() {
  const { key } = useParams<{ key: string }>();
  const threadKey = decodeURIComponent(key);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getInquiryLog()
      .then((log) => {
        const thread = [...log.member, ...log.visitor].find((t) => t.key === threadKey);
        setState(thread ? { status: "ready", thread } : { status: "missing" });
      })
      .catch((e) => setState({ status: "error", message: e instanceof ApiError ? e.message : "대화를 불러오지 못했어요." }));
  }, [threadKey, reloadKey]);

  useEffect(() => {
    if (state.status === "ready") bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await replyToThread(threadKey, draft.trim());
      // 목록으로 돌아갔을 때 새로 받아 오기 전에도 바로 "답변 완료"로 보이게 표시해 둔다
      try {
        sessionStorage.setItem(REPLIED_KEY, threadKey);
      } catch {}
      setDraft("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors.message ?? err.message) : "답변을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  const thread = state.status === "ready" ? state.thread : null;
  const member = thread?.kind === "member";

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 bg-ink px-2 text-white">
        <button type="button" onClick={() => router.push("/admin/inquiries")} className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/10" aria-label="문의 내역으로">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">{thread?.label ?? "문의 내역"}</p>
          {thread && <p className="text-[12px] text-white/60">{member ? "로그인 수강생" : "비로그인 방문자"}</p>}
        </div>
      </header>

      {state.status === "loading" && (
        <div className="space-y-3 p-5">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
        </div>
      )}
      {state.status === "missing" && <StatusScreen emoji="🔍" title="찾는 대화가 없어요" body={"보관 기간이 지나 지워졌거나\n주소가 잘못되었어요."} />}
      {state.status === "error" && <StatusScreen emoji="🔌" title="대화를 불러오지 못했어요" body={state.message} />}

      {thread && (
        <div className="flex-1 space-y-4 bg-surface px-4 py-5">
          {thread.items.map((it) => (
            <div key={`${it.type}-${it.id}`} className="space-y-1.5">
              {it.type === "chat" && (
                <>
                  <Bubble side="left" tag="챗봇에 질문" time={it.at}>
                    {it.text}
                  </Bubble>
                  <Bubble side="left" tone="bot" tag={it.needsHuman ? "챗봇 답변 · 운영팀 확인 필요" : "챗봇 답변"}>
                    {it.answer}
                  </Bubble>
                </>
              )}
              {it.type === "inquiry" && (
                <Bubble side="left" tone="inquiry" tag={`운영팀 문의${it.courseTitle ? ` · ${it.courseTitle}` : ""}`} time={it.at}>
                  {it.text}
                </Bubble>
              )}
              {it.type === "reply" && (
                <Bubble side="right" tag="운영팀 답변" time={it.at}>
                  {it.text}
                </Bubble>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {thread && (
        <form onSubmit={send} className="sticky bottom-0 border-t border-line bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            {/* 비로그인 방문자는 같은 브라우저로 챗봇을 열 때 답변을 본다 */}
            {!member && <p className="mb-2 px-1 text-[12px] text-ink-soft">이 방문자가 같은 브라우저로 챗봇을 열면 답변이 보여요. (30일 뒤 대화와 함께 삭제)</p>}
            {error && <p className="mb-2 px-1 text-[12px] text-[#c23b3b]">⚠︎ {error}</p>}
            <div className="flex items-end gap-2">
              <label htmlFor="reply" className="sr-only">
                답변 입력
              </label>
              <textarea
                id="reply"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={member ? `${thread.label}님에게 보낼 답변을 입력하세요` : "방문자에게 보낼 답변을 입력하세요"}
                className="min-w-0 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] outline-none focus:border-brand-500 focus:bg-white"
              />
              <button type="submit" disabled={sending || !draft.trim()} className="h-12 shrink-0 rounded-2xl bg-brand-600 px-4 text-[15px] font-semibold text-white disabled:bg-brand-300">
                {sending ? "보내는 중" : "보내기"}
              </button>
            </div>
        </form>
      )}
    </main>
  );
}

function Bubble({ side, tone, tag, time, children }: { side: "left" | "right"; tone?: "bot" | "inquiry"; tag: string; time?: string; children: ReactNode }) {
  const styles =
    side === "right"
      ? "rounded-br-md bg-brand-600 text-white"
      : tone === "bot"
        ? "rounded-bl-md bg-[#eceef4] text-ink"
        : tone === "inquiry"
          ? "rounded-bl-md bg-white text-ink ring-1 ring-brand-200"
          : "rounded-bl-md bg-white text-ink";
  return (
    <div className={`flex flex-col ${side === "right" ? "items-end" : "items-start"}`}>
      <span className="mb-1 px-1 text-[11px] text-ink-soft">
        {tag}
        {time && ` · ${formatChatTime(time)}`}
      </span>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${styles}`}>{children}</div>
    </div>
  );
}
