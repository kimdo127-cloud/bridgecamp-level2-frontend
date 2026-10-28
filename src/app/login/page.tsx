"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Field, TopBar, inputClass, primaryButton } from "@/components/ui";
import { ApiError, login } from "@/lib/api";
import { safeNext, saveLogin } from "@/lib/auth";

// 회원가입 없이 미리 만든 확인용 계정으로 로그인한다 (README에도 적혀 있음)
const DEMO_ACCOUNTS = [
  { label: "수강생으로 체험", loginId: "student", password: "student1234", desc: "김수강 · 수강 신청, 내 신청" },
  { label: "운영 매니저로 체험", loginId: "admin", password: "admin1234", desc: "박지은 · 과정 관리, 현황, 문의" },
];

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setNext(new URLSearchParams(window.location.search).get("next")), 0);
    return () => clearTimeout(t);
  }, []);

  const submit = async (id: string, pw: string) => {
    const local: Record<string, string> = {};
    if (!id.trim()) local.loginId = "아이디를 입력해 주세요.";
    if (!pw) local.password = "비밀번호를 입력해 주세요.";
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length > 0) return;
    setSaving(true);
    try {
      const { token, user } = await login(id.trim(), pw);
      saveLogin(token, user);
      // 관리자는 운영 화면으로, 수강생은 보던 화면으로 돌아간다
      const fallback = user.role === "admin" ? "/admin" : "/";
      const target = safeNext(next, fallback);
      router.replace(user.role === "member" && target.startsWith("/admin") ? "/" : target);
    } catch (e) {
      setSaving(false);
      setMessage(e instanceof ApiError ? e.message : "로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(loginId, password);
  };

  return (
    <main className="pb-10">
      <TopBar title="로그인" backHref="/" />
      <section className="px-5 pt-6">
        <h1 className="text-[22px] font-bold">브릿지캠프 로그인</h1>
        <p className="mt-1 text-sm text-ink-soft">수강 신청과 내 신청 보기는 로그인 뒤에 할 수 있어요.</p>
      </section>

      <form noValidate onSubmit={onSubmit} className="mt-6 space-y-4 px-5">
        <Field id="loginId" label="아이디" required error={errors.loginId}>
          <input id="loginId" autoComplete="username" value={loginId} onChange={(e) => setLoginId(e.target.value)} className={inputClass} aria-invalid={Boolean(errors.loginId)} />
        </Field>
        <Field id="password" label="비밀번호" required error={errors.password}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(errors.password)}
          />
        </Field>
        {message && (
          <p role="alert" className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-[14px] font-medium text-[#c23b3b]">
            ⚠︎ {message}
          </p>
        )}
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "로그인하는 중…" : "로그인"}
        </button>
      </form>

      <section className="mx-5 mt-8 rounded-3xl bg-white p-5">
        <h2 className="text-[15px] font-bold">확인용 계정</h2>
        <p className="mt-1 text-[13px] text-ink-soft">과제 확인을 위해 미리 만들어 둔 가상 계정이에요.</p>
        <ul className="mt-4 space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.loginId}>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setLoginId(a.loginId);
                  setPassword(a.password);
                  submit(a.loginId, a.password);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-left active:bg-brand-50"
              >
                <span>
                  <span className="block text-[15px] font-semibold">{a.label}</span>
                  <span className="block text-[12px] text-ink-soft">{a.desc}</span>
                </span>
                <span className="shrink-0 text-[12px] text-ink-soft">
                  {a.loginId} / {a.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
