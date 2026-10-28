"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logout, useAuth } from "@/lib/auth";
import type { Category } from "@/lib/types";

const THUMBS: Record<Category, { emoji: string; bg: string }> = {
  "AI 활용": { emoji: "🤖", bg: "from-[#e4e8ff] to-[#b9c1fb]" },
  데이터: { emoji: "📊", bg: "from-[#dff3f1] to-[#a9dcd6]" },
  개발: { emoji: "💻", bg: "from-[#e5edf8] to-[#b4c8e6]" },
  디자인: { emoji: "🎨", bg: "from-[#fbe7f0] to-[#efbcd3]" },
  "기획·PM": { emoji: "🧭", bg: "from-[#fff1dc] to-[#f6cf96]" },
};

const THUMB_SIZES = {
  sm: "h-14 w-14 shrink-0 rounded-xl text-2xl",
  md: "h-24 w-24 shrink-0 rounded-2xl text-4xl",
  card: "h-32 w-full text-5xl",
  fill: "h-full w-full text-4xl",
  lg: "h-48 w-full text-7xl",
};

export function CategoryThumb({ category, src, size = "md" }: { category: Category; src?: string | null; size?: keyof typeof THUMB_SIZES }) {
  const t = THUMBS[category];
  const box = THUMB_SIZES[size];
  // 운영자가 올린 대표 사진이 있으면 사진을, 없으면 분야 그림을 보여 준다
  if (src) {
    return (
      <div className={`overflow-hidden bg-surface ${box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- DB에 저장된 data URL이라 이미지 최적화 대상이 아님 */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div aria-hidden className={`flex items-center justify-center bg-gradient-to-br ${t.bg} ${box}`}>
      <span className="drop-shadow-sm">{t.emoji}</span>
    </div>
  );
}

export function TopBar({ title, backHref, right }: { title?: string; backHref?: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-line/70 bg-surface/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push(backHref ?? "/"))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-brand-100"
        aria-label="뒤로 가기"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      {title && <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">{title}</h1>}
      {right && <div className="ml-auto flex items-center">{right}</div>}
    </header>
  );
}

export type Mode = "user" | "admin";

// 운영 모드 상단 바: 사용자 화면과 구분되도록 어두운 색으로 표시한다. 첫 화면들(과정·현황·문의)에는 메뉴가 붙는다.
// 로그인으로 역할이 나뉘므로 사용자 화면 미리보기는 두지 않는다. 로고를 누르면 운영 첫 화면(/admin)으로 간다
export function AdminBar({ backHref, nav }: { backHref?: string; nav?: AdminMenuHref }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-20 bg-ink text-white">
      <header className="flex h-14 items-center gap-1 px-2 pt-[env(safe-area-inset-top)]">
        {backHref ? (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex h-11 w-11 items-center justify-center rounded-full active:bg-white/10"
            aria-label="뒤로 가기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <span className="w-3" />
        )}
        <Link href="/admin" className="rounded-lg px-1 text-[16px] font-bold active:opacity-70" aria-label="운영 첫 화면으로">
          브릿지캠프
        </Link>
        <span className="ml-1.5 rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-semibold">운영 모드</span>
      </header>
      {nav && (
        <nav className="flex items-center gap-1 px-3 pb-2" aria-label="운영 메뉴">
          {ADMIN_MENU.map((m) => {
            const active = m.href === nav;
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${active ? "bg-white text-ink" : "text-white/75 active:bg-white/10"}`}
              >
                {m.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="ml-auto rounded-full px-3 py-1.5 text-[13px] text-white/70 active:bg-white/10"
          >
            로그아웃
          </button>
        </nav>
      )}
    </div>
  );
}

const ADMIN_MENU = [
  { href: "/admin", label: "과정" },
  { href: "/admin/stats", label: "현황" },
  { href: "/admin/inquiries", label: "문의·챗봇" },
] as const;

