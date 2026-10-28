"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, askChat, sendInquiry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ChatReply } from "@/lib/types";

type Message = { id: number; role: "user" | "assistant"; content: string; reply?: ChatReply; question?: string };

const SUGGESTIONS = ["이번 달에 개강하는 과정 있어요?", "코딩 처음인데 들을 수 있는 과정은?", "온라인으로 들을 수 있는 과정 알려 주세요", "환불 규정이 어떻게 되나요?"];

let seq = 0;

// 우측 하단 상담 챗봇. 질문은 백엔드로 보내고, 백엔드가 DB의 과정 정보와 함께 GPT에 물어 답한다 (GPT 키는 백엔드에만 있음)
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 운영 화면과 로그인 화면에는 챗봇을 띄우지 않는다
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;
  // 상세 화면은 하단 신청 바가 있어서 버튼을 그 위로 올린다
  const lifted = pathname.startsWith("/courses/");

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { id: ++seq, role: "user", content: question }]);
    setInput("");
    setSending(true);
    try {
      const reply = await askChat(question, history);
      setMessages((m) => [...m, { id: ++seq, role: "assistant", content: reply.answer, reply, question }]);
    } catch (e) {
      const content = e instanceof ApiError && e.status === 400 ? e.message : "지금은 답변하기 어려워요. 잠시 뒤 다시 물어봐 주세요.";
      setMessages((m) => [...m, { id: ++seq, role: "assistant", content }]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <>
      {!open && (
        <div className={`pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-md justify-end px-4 ${lifted ? "bottom-[calc(env(safe-area-inset-bottom)+96px)]" : "bottom-[calc(env(safe-area-inset-bottom)+20px)]"}`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-brand-600 pr-5 pl-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(74,74,224,0.4)] active:scale-95"
            aria-label="상담 챗봇 열기"
          >
            <span className="text-xl" aria-hidden>
              💬
            </span>
            무엇이든 물어보세요
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col justify-end" role="dialog" aria-modal="true" aria-label="상담 챗봇">
          <button type="button" aria-label="챗봇 닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30" />
          <div className="relative flex h-[82dvh] flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl">
            <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg" aria-hidden>
                🤖
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">브릿지캠프 상담 챗봇</p>
                <p className="text-[12px] text-ink-soft">과정·일정·수강료를 바로 알려 드려요 · AI 답변</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-ink-soft active:bg-surface" aria-label="닫기">
                ×
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <Bubble role="assistant">
                안녕하세요! 브릿지캠프 상담 챗봇이에요. 개강일, 수강료, 남은 자리, 나에게 맞는 과정을 물어보세요. 과정 정보에 없는 내용은 운영팀에 연결해 드려요.
              </Bubble>
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} className="rounded-full bg-white px-3.5 py-2 text-left text-[13px] font-medium text-brand-700 ring-1 ring-brand-200 active:bg-brand-50">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id}>
                  <Bubble role={m.role}>{m.content}</Bubble>
                  {m.reply && m.reply.courses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                      {m.reply.courses.map((c) => (
                        <Link key={c.id} href={`/courses/${c.id}`} onClick={() => setOpen(false)} className="rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-ink ring-1 ring-line active:bg-brand-50">
                          📘 {c.title} 보기 →
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.reply?.needsHuman && <HandoffForm question={m.question ?? ""} courseId={m.reply.courses[0]?.id} />}
                </div>
              ))}
              {sending && (
                <Bubble role="assistant">
                  <span className="inline-flex gap-1" aria-label="답변을 만드는 중">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-soft" />
                  </span>
                </Bubble>
              )}
            </div>

            <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <label htmlFor="chat-input" className="sr-only">
                질문 입력
              </label>
              <input
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={300}
                placeholder="예: 퇴근 후 들을 수 있는 초보용 과정 있어요?"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-brand-500 focus:bg-white"
              />
              <button type="submit" disabled={sending || !input.trim()} className="h-12 shrink-0 rounded-2xl bg-brand-600 px-4 text-[15px] font-semibold text-white disabled:bg-brand-300">
                보내기
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${role === "user" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-ink shadow-[0_1px_2px_rgba(24,27,43,0.06)]"}`}
      >
        {children}
      </div>
    </div>
  );
}

// 챗봇이 답하기 어려운 질문은 운영팀 문의로 남긴다 (수강생 로그인 필요)
function HandoffForm({ question, courseId }: { question: string; courseId?: number }) {
  const { ready, user } = useAuth();
  const pathname = usePathname();
  const [message, setMessage] = useState(question);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!ready) return null;
  if (status?.tone === "ok") return <p className="mt-2 ml-1 rounded-2xl bg-moss-100 px-4 py-2.5 text-[13px] font-medium text-moss-600">✓ {status.text}</p>;

  if (!user || user.role !== "member")
    return (
      <div className="mt-2 ml-1 rounded-2xl bg-white p-3 text-[13px] ring-1 ring-line">
        <p className="text-ink-soft">운영팀에 직접 문의하려면 수강생 계정으로 로그인해 주세요.</p>
        {!user && (
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="mt-2 inline-block font-semibold text-brand-600">
            로그인하고 문의 남기기 →
          </Link>
        )}
      </div>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await sendInquiry({ message, chatQuestion: question, courseId });
      setStatus({ tone: "ok", text: r.message });
    } catch (err) {
      const text = err instanceof ApiError ? (err.errors.message ?? err.message) : "문의를 남기지 못했어요. 잠시 뒤 다시 시도해 주세요.";
      setStatus({ tone: "error", text });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 ml-1 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-brand-200">
      <p className="text-[13px] font-semibold text-brand-700">운영팀에 문의 남기기</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        aria-label="문의 내용"
        className="block w-full resize-none rounded-xl border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-500"
      />
      {status?.tone === "error" && <p className="text-[12px] text-[#c23b3b]">⚠︎ {status.text}</p>}
      <button type="submit" disabled={sending} className="h-10 w-full rounded-xl bg-brand-600 text-[14px] font-semibold text-white disabled:bg-brand-300">
        {sending ? "보내는 중…" : `${user.name}님 이름으로 문의 보내기`}
      </button>
    </form>
  );
}
