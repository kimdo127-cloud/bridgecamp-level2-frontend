"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryButton } from "@/components/ui";
import { ApiError, applyCohort } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice, formatRange, weeksLabel } from "@/lib/format";
import type { Cohort, CourseWithCohorts } from "@/lib/types";

type Step = { kind: "confirm" } | { kind: "saving" } | { kind: "done" } | { kind: "rejected"; message: string };

// 수강 신청 확인 시트. 규칙(정원·중복·신청 기간)은 백엔드가 확인하고, 거절되면 그 이유를 그대로 보여 준다
export function ApplySheet({ course, cohort, onClose, onApplied }: { course: CourseWithCohorts; cohort: Cohort; onClose: () => void; onApplied: () => void }) {
  const { ready, user } = useAuth();
  const [step, setStep] = useState<Step>({ kind: "confirm" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async () => {
    setStep({ kind: "saving" });
    try {
      await applyCohort(cohort.id);
      setStep({ kind: "done" });
    } catch (e) {
      setStep({ kind: "rejected", message: e instanceof ApiError ? e.message : "신청하지 못했어요. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      // 성공·실패와 관계없이 남은 자리를 최신으로 다시 받아 온다
      onApplied();
    }
  };

  const next = `/courses/${course.id}`;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative rounded-t-3xl bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />

        {step.kind === "done" ? (
          <div className="py-2 text-center">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <h2 id="apply-title" className="mt-3 text-xl font-bold">
              신청이 완료됐어요
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
              {course.title} {cohort.cohortNo}기
              <br />
              {formatDate(cohort.startDate)} 개강{cohort.schedule && ` · ${cohort.schedule}`}
            </p>
            {course.preparation && <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-left text-[13px] leading-relaxed text-brand-700">준비 사항: {course.preparation}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="h-13 flex-1 rounded-2xl border border-line text-[15px] font-semibold active:bg-surface">
                닫기
              </button>
              <Link href="/me" onClick={onClose} className={`${primaryButton} flex-1`}>
                내 신청 보기
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 id="apply-title" className="text-xl font-bold">
              수강 신청
            </h2>
            <dl className="mt-4 divide-y divide-line rounded-2xl border border-line text-[14px]">
              <Row label="과정" value={course.title} />
              <Row label="기수" value={`${cohort.cohortNo}기 · ${formatRange(cohort.startDate, cohort.endDate)} · ${weeksLabel(cohort.startDate, cohort.endDate)}`} />
              {cohort.schedule && <Row label="수업 시간" value={cohort.schedule} />}
              <Row label="신청 마감" value={formatDate(cohort.applyDeadline)} />
              <Row label="남은 자리" value={`${cohort.remaining}석 / 정원 ${cohort.capacity}명`} />
              <Row label="수강료" value={formatPrice(course.price)} strong />
            </dl>

            {step.kind === "rejected" && (
              <p role="alert" className="mt-3 flex gap-1.5 rounded-2xl bg-[#fff1f1] px-4 py-3 text-[14px] font-medium leading-snug text-[#c23b3b]">
                <span aria-hidden>⚠︎</span>
                {step.message}
              </p>
            )}

            <div className="mt-5">
              {!ready ? null : !user ? (
                <>
                  {/* 로그인하고 돌아오면 이 시트가 그대로 열려 있어 바로 신청을 이어 갈 수 있다 */}
                  <p className="mb-3 text-center text-[13px] text-ink-soft">신청하려면 수강생 계정으로 로그인해 주세요.</p>
                  <Link href={`/login?next=${encodeURIComponent(next)}`} className={primaryButton}>
                    로그인하고 신청하기
                  </Link>
                </>
              ) : user.role === "admin" ? (
                <p className="rounded-2xl bg-surface px-4 py-3 text-center text-[14px] text-ink-soft">운영 매니저 계정은 수강 신청을 할 수 없어요.</p>
              ) : step.kind === "rejected" ? (
                <button type="button" onClick={onClose} className={primaryButton}>
                  다른 기수 보기
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={step.kind === "saving"} className={primaryButton}>
                  {step.kind === "saving" ? "신청하는 중…" : `${user.name}님 이름으로 신청하기`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className={`text-right ${strong ? "text-[16px] font-bold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