export type AdminMenuHref = (typeof ADMIN_MENU)[number]["href"];

// 지금 보고 있는 주소 (로그인 뒤 돌아올 곳). 화면을 그린 뒤 브라우저에서 읽는다
export function useCurrentPath(fallback = "/") {
  const [path, setPath] = useState(fallback);
  useEffect(() => {
    const t = setTimeout(() => setPath(window.location.pathname), 0);
    return () => clearTimeout(t);
  }, []);
  return path;
}

// 수강생 화면 오른쪽 위: 로그인 전에는 "로그인", 로그인 뒤에는 "내 신청"(수강생) 또는 "운영 모드"(관리자)
export function UserMenu() {
  const { ready, user } = useAuth();
  const pathname = useCurrentPath();
  if (!ready) return <span className="h-9 w-16" />;
  if (!user)
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line active:bg-brand-50">
        로그인
      </Link>
    );
  return (
    <Link
      href={user.role === "admin" ? "/admin" : "/me"}
      className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 text-[13px] font-semibold text-ink ring-1 ring-line active:bg-brand-50"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white" aria-hidden>
        {user.name.slice(0, 1)}
      </span>
      {user.role === "admin" ? "운영 모드" : "내 신청"}
    </Link>
  );
}

export function Chip({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "moss" | "gray" }) {
  const tones = {
    brand: "bg-brand-100 text-brand-700",
    moss: "bg-moss-100 text-moss-600",
    gray: "bg-[#eceef4] text-ink-soft",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export const inputClass =
  "block w-full rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-[#b6aaa1] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-[#d64545] aria-[invalid=true]:bg-[#fff8f8] border-line";

export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1 text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-brand-600">*</span> : <span className="text-xs font-normal text-ink-soft">(선택)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-[13px] leading-snug text-[#c23b3b]">
          <span aria-hidden>⚠︎</span>
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] leading-snug text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(24,27,43,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-28" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-white/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
        {children}
      </div>
    </>
  );
}

export const primaryButton =
  "flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 text-base font-semibold text-white transition active:scale-[0.98] active:bg-brand-700 disabled:bg-brand-300";

export const secondaryButton =
  "flex h-11 items-center justify-center gap-1 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink active:bg-brand-50";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e3e6ee] ${className}`} />;
}

export function StatusScreen({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-20 text-center">
      <div className="mb-4 text-5xl" aria-hidden>
        {emoji}
      </div>
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft whitespace-pre-line">{body}</p>
      {action && <div className="mt-6 w-full max-w-60">{action}</div>}
    </div>
  );
}

export function HomeLink() {
  return (
    <Link href="/" className={primaryButton}>
      과정 목록으로
    </Link>
  );
}

// 등록 완료 같은 한 번짜리 알림 (페이지 이동 뒤에도 보이도록 sessionStorage 사용)
const FLASH_KEY = "bridgecamp:flash";

export function setFlash(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {}
}

export function FlashToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let msg: string | null = null;
    try {
      msg = sessionStorage.getItem(FLASH_KEY);
      sessionStorage.removeItem(FLASH_KEY);
    } catch {}
    if (!msg) return;
    const show = setTimeout(() => setMessage(msg), 0);
    const hide = setTimeout(() => setMessage(null), 2600);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] z-50 mx-auto flex max-w-md justify-center px-4">
      <div role="status" className="animate-[toast_2.6s_ease_forwards] rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lg">
        ✓ {message}
      </div>
    </div>
  );
}

// 무료 서버(Render)는 한동안 안 쓰면 잠들어서 첫 응답이 늦다. 4초가 넘으면 기다리라고 알려 준다
export function SlowServerHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <p role="status" className="mx-5 mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-[13px] leading-relaxed text-brand-700">
      서버를 깨우는 중이에요. 무료 서버라 첫 접속은 최대 1분 정도 걸릴 수 있어요.
    </p>
  );
}
